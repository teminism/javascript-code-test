import { BookSearchApiClient, ExampleBookSellerProvider } from './BookSearchApiClient';

(async function main() {
  const provider = new ExampleBookSellerProvider({ baseURL: 'http://api.book-seller-example.com', timeout: 2000 });
  const client = new BookSearchApiClient([provider]);

  const byAuthor = await client.search({ authorName: 'Shakespeare', limit: 5 });
  console.log('By author:', byAuthor);

  const byPublisher = await client.search({ publisher: 'Penguin', limit: 5 });
  console.log('By publisher:', byPublisher);

  const byYear = await client.search({ year: 1865, limit: 5 });
  console.log('By year:', byYear);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
