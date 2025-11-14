# Puppeteer Real Browser Hono

A web scraping API service built with [Hono](https://hono.dev/) and [puppeteer-real-browser](https://www.npmjs.com/package/puppeteer-real-browser) that provides an HTTP endpoint to fetch web page content using a real browser instance.

## Features

- 🚀 Fast and lightweight API built with Hono framework
- 🌐 Real browser automation using puppeteer-real-browser
- 🔄 Support for multiple URLs in a single request
- 🎯 CSS selector-based content waiting for specific elements
- 🛡️ Built-in ad blocking (using @ghostery/adblocker-puppeteer)
- 🔒 Turnstile protection handling
- 💾 Built-in LRU cache mechanism (5-minute TTL by default)
- 🔐 Concurrency control (maximum 5 concurrent pages)
- 🐳 Full Docker support
- ⚡ Written in TypeScript with type safety

## Installation

```bash
npm install
```

## Development

Run the development server with hot reload:

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Production

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Docker Deployment

Build the Docker image:

```bash
docker build -t puppeteer-real-browser-hono .
```

Run the container:

```bash
docker run -p 3000:3000 puppeteer-real-browser-hono
```

## API Usage

### Endpoint

```
GET /
```

### Query Parameters

| Parameter   | Type               | Required | Description                                                                                                |
| ----------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `url`       | string or string[] | Yes      | The URL(s) to fetch content from                                                                           |
| `selector`  | string             | No       | CSS selector to wait for before capturing content                                                          |
| `timeout`   | number             | No       | Navigation timeout in milliseconds (default: 30000)                                                        |
| `waitUntil` | string             | No       | When to consider navigation succeeded. Options: `load`, `domcontentloaded`, `networkidle0`, `networkidle2` |

### Examples

#### Basic Usage

Fetch content from a single URL:

```bash
curl "http://localhost:3000?url=https://example.com"
```

#### With CSS Selector

Wait for a specific element before capturing:

```bash
curl "http://localhost:3000?url=https://example.com&selector=.main-content"
```

#### Multiple URLs

Fetch content from multiple URLs simultaneously:

```bash
curl "http://localhost:3000?url=https://example.com&url=https://another-site.com"
```

#### With Navigation Options

Customize navigation behavior:

```bash
curl "http://localhost:3000?url=https://example.com&waitUntil=networkidle2&timeout=60000"
```

### Response Format

#### Success Response

```json
{
  "success": true,
  "fromCache": false,
  "data": ["<html>...</html>"]
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## Project Structure

```
.
├── src/
│   ├── index.ts    # API server and routes
│   ├── lib.ts      # Core page content fetching logic with semaphore
│   └── cache.ts    # LRU cache implementation
├── Dockerfile      # Docker configuration
├── package.json    # Project dependencies
├── tsconfig.json   # TypeScript configuration
└── README.md       # This file
```

## Configuration

The browser instance is configured with the following options:

- **Maximized window**: Browser starts maximized
- **Turnstile support**: Enabled for handling Cloudflare challenges
- **Headless mode**: Disabled (runs with visible browser)
- **Default viewport**: Null (uses full window size)

You can modify these settings in `src/lib.ts` by adjusting the `realBrowserOption` object.

## Dependencies

### Production Dependencies

- **@hono/node-server**: Node.js adapter for Hono
- **hono**: Fast, lightweight web framework
- **puppeteer-real-browser**: Puppeteer wrapper for real browser automation
- **@ghostery/adblocker-puppeteer**: Ad blocker for Puppeteer
- **lru-cache**: LRU cache implementation

### Development Dependencies

- **@types/node**: TypeScript definitions for Node.js
- **tsx**: TypeScript executor for development
- **typescript**: TypeScript compiler

## Technical Details

### Browser Configuration

The service uses `puppeteer-real-browser` which provides:

- Real browser fingerprinting
- Cloudflare Turnstile bypass capabilities
- Better detection avoidance compared to standard Puppeteer

### Selector Waiting Logic

When a `selector` parameter is provided, the service:

1. Navigates to the URL
2. Polls for the selector's presence every 1 second
3. Times out after the specified timeout (default: 30 seconds)
4. Captures the page content once the selector is found

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
