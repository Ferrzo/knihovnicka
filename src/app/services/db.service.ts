import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Book } from '../models/book.model';

@Injectable({ providedIn: 'root' })
export class DbService extends Dexie {
  books!: Table<Book, string>;

  constructor() {
    super('knihovnicka');
    this.version(1).stores({
      books: 'isbn, title, author, addedAt'
    });
  }

  async addBook(book: Book): Promise<void> {
    await this.books.put(book);
  }

  async getBook(isbn: string): Promise<Book | undefined> {
    return this.books.get(isbn);
  }

  async getAllBooks(): Promise<Book[]> {
    return this.books.orderBy('addedAt').reverse().toArray();
  }

  async deleteBook(isbn: string): Promise<void> {
    await this.books.delete(isbn);
  }

  async hasBook(isbn: string): Promise<boolean> {
    const book = await this.books.get(isbn);
    return book !== undefined;
  }
}
