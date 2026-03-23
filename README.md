# n8n-nodes-xcrawl

Scrape pages, crawl sites, map URLs, and search the web using the XCrawl API.

## Prerequisites

- An [XCrawl](https://www.xcrawl.com) account
- An XCrawl API Key (obtained from your account dashboard)

## Installation

In your n8n instance, go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-xcrawl
```

## Credentials

After installation, create a new **XCrawl API** credential and enter your API Key.

## Supported Operations

### Scraping

| Operation         | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| Scrape            | Scrape content from a single URL. Supports sync and async modes. |
| Get Scrape Result | Retrieve the result of an async scrape job by scrape ID.         |

### Crawling

| Operation        | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| Crawl            | Crawl an entire site asynchronously and collect content from all pages. |
| Get Crawl Result | Retrieve the result of a crawl job by crawl ID.                         |

### Map & Search

| Operation | Description                                   |
| --------- | --------------------------------------------- |
| Map       | Get a list of all URLs found on a site.       |
| Search    | Search the web by keyword and return results. |

## Output Formats (Scrape & Crawl)

- `markdown` — Cleaned Markdown content
- `html` — Cleaned HTML
- `raw_html` — Raw HTML
- `links` — List of links found on the page
- `summary` — AI-generated summary
- `screenshot` — Page screenshot (viewport or full page)
- `json` — AI-structured JSON extraction (requires a prompt)

## Compatibility

Requires n8n version 1.0.0 or later.

## Links

- Website: [xcrawl.com](https://www.xcrawl.com)
- API Docs: [xcrawl.com/docs](https://docs.xcrawl.com/doc)

## License

[MIT](LICENSE)
