import { ExampleBookSellerProvider, BookSearchQueryParams } from "../src/BookSearchApiClient";
import got from "got";

jest.mock("got");
const mockedGot = got as jest.MockedFunction<typeof got>;

describe("ExampleBookSellerProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns sample data when API fails", async () => {
    const mockGet = jest.fn().mockRejectedValue(new Error("Network error"));
    mockedGot.extend = jest.fn().mockReturnValue({ get: mockGet } as any);

    const provider = new ExampleBookSellerProvider({
      baseURL: "http://invalid-api",
      timeout: 100, // optional, shorter timeout
    });

    const params: BookSearchQueryParams = { authorName: "Shakespeare", limit: 3 };
    const results = await provider.searchBooks(params);

    expect(results.length).toBe(3);
    expect(results[0].author).toBe("Shakespeare");

    expect(mockGet).toHaveBeenCalled();
  });
});