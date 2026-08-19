import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Book } from '../models/book.model';

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo?: {
      title?: string;
      authors?: string[];
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
    };
  }>;
}

interface OpenLibraryResponse {
  [key: string]: {
    title?: string;
    authors?: Array<{ name?: string }>;
    cover?: {
      medium?: string;
      small?: string;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class BookMetadataService {
  constructor(private readonly http: HttpClient) {}

  async fetchBookMetadata(isbn: string): Promise<Partial<Book>> {
    try {
      const googleResult = await this.fetchFromGoogleBooks(isbn);
      if (googleResult.title || googleResult.author || googleResult.coverUrl) {
        return googleResult;
      }
    } catch {
      // Fall through to Open Library.
    }

    try {
      const openLibraryResult = await this.fetchFromOpenLibrary(isbn);
      if (openLibraryResult.title || openLibraryResult.author || openLibraryResult.coverUrl) {
        return openLibraryResult;
      }
    } catch {
      // Fall back to a manual entry with ISBN only.
    }

    return { isbn };
  }

  private async fetchFromGoogleBooks(isbn: string): Promise<Partial<Book>> {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const response = await firstValueFrom(this.http.get<GoogleBooksResponse>(url));
    const info = response.items?.[0]?.volumeInfo;

    if (!info) {
      return {};
    }

    return {
      isbn,
      title: info.title ?? '',
      author: info.authors?.join(', ') ?? '',
      coverUrl: this.ensureHttps(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? ''),
    };
  }

  private async fetchFromOpenLibrary(isbn: string): Promise<Partial<Book>> {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const response = await firstValueFrom(this.http.get<OpenLibraryResponse>(url));
    const bookData = response[`ISBN:${isbn}`];

    if (!bookData) {
      return {};
    }

    return {
      isbn,
      title: bookData.title ?? '',
      author: bookData.authors?.map((author) => author.name ?? '').filter(Boolean).join(', ') ?? '',
      coverUrl: this.ensureHttps(bookData.cover?.medium ?? bookData.cover?.small ?? ''),
    };
  }

  private ensureHttps(url: string): string {
    if (!url) {
      return '';
    }

    return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
  }
}
