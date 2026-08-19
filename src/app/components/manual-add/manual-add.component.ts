import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Book } from '../../models/book.model';

@Component({
  selector: 'app-manual-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="manual-shell">
      <header class="manual-header">
        <div>
          <p class="eyebrow">Ruční přidání</p>
          <h2>Přidejte knihu bez skenování</h2>
        </div>
        <button type="button" class="ghost-button" (click)="cancelled.emit()">Zpět</button>
      </header>

      <form class="manual-form" [formGroup]="form" (ngSubmit)="submit()">
        <label>
          ISBN
          <input type="text" formControlName="isbn" placeholder="9788025700000" inputmode="numeric" />
          @if (form.controls.isbn.touched && form.controls.isbn.invalid) {
            <span class="error-text">Zadejte platné ISBN (10 nebo 13 znaků).</span>
          }
        </label>

        <label>
          Název knihy
          <input type="text" formControlName="title" placeholder="Např. Saturnin" />
          @if (form.controls.title.touched && form.controls.title.invalid) {
            <span class="error-text">Název je povinný.</span>
          }
        </label>

        <label>
          Autor
          <input type="text" formControlName="author" placeholder="Např. Zdeněk Jirotka" />
          @if (form.controls.author.touched && form.controls.author.invalid) {
            <span class="error-text">Autor je povinný.</span>
          }
        </label>

        <label>
          Obálka (URL, volitelné)
          <input type="url" formControlName="coverUrl" placeholder="https://..." />
        </label>

        <div class="actions">
          <button type="button" class="secondary-button" (click)="cancelled.emit()">Zrušit</button>
          <button type="submit" class="primary-button">Uložit knihu</button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .manual-shell,
      .manual-form {
        display: grid;
        gap: 1rem;
      }

      .manual-header {
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

      label {
        display: grid;
        gap: 0.45rem;
        font-weight: 600;
        color: #1e293b;
      }

      input {
        padding: 0.95rem 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(91, 60, 196, 0.15);
        background: #fff;
        font: inherit;
      }

      input:focus {
        outline: 2px solid rgba(91, 60, 196, 0.25);
        border-color: #5b3cc4;
      }

      .error-text {
        color: #b91c1c;
        font-size: 0.85rem;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .ghost-button,
      .secondary-button,
      .primary-button {
        border: none;
        border-radius: 999px;
        padding: 0.9rem 1.2rem;
        font: inherit;
        cursor: pointer;
      }

      .ghost-button,
      .secondary-button {
        background: rgba(91, 60, 196, 0.1);
        color: #493494;
        font-weight: 600;
      }

      .primary-button {
        background: linear-gradient(135deg, #5b3cc4, #8b5cf6);
        color: #fff;
        font-weight: 700;
      }
    `,
  ],
})
export class ManualAddComponent {
  readonly initialValue = input<Partial<Book> | null>(null);
  readonly saved = output<Book>();
  readonly cancelled = output<void>();

  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    isbn: ['', [Validators.required, Validators.pattern(/^(?:97[89][0-9]{10}|[0-9]{9}[0-9Xx])$/)]],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    author: ['', [Validators.required, Validators.maxLength(200)]],
    coverUrl: ['', [Validators.pattern(/^$|^https?:\/\/.+/i)]],
  });

  constructor() {
    effect(() => {
      const initialValue = this.initialValue();
      this.form.reset(
        {
          isbn: this.normalizeIsbn(initialValue?.isbn ?? ''),
          title: initialValue?.title ?? '',
          author: initialValue?.author ?? '',
          coverUrl: initialValue?.coverUrl ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saved.emit({
      isbn: this.normalizeIsbn(value.isbn),
      title: value.title.trim(),
      author: value.author.trim(),
      coverUrl: value.coverUrl.trim(),
      addedAt: new Date(),
    });
  }

  private normalizeIsbn(value: string): string {
    return value.replace(/[^0-9Xx]/g, '').toUpperCase();
  }
}
