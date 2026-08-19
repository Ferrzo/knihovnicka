import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { BookListComponent } from './components/book-list/book-list.component';
import { ManualAddComponent } from './components/manual-add/manual-add.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { Book } from './models/book.model';
import { BookMetadataService } from './services/book-metadata.service';
import { DbService } from './services/db.service';

type AppView = 'home' | 'scanner' | 'library' | 'manual';
type ScanMode = 'add' | 'check';
type ToastKind = 'success' | 'error' | 'info';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ScannerComponent, BookListComponent, ManualAddComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly db = inject(DbService);
  private readonly bookMetadataService = inject(BookMetadataService);

  readonly currentView = signal<AppView>('home');
  readonly scanMode = signal<ScanMode>('check');
  readonly books = signal<Book[]>([]);
  readonly pendingBook = signal<Partial<Book> | null>(null);
  readonly loadingMetadata = signal(false);
  readonly metadataError = signal<string | null>(null);
  readonly isOnline = signal(navigator.onLine);
  readonly toastMessage = signal<string | null>(null);
  readonly toastKind = signal<ToastKind>('info');
  readonly lookupResult = signal<{ hasBook: boolean; isbn: string } | null>(null);

  readonly scanActionLabel = computed(() =>
    this.scanMode() === 'add' ? 'Naskenovat a přidat' : 'Naskenovat a zkontrolovat',
  );
  readonly collectionCountLabel = computed(() => {
    const count = this.books().length;
    if (count === 0) {
      return 'Žádná kniha';
    }

    if (count === 1) {
      return '1 kniha';
    }

    if (count >= 2 && count <= 4) {
      return `${count} knihy`;
    }

    return `${count} knih`;
  });
  readonly hasPendingMetadata = computed(() => {
    const pendingBook = this.pendingBook();
    return Boolean(pendingBook?.title || pendingBook?.author || pendingBook?.coverUrl);
  });

  private toastTimer?: ReturnType<typeof setTimeout>;
  private lookupTimer?: ReturnType<typeof setTimeout>;
  private readonly updateOnlineStatus = () => this.isOnline.set(navigator.onLine);

  async ngOnInit(): Promise<void> {
    await this.refreshBooks();
    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('offline', this.updateOnlineStatus);

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    if (this.lookupTimer) {
      clearTimeout(this.lookupTimer);
    }
  }

  selectMode(mode: ScanMode): void {
    this.scanMode.set(mode);
    this.currentView.set('home');
  }

  openHome(): void {
    this.currentView.set('home');
  }

  openScanner(): void {
    this.metadataError.set(null);
    this.currentView.set('scanner');
  }

  openLibrary(): void {
    this.currentView.set('library');
  }

  openManualAdd(prefill?: Partial<Book> | null): void {
    this.pendingBook.set(prefill ?? this.pendingBook());
    this.currentView.set('manual');
  }

  discardPendingBook(): void {
    this.pendingBook.set(null);
    this.metadataError.set(null);
    this.loadingMetadata.set(false);
  }

  async handleScannedIsbn(isbn: string): Promise<void> {
    this.metadataError.set(null);
    this.currentView.set('home');

    if (this.scanMode() === 'check') {
      const hasBook = await this.db.hasBook(isbn);
      this.showLookupResult(hasBook, isbn);
      return;
    }

    const existingBook = await this.db.getBook(isbn);
    if (existingBook) {
      this.showToast('Tuto knihu už ve své knihovně máte.', 'info');
      this.pendingBook.set(existingBook);
      return;
    }

    this.loadingMetadata.set(true);
    this.pendingBook.set({ isbn });

    try {
      const bookMetadata = await this.bookMetadataService.fetchBookMetadata(isbn);
      this.pendingBook.set({
        isbn,
        title: bookMetadata.title ?? '',
        author: bookMetadata.author ?? '',
        coverUrl: bookMetadata.coverUrl ?? '',
      });

      if (!bookMetadata.title && !bookMetadata.author) {
        this.metadataError.set('Metadata jsme nenašli. Knihu můžete doplnit ručně.');
      }
    } catch {
      this.metadataError.set('Metadata se nepodařilo načíst. Přidejte prosím knihu ručně.');
      this.pendingBook.set({ isbn });
    } finally {
      this.loadingMetadata.set(false);
    }
  }

  async savePendingBook(): Promise<void> {
    const pendingBook = this.pendingBook();
    if (!pendingBook?.isbn) {
      return;
    }

    await this.db.addBook({
      isbn: pendingBook.isbn,
      title: pendingBook.title?.trim() || 'Bez názvu',
      author: pendingBook.author?.trim() || 'Neznámý autor',
      coverUrl: pendingBook.coverUrl?.trim() || '',
      addedAt: new Date(),
    });

    await this.refreshBooks();
    this.pendingBook.set(null);
    this.metadataError.set(null);
    this.showToast('Kniha byla uložena do vaší knihovny.', 'success');
  }

  async saveManualBook(book: Book): Promise<void> {
    await this.db.addBook(book);
    await this.refreshBooks();
    this.pendingBook.set(null);
    this.metadataError.set(null);
    this.currentView.set('home');
    this.showToast('Kniha byla ručně přidána.', 'success');
  }

  async deleteBook(isbn: string): Promise<void> {
    if (!confirm('Opravdu chcete tuto knihu odstranit?')) {
      return;
    }

    await this.db.deleteBook(isbn);
    await this.refreshBooks();
    this.showToast('Kniha byla smazána.', 'info');
  }

  private async refreshBooks(): Promise<void> {
    this.books.set(await this.db.getAllBooks());
  }

  private showToast(message: string, kind: ToastKind): void {
    this.toastMessage.set(message);
    this.toastKind.set(kind);

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 3200);
  }

  private showLookupResult(hasBook: boolean, isbn: string): void {
    this.lookupResult.set({ hasBook, isbn });

    if (this.lookupTimer) {
      clearTimeout(this.lookupTimer);
    }

    this.lookupTimer = setTimeout(() => this.lookupResult.set(null), 2600);
  }
}
