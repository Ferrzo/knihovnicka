import { CommonModule, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Book } from '../../models/book.model';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="list-shell">
      <header class="list-header">
        <div>
          <p class="eyebrow">Moje sbírka</p>
          <h2>Knihovna</h2>
        </div>
        <button type="button" class="ghost-button" (click)="closed.emit()">Domů</button>
      </header>

      @if (books().length === 0) {
        <div class="empty-state">
          <span class="emoji">📚</span>
          <h3>Zatím tu nic není</h3>
          <p>Naskenujte první knihu nebo ji přidejte ručně.</p>
        </div>
      } @else {
        <div class="book-grid">
          @for (book of books(); track book.isbn) {
            <article class="book-card">
              <div class="cover-shell">
                @if (book.coverUrl) {
                  <img [src]="book.coverUrl" [alt]="'Obálka knihy ' + book.title" loading="lazy" />
                } @else {
                  <div class="cover-placeholder">{{ book.title.charAt(0) || '📖' }}</div>
                }
              </div>

              <div class="book-content">
                <h3>{{ book.title }}</h3>
                <p class="author">{{ book.author }}</p>
                <dl>
                  <div>
                    <dt>ISBN</dt>
                    <dd>{{ book.isbn }}</dd>
                  </div>
                  <div>
                    <dt>Přidáno</dt>
                    <dd>{{ book.addedAt | date: 'd. M. y, HH:mm' }}</dd>
                  </div>
                </dl>
              </div>

              <button type="button" class="delete-button" (click)="removed.emit(book.isbn)">
                Smazat
              </button>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .list-shell {
        display: grid;
        gap: 1rem;
      }

      .list-header {
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

      h2,
      h3,
      p {
        margin: 0;
      }

      .ghost-button,
      .delete-button {
        border: none;
        border-radius: 999px;
        font: inherit;
        cursor: pointer;
      }

      .ghost-button {
        padding: 0.85rem 1.2rem;
        background: rgba(91, 60, 196, 0.1);
        color: #493494;
        font-weight: 600;
      }

      .empty-state {
        display: grid;
        place-items: center;
        text-align: center;
        gap: 0.65rem;
        padding: 2rem 1.5rem;
        border-radius: 1.5rem;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      }

      .emoji {
        font-size: 2rem;
      }

      .book-grid {
        display: grid;
        gap: 1rem;
      }

      .book-card {
        display: grid;
        grid-template-columns: 5.2rem 1fr;
        gap: 1rem;
        padding: 1rem;
        border-radius: 1.5rem;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      }

      .cover-shell,
      img,
      .cover-placeholder {
        width: 100%;
        aspect-ratio: 3 / 4;
        border-radius: 1rem;
      }

      img {
        object-fit: cover;
        background: #e2e8f0;
      }

      .cover-placeholder {
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #5b3cc4, #8b5cf6);
        color: #fff;
        font-size: 1.8rem;
        font-weight: 700;
      }

      .book-content {
        display: grid;
        gap: 0.5rem;
        align-content: start;
      }

      .author {
        color: #475569;
      }

      dl {
        display: grid;
        gap: 0.5rem;
        margin: 0;
      }

      dt {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
      }

      dd {
        margin: 0.15rem 0 0;
        color: #0f172a;
      }

      .delete-button {
        grid-column: 1 / -1;
        justify-self: end;
        padding: 0.65rem 1rem;
        background: #fee2e2;
        color: #b91c1c;
        font-weight: 700;
      }
    `,
  ],
})
export class BookListComponent {
  readonly books = input.required<Book[]>();
  readonly removed = output<string>();
  readonly closed = output<void>();
}
