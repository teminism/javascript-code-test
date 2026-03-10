import { randomUUID } from "crypto";
import got, { Got, Options } from "got";
import { XMLParser } from "fast-xml-parser";

const DEFAULT_REQUEST_TIMEOUT_MS = 1000;
const DEFAULT_LIMIT = 10;
const DEFAULT_FORMAT: ResponseFormat = "json";

type ResponseFormat = "json" | "xml";

type BookSearchApiClientConfig = {
  baseURL: string;
  timeout?: number;
};

export type BookSearchQueryParams = {
  authorName?: string;
  publisher?: string;
  year?: number;
  limit?: number;
  format?: ResponseFormat;
};

type BookSearchApiItem = {
  book: {
    title: string;
    author: string;
    isbn: string;
  };
  stock: {
    quantity: number;
    price: number;
  };
};

export type Book = {
  title: string;
  author: string;
  isbn: string;
  quantity: number;
  price: number;
};

export interface BookProvider {
  searchBooks(params: BookSearchQueryParams): Promise<Book[]>;
}

export class ExampleBookSellerProvider implements BookProvider {
  private client: Got;
  private parser = new XMLParser();

  constructor(config: BookSearchApiClientConfig) {
    this.client = got.extend({
      prefixUrl: config.baseURL,
      timeout: {
        request: config.timeout || DEFAULT_REQUEST_TIMEOUT_MS,
      },
      retry: {
        limit: 3,
      },
      hooks: {
        beforeRequest: [
          (options: Options) => {
            const correlationId = randomUUID();
            (options.headers as any)["x-correlation-id"] = correlationId;

            const url =
              typeof options.url === "string"
                ? options.url
                : options.url?.href;

            console.log(`[BookAPI] Request → ${url} | CorrelationID: ${correlationId}`);
          },
        ],
        afterResponse: [
          (response) => {
            const correlationId =
              (response.request.options.headers as any)["x-correlation-id"] || "";
            console.log(
              `[BookAPI] Response ← ${response.statusCode} | CorrelationID: ${correlationId}`
            );
            return response;
          },
        ],
      },
    });
  }

  async searchBooks({
    authorName,
    publisher,
    year,
    limit = DEFAULT_LIMIT,
    format = DEFAULT_FORMAT,
  }: BookSearchQueryParams): Promise<Book[]> {
    try {
      const response = await this.client.get("by-author", {
        searchParams: {
          q: authorName,
          limit,
          format,
        },
      });

      const body = response.body as unknown as string;

      if (format === "xml") {
        return this.parseBooksXml(body);
      }

      const json = JSON.parse(body) as BookSearchApiItem[];
      return this.parseBooksJson(json);
    } catch (err: any) {
      console.warn(
        `[ExampleProvider] network error, returning sample data:`,
        err?.code || err?.message || err
      );
      return this.sampleData({ authorName, publisher, year, limit });
    }
  }

  private sampleData({
    authorName,
    publisher,
    year,
    limit = DEFAULT_LIMIT,
  }: {
    authorName?: string;
    publisher?: string;
    year?: number;
    limit?: number;
  }): Book[] {
    const books: Book[] = [];
    const n = Math.max(1, Math.min(50, limit));

    for (let i = 1; i <= n; i++) {
      const titleParts = [];
      if (authorName) titleParts.push(authorName);
      if (publisher) titleParts.push(publisher);
      if (year) titleParts.push(`${year}`);
      titleParts.push(`Sample Title ${i}`);
      const title = titleParts.join(" - ");

      books.push({
        title,
        author: authorName || "Unknown",
        isbn: `SAMPLE-ISBN-${i}`,
        quantity: 10 + i,
        price: 9.99 + i,
      });
    }

    return books;
  }

  private parseBooksJson(items: BookSearchApiItem[]): Book[] {
    return items.map((item) => ({
      title: item.book.title,
      author: item.book.author,
      isbn: item.book.isbn,
      quantity: item.stock.quantity,
      price: item.stock.price,
    }));
  }

  private parseBooksXml(xml: string): Book[] {
    const parsed = this.parser.parse(xml);
    const booksRaw = Array.isArray(parsed.books.book)
      ? parsed.books.book
      : [parsed.books.book];

    return booksRaw.map((b: any) => ({
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      quantity: Number(b.stock.quantity),
      price: Number(b.stock.price),
    }));
  }
}

export class BookSearchApiClient {
  private cache = new Map<string, Book[]>();

  constructor(private providers: BookProvider[]) {}

  async search(params: BookSearchQueryParams): Promise<Book[]> {
    const cacheKey = JSON.stringify(params);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const results = await Promise.all(
      this.providers.map((provider) => provider.searchBooks(params))
    );

    const flattened = results.flat();

    const deduplicated = Array.from(
      new Map(flattened.map((book) => [book.isbn, book])).values()
    );

    this.cache.set(cacheKey, deduplicated);

    return deduplicated;
  }
}