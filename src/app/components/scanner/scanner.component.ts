import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, output, signal } from '@angular/core';
import { BrowserCodeReader, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="scanner-shell">
      <header class="scanner-header">
        <div>
          <p class="eyebrow">{{ mode() === 'add' ? 'Přidání knihy' : 'Rychlá kontrola' }}</p>
          <h2>{{ mode() === 'add' ? 'Namiřte kameru na ISBN' : 'Zjistěte, zda knihu už máte' }}</h2>
        </div>
        <button type="button" class="ghost-button" (click)="closed.emit()">Zavřít</button>
      </header>

      <div class="video-frame">
        <video #videoElement playsinline muted></video>
        @if (starting()) {
          <div class="status-badge">Spouštím kameru…</div>
        }
      </div>

      @if (availableDevices().length > 1) {
        <label class="device-picker">
          Kamera
          <select [value]="selectedDeviceId() ?? ''" (change)="changeCamera(($any($event.target)).value)">
            @for (device of availableDevices(); track device.deviceId) {
              <option [value]="device.deviceId">{{ device.label || 'Kamera' }}</option>
            }
          </select>
        </label>
      }

      <p class="hint">
        Podporováno je ISBN/EAN‑13. Držte čárový kód v rámečku a počkejte na potvrzení.
      </p>

      @if (scannerError(); as errorMessage) {
        <div class="error-card">{{ errorMessage }}</div>
      }

      <div class="actions">
        <button type="button" class="secondary-button" (click)="retry()">Zkusit znovu</button>
        @if (mode() === 'add') {
          <button type="button" class="primary-button" (click)="manualRequested.emit()">Přidat ručně</button>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .scanner-shell {
        display: grid;
        gap: 1rem;
      }

      .scanner-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }

      .eyebrow {
        margin: 0 0 0.25rem;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #7358d8;
      }

      h2 {
        margin: 0;
        font-size: 1.4rem;
      }

      .video-frame {
        position: relative;
        overflow: hidden;
        border-radius: 1.5rem;
        background: #0f172a;
        min-height: 22rem;
        box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.06);
      }

      .video-frame::after {
        content: '';
        position: absolute;
        inset: 15% 8%;
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 1rem;
        pointer-events: none;
      }

      video {
        width: 100%;
        min-height: 22rem;
        object-fit: cover;
      }

      .status-badge {
        position: absolute;
        left: 50%;
        bottom: 1rem;
        transform: translateX(-50%);
        padding: 0.6rem 1rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.78);
        color: #fff;
        font-weight: 600;
      }

      .device-picker {
        display: grid;
        gap: 0.45rem;
        font-weight: 600;
      }

      select,
      .primary-button,
      .secondary-button,
      .ghost-button {
        border-radius: 999px;
        border: none;
        font: inherit;
      }

      select {
        padding: 0.8rem 1rem;
        border: 1px solid rgba(91, 60, 196, 0.15);
        background: #fff;
      }

      .hint {
        margin: 0;
        color: #475569;
      }

      .error-card {
        padding: 0.9rem 1rem;
        border-radius: 1rem;
        background: #fee2e2;
        color: #b91c1c;
        font-weight: 600;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .primary-button,
      .secondary-button,
      .ghost-button {
        padding: 0.85rem 1.2rem;
        cursor: pointer;
      }

      .primary-button {
        background: linear-gradient(135deg, #5b3cc4, #8b5cf6);
        color: #fff;
        font-weight: 700;
      }

      .secondary-button,
      .ghost-button {
        background: rgba(91, 60, 196, 0.1);
        color: #493494;
        font-weight: 600;
      }
    `,
  ],
})
export class ScannerComponent implements AfterViewInit, OnDestroy {
  readonly mode = input<'add' | 'check'>('check');
  readonly scanned = output<string>();
  readonly closed = output<void>();
  readonly manualRequested = output<void>();
  readonly availableDevices = signal<MediaDeviceInfo[]>([]);
  readonly selectedDeviceId = signal<string | null>(null);
  readonly starting = signal(true);
  readonly scannerError = signal<string | null>(null);

  @ViewChild('videoElement', { static: true }) private readonly videoElement?: ElementRef<HTMLVideoElement>;

  private readonly reader = new BrowserMultiFormatReader(undefined, {
    delayBetweenScanAttempts: 250,
    delayBetweenScanSuccess: 1500,
  });
  private controls?: IScannerControls;
  private hasReportedResult = false;

  async ngAfterViewInit(): Promise<void> {
    await this.startScanner();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  async retry(): Promise<void> {
    await this.startScanner(this.selectedDeviceId() ?? undefined);
  }

  async changeCamera(deviceId: string): Promise<void> {
    await this.startScanner(deviceId);
  }

  private async startScanner(preferredDeviceId?: string): Promise<void> {
    this.stopScanner();
    this.starting.set(true);
    this.scannerError.set(null);
    this.hasReportedResult = false;

    try {
      const devices = await BrowserCodeReader.listVideoInputDevices();
      this.availableDevices.set(devices);

      const deviceId = preferredDeviceId ?? this.pickPreferredCamera(devices);
      if (!deviceId) {
        throw new Error('V zařízení nebyla nalezena žádná dostupná kamera.');
      }

      this.selectedDeviceId.set(deviceId);
      this.controls = await this.reader.decodeFromVideoDevice(deviceId, this.videoElement?.nativeElement, (result, error) => {
        if (result && !this.hasReportedResult) {
          const isbn = this.normalizeIsbn(result.getText());

          if (!isbn) {
            this.scannerError.set('Načtený kód není platné ISBN/EAN‑13. Zkuste jiný úhel nebo světlo.');
            return;
          }

          this.hasReportedResult = true;
          this.stopScanner();
          this.scanned.emit(isbn);
          return;
        }

        if (error && !(error instanceof NotFoundException)) {
          this.scannerError.set(this.humanizeError(error));
        }
      });
    } catch (error) {
      this.scannerError.set(this.humanizeError(error));
    } finally {
      this.starting.set(false);
    }
  }

  private stopScanner(): void {
    this.controls?.stop();
    this.controls = undefined;
  }

  private pickPreferredCamera(devices: MediaDeviceInfo[]): string | null {
    if (devices.length === 0) {
      return null;
    }

    const preferred = devices.find((device) => /back|rear|environment/i.test(device.label));
    return preferred?.deviceId ?? devices[0].deviceId;
  }

  private normalizeIsbn(rawValue: string): string {
    const digits = rawValue.replace(/[^0-9Xx]/g, '').toUpperCase();
    return digits.length === 13 ? digits : '';
  }

  private humanizeError(error: unknown): string {
    if (error instanceof Error) {
      if (/notallowed|permission/i.test(error.name) || /permission/i.test(error.message)) {
        return 'Přístup ke kameře byl zablokovaný. Povolte kameru a zkuste to znovu.';
      }

      return error.message || 'Kameru se nepodařilo spustit.';
    }

    return 'Kameru se nepodařilo spustit.';
  }
}
