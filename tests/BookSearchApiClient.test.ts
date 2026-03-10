import { BookSearchApiClient, BookProvider, Book } from "../src/BookSearchApiClient";

describe("BookSearchApiClient", () => {

  const book: Book = {
    title: "Hamlet",
    author: "Shakespeare",
    isbn: "123",
    quantity: 10,
    price: 9.99
  };

  const provider1: BookProvider = {
    searchBooks: jest.fn().mockResolvedValue([book])
  };

  const provider2: BookProvider = {
    searchBooks: jest.fn().mockResolvedValue([book])
  };

  it("aggregates results from multiple providers", async () => {
    const client = new BookSearchApiClient([provider1, provider2]);

    const results = await client.search({ authorName: "Shakespeare" });

    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Hamlet");
  });

  it("returns cached results for identical queries", async () => {
  const provider: BookProvider = {
    searchBooks: jest.fn().mockResolvedValue([book])
  };

  const client = new BookSearchApiClient([provider]);

  await client.search({ authorName: "Shakespeare" });
  await client.search({ authorName: "Shakespeare" });

  expect(provider.searchBooks).toHaveBeenCalledTimes(1);
  });

  it("handles empty results", async () => {
    const provider: BookProvider = {
        searchBooks: jest.fn().mockResolvedValue([])
    };  

    const client = new BookSearchApiClient([provider]);
        
    const results = await client.search({ authorName: "Unknown Author" });
    expect(results.length).toBe(0);
    });

});