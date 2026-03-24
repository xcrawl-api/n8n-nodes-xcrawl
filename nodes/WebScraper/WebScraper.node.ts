import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

const BASE_URL = 'https://run.xcrawl.com';

// Helper: conditionally include object fields (avoids `...opt(false, {...})` in strict mode)
function opt(condition: unknown, value: Record<string, unknown>): Record<string, unknown> {
	return condition ? value : {};
}

export class WebScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'XCrawl',
		name: 'webScraper',
		icon: 'file:xcrawl.svg',
		group: ['transform'],
		version: 1,
		description: 'Scrape pages, crawl sites, map URLs, and search the web using XCrawl API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		usableAsTool: true,
		defaults: {
			name: 'XCrawl',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'xCrawlApi',
				required: true,
			},
		],
		properties: [
			// ─── Resource ────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Scraping', value: 'Scraping', description: 'Single-page scrape and result retrieval' },
					{ name: 'Crawling', value: 'Crawling', description: 'Bulk site crawl and result retrieval' },
					{ name: 'Map & Search', value: 'MapSearch', description: 'Site URL mapping and web search' },
				],
				default: 'Scraping',
			},
			// ─── Operation ───────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['Scraping'] } },
				options: [
					{ name: 'Scrape', value: 'scrape', description: 'Scrape content from a URL', action: 'Scrape content from a URL' },
					{ name: 'Get Scrape Result', value: 'scrapeResult', description: 'Retrieve the result of an async scrape job', action: 'Retrieve async scrape result' },
				],
				default: 'scrape',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['Crawling'] } },
				options: [
					{ name: 'Crawl', value: 'crawl', description: 'Crawl an entire site asynchronously', action: 'Crawl an entire site' },
					{ name: 'Get Crawl Result', value: 'crawlResult', description: 'Retrieve the result of a crawl job', action: 'Retrieve crawl result' },
				],
				default: 'crawl',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['MapSearch'] } },
				options: [
					{ name: 'Map', value: 'map', description: 'Get all URLs from a site', action: 'Get all URLs from a site' },
					{ name: 'Search', value: 'search', description: 'Search the web by keyword', action: 'Search the web by keyword' },
				],
				default: 'map',
			},

			// ─── Scrape ─────────────────────────────────────────
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL to scrape or crawl',
				displayOptions: { show: { operation: ['scrape', 'map', 'crawl'] } },
			},
			{
				displayName: 'Mode',
				name: 'scrapeMode',
				type: 'options',
				options: [
					{ name: 'Sync', value: 'sync' },
					{ name: 'Async', value: 'async' },
				],
				default: 'sync',
				description: 'Sync returns results immediately; async returns a job ID',
				displayOptions: { show: { resource: ['Scraping'], operation: ['scrape'] } },
			},
			{
				displayName: 'Output Formats',
				name: 'outputFormats',
				type: 'multiOptions',
				options: [
					{ name: 'HTML (Cleaned)', value: 'html' },
					{ name: 'Raw HTML', value: 'raw_html' },
					{ name: 'Markdown', value: 'markdown' },
					{ name: 'Links', value: 'links' },
					{ name: 'AI Summary', value: 'summary' },
					{ name: 'Screenshot', value: 'screenshot' },
					{ name: 'AI Structured JSON', value: 'json' },
				],
				default: ['markdown'],
				description: 'Select the content formats to return',
				displayOptions: { show: { operation: ['scrape', 'crawl'] } },
			},
			{
				displayName: 'Screenshot Type',
				name: 'screenshotType',
				type: 'options',
				options: [
					{ name: 'Viewport', value: 'viewport' },
					{ name: 'Full Page', value: 'full_page' },
				],
				default: 'viewport',
				displayOptions: { show: { operation: ['scrape', 'crawl'], outputFormats: ['screenshot'] } },
			},
			{
				displayName: 'AI Extraction Prompt',
				name: 'jsonPrompt',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Prompt to guide AI structured extraction when output format includes JSON',
				displayOptions: { show: { operation: ['scrape', 'crawl'] } },
			},

			// ─── Request Options (Scrape / Crawl) ────────────────────
			{
				displayName: 'Request Options',
				name: 'requestOptions',
				type: 'collection',
				placeholder: 'Add Request Option',
				default: {},
				displayOptions: { show: { operation: ['scrape', 'crawl'] } },
				options: [
					{
						displayName: 'Device',
						name: 'device',
						type: 'options',
						options: [
							{ name: 'Desktop', value: 'desktop' },
							{ name: 'Mobile', value: 'mobile' },
						],
						default: 'desktop',
					},
					{
						displayName: 'Locale',
						name: 'locale',
						type: 'string',
						default: 'en-US,en;q=0.9',
						description: 'Sets the Accept-Language request header',
					},
					{
						displayName: 'Only Main Content',
						name: 'onlyMainContent',
						type: 'boolean',
						default: true,
						description: 'Whether to strip navigation, sidebars, and other non-body content',
					},
					{
						displayName: 'Block Ads',
						name: 'blockAds',
						type: 'boolean',
						default: true,
						description: 'Whether to block ads and trackers during the request',
					},
					{
						displayName: 'Skip TLS Verification',
						name: 'skipTlsVerification',
						type: 'boolean',
						default: true,
						description: 'Whether to skip TLS/SSL certificate verification',
					},
				],
			},

			// ─── JS Render Options (Scrape / Crawl) ─────────────────
			{
				displayName: 'JS Render Options',
				name: 'jsRenderOptions',
				type: 'collection',
				placeholder: 'Add JS Render Option',
				default: {},
				displayOptions: { show: { operation: ['scrape', 'crawl'] } },
				options: [
					{
						displayName: 'Enable Browser Rendering',
						name: 'enabled',
						type: 'boolean',
						default: true,
						description: 'Whether to use a headless browser to render JavaScript before scraping',
					},
					{
						displayName: 'Wait Until',
						name: 'waitUntil',
						type: 'options',
						options: [
							{ name: 'Load', value: 'load' },
							{ name: 'DOMContentLoaded', value: 'domcontentloaded' },
							{ name: 'Network Idle', value: 'networkidle' },
						],
						default: 'load',
					},
					{
						displayName: 'Viewport Width',
						name: 'viewportWidth',
						type: 'number',
						default: 1920,
					},
					{
						displayName: 'Viewport Height',
						name: 'viewportHeight',
						type: 'number',
						default: 1080,
					},
				],
			},

			// ─── Proxy Options (Scrape / Crawl) ────────────────────
			{
				displayName: 'Proxy Options',
				name: 'proxyOptions',
				type: 'collection',
				placeholder: 'Add Proxy Option',
				default: {},
				displayOptions: { show: { operation: ['scrape', 'crawl'] } },
				options: [
					{
						displayName: 'Proxy Country',
						name: 'location',
						type: 'string',
						default: 'US',
						description: 'ISO-3166-1 alpha-2 country code, e.g. US, JP, SG',
					},
					{
						displayName: 'Sticky Session ID',
						name: 'stickySession',
						type: 'string',
						default: '',
						description: 'Reuse the same exit IP for requests with the same session ID',
					},
				],
			},

			// ─── Webhook Options (Scrape async / Crawl) ───────────────
			{
				displayName: 'Webhook Options',
				name: 'webhookOptions',
				type: 'collection',
				placeholder: 'Add Webhook Option',
				default: {},
				displayOptions: { show: { operation: ['scrape', 'crawl'] } },
				options: [
					{
						displayName: 'Webhook URL',
						name: 'url',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Events',
						name: 'events',
						type: 'multiOptions',
						options: [
							{ name: 'Started', value: 'started' },
							{ name: 'Completed', value: 'completed' },
							{ name: 'Failed', value: 'failed' },
						],
						default: ['completed', 'failed'],
					},
				],
			},

			// ─── Scrape Result ───────────────────────────────────
			{
				displayName: 'Scrape ID',
				name: 'scrapeId',
				type: 'string',
				default: '',
				required: true,
				description: 'The scrape_id returned by an async scrape job',
				displayOptions: { show: { resource: ['Scraping'], operation: ['scrapeResult'] } },
			},

			// ─── Search ─────────────────────────────────────────
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['MapSearch'], operation: ['search'] } },
			},
			{
				displayName: 'Search Options',
				name: 'searchOptions',
				type: 'collection',
				placeholder: 'Add Search Option',
				default: {},
				displayOptions: { show: { resource: ['MapSearch'], operation: ['search'] } },
				options: [
					{
						displayName: 'Location',
						name: 'location',
						type: 'string',
						default: 'US',
						description: 'Country, city, or region name, or ISO code',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: 'en',
						description: 'ISO 639-1 language code',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 10,
						description: 'Number of results to return (1-100)',
					},
				],
			},

			// ─── Map ────────────────────────────────────────────
			{
				displayName: 'Map Options',
				name: 'mapOptions',
				type: 'collection',
				placeholder: 'Add Map Option',
				default: {},
				displayOptions: { show: { resource: ['MapSearch'], operation: ['map'] } },
				options: [
					{
						displayName: 'URL Limit',
						name: 'limit',
						type: 'number',
						default: 5000,
						description: 'Maximum number of URLs to return (up to 100000)',
					},
					{
						displayName: 'Include Subdomains',
						name: 'includeSubdomains',
						type: 'boolean',
						default: true,
						description: 'Whether to include URLs from subdomains in the map results',
					},
					{
						displayName: 'Ignore Query Parameters',
						name: 'ignoreQueryParameters',
						type: 'boolean',
						default: true,
						description: 'Whether to deduplicate URLs that differ only by query string',
					},
					{
						displayName: 'URL Filter (Regex)',
						name: 'filter',
						type: 'string',
						default: '',
						description: 'Only return URLs matching this regex',
					},
				],
			},

			// ─── Crawl ──────────────────────────────────────────
			{
				displayName: 'Crawler Options',
				name: 'crawlerOptions',
				type: 'collection',
				placeholder: 'Add Crawler Option',
				default: {},
				displayOptions: { show: { resource: ['Crawling'], operation: ['crawl'] } },
				options: [
					{
						displayName: 'Page Limit',
						name: 'limit',
						type: 'number',
						default: 100,
						description: 'Maximum number of pages to crawl',
					},
					{
						displayName: 'Max Depth',
						name: 'maxDepth',
						type: 'number',
						default: 3,
						description: 'Maximum link depth to follow from the start URL',
					},
					{
						displayName: 'Include Entire Domain',
						name: 'includeEntireDomain',
						type: 'boolean',
						default: false,
						description: 'Whether to crawl all paths across the entire domain, not just under the start URL',
					},
					{
						displayName: 'Include Subdomains',
						name: 'includeSubdomains',
						type: 'boolean',
						default: false,
						description: 'Whether to follow and crawl links on subdomains',
					},
					{
						displayName: 'Include External Links',
						name: 'includeExternalLinks',
						type: 'boolean',
						default: false,
						description: 'Whether to follow links pointing to external domains',
					},
					{
						displayName: 'Use Sitemaps',
						name: 'sitemaps',
						type: 'boolean',
						default: true,
						description: "Whether to use the site's sitemap.xml to discover URLs",
					},
					{
						displayName: 'Include URL Patterns (one regex per line)',
						name: 'include',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Only crawl URLs matching these patterns',
					},
					{
						displayName: 'Exclude URL Patterns (one regex per line)',
						name: 'exclude',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Skip URLs matching these patterns',
					},
				],
			},

			// ─── Crawl Result ────────────────────────────────────
			{
				displayName: 'Crawl ID',
				name: 'crawlId',
				type: 'string',
				default: '',
				required: true,
				description: 'The crawl_id returned by a crawl job',
				displayOptions: { show: { resource: ['Crawling'], operation: ['crawlResult'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: IDataObject = {};

				if (operation === 'scrape') {
					const url = this.getNodeParameter('url', i) as string;
					const scrapeMode = this.getNodeParameter('scrapeMode', i) as string;
					const outputFormats = this.getNodeParameter('outputFormats', i) as string[];
					const screenshotType = this.getNodeParameter('screenshotType', i, 'viewport') as string;
					const jsonPrompt = this.getNodeParameter('jsonPrompt', i, '') as string;
					const requestOptions = this.getNodeParameter('requestOptions', i, {}) as Record<string, unknown>;
					const jsRenderOptions = this.getNodeParameter('jsRenderOptions', i, {}) as Record<string, unknown>;
					const proxyOptions = this.getNodeParameter('proxyOptions', i, {}) as Record<string, unknown>;
					const webhookOptions = this.getNodeParameter('webhookOptions', i, {}) as Record<string, unknown>;

					const body: Record<string, unknown> = { url, mode: scrapeMode };

					if (outputFormats && outputFormats.length > 0) {
						const output: Record<string, unknown> = { formats: outputFormats };
						if (outputFormats.includes('screenshot')) {
							output.screenshot = screenshotType;
						}
						if (outputFormats.includes('json') && jsonPrompt) {
							output.json = { prompt: jsonPrompt };
						}
						body.output = output;
					}

					if (Object.keys(requestOptions).length > 0) {
						body.request = {
							...opt(requestOptions.device, { device: requestOptions.device }),
							...opt(requestOptions.locale, { locale: requestOptions.locale }),
							...opt(requestOptions.onlyMainContent !== undefined, { only_main_content: requestOptions.onlyMainContent }),
							...opt(requestOptions.blockAds !== undefined, { block_ads: requestOptions.blockAds }),
							...opt(requestOptions.skipTlsVerification !== undefined, { skip_tls_verification: requestOptions.skipTlsVerification }),
						};
					}

					if (Object.keys(jsRenderOptions).length > 0) {
						body.js_render = {
							...opt(jsRenderOptions.enabled !== undefined, { enabled: jsRenderOptions.enabled }),
							...opt(jsRenderOptions.waitUntil, { wait_until: jsRenderOptions.waitUntil }),
							...opt(jsRenderOptions.viewportWidth || jsRenderOptions.viewportHeight, {
								viewport: {
									...opt(jsRenderOptions.viewportWidth, { width: jsRenderOptions.viewportWidth }),
									...opt(jsRenderOptions.viewportHeight, { height: jsRenderOptions.viewportHeight }),
								},
							}),
						};
					}

					if (Object.keys(proxyOptions).length > 0) {
						body.proxy = {
							...opt(proxyOptions.location, { location: proxyOptions.location }),
							...opt(proxyOptions.stickySession, { sticky_session: proxyOptions.stickySession }),
						};
					}

					if (webhookOptions.url) {
						body.webhook = {
							url: webhookOptions.url,
							...opt(webhookOptions.events, { events: webhookOptions.events }),
						};
					}

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'xCrawlApi', {
						method: 'POST',
						baseURL: BASE_URL,
						url: '/v1/scrape',
						body,
						json: true,
					}) as IDataObject;

				} else if (operation === 'scrapeResult') {
					const scrapeId = this.getNodeParameter('scrapeId', i) as string;
					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'xCrawlApi', {
						method: 'GET',
						baseURL: BASE_URL,
						url: `/v1/scrape/${scrapeId}`,
						json: true,
					}) as IDataObject;

				} else if (operation === 'search') {
					const query = this.getNodeParameter('query', i) as string;
					const searchOptions = this.getNodeParameter('searchOptions', i) as Record<string, unknown>;

					const body: Record<string, unknown> = {
						query,
						...opt(searchOptions.location, { location: searchOptions.location }),
						...opt(searchOptions.language, { language: searchOptions.language }),
						...opt(searchOptions.limit, { limit: searchOptions.limit }),
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'xCrawlApi', {
						method: 'POST',
						baseURL: BASE_URL,
						url: '/v1/search',
						body,
						json: true,
					}) as IDataObject;

				} else if (operation === 'map') {
					const url = this.getNodeParameter('url', i) as string;
					const mapOptions = this.getNodeParameter('mapOptions', i) as Record<string, unknown>;

					const body: Record<string, unknown> = {
						url,
						...opt(mapOptions.limit, { limit: mapOptions.limit }),
						...opt(mapOptions.includeSubdomains !== undefined, { include_subdomains: mapOptions.includeSubdomains }),
						...opt(mapOptions.ignoreQueryParameters !== undefined, { ignore_query_parameters: mapOptions.ignoreQueryParameters }),
						...opt(mapOptions.filter, { filter: mapOptions.filter }),
					};

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'xCrawlApi', {
						method: 'POST',
						baseURL: BASE_URL,
						url: '/v1/map',
						body,
						json: true,
					}) as IDataObject;

				} else if (operation === 'crawl') {
					const url = this.getNodeParameter('url', i) as string;
					const outputFormats = this.getNodeParameter('outputFormats', i) as string[];
					const screenshotType = this.getNodeParameter('screenshotType', i, 'viewport') as string;
					const jsonPrompt = this.getNodeParameter('jsonPrompt', i, '') as string;
					const crawlerOptions = this.getNodeParameter('crawlerOptions', i, {}) as Record<string, unknown>;
					const requestOptions = this.getNodeParameter('requestOptions', i, {}) as Record<string, unknown>;
					const jsRenderOptions = this.getNodeParameter('jsRenderOptions', i, {}) as Record<string, unknown>;
					const proxyOptions = this.getNodeParameter('proxyOptions', i, {}) as Record<string, unknown>;
					const webhookOptions = this.getNodeParameter('webhookOptions', i, {}) as Record<string, unknown>;

					const body: Record<string, unknown> = { url };

					if (Object.keys(crawlerOptions).length > 0) {
						body.crawler = {
							...opt(crawlerOptions.limit, { limit: crawlerOptions.limit }),
							...opt(crawlerOptions.maxDepth, { max_depth: crawlerOptions.maxDepth }),
							...opt(crawlerOptions.includeEntireDomain !== undefined, { include_entire_domain: crawlerOptions.includeEntireDomain }),
							...opt(crawlerOptions.includeSubdomains !== undefined, { include_subdomains: crawlerOptions.includeSubdomains }),
							...opt(crawlerOptions.includeExternalLinks !== undefined, { include_external_links: crawlerOptions.includeExternalLinks }),
							...opt(crawlerOptions.sitemaps !== undefined, { sitemaps: crawlerOptions.sitemaps }),
							...opt(crawlerOptions.include, { include: (crawlerOptions.include as string).split('\n').filter(Boolean) }),
							...opt(crawlerOptions.exclude, { exclude: (crawlerOptions.exclude as string).split('\n').filter(Boolean) }),
						};
					}

					if (outputFormats && outputFormats.length > 0) {
						const output: Record<string, unknown> = { formats: outputFormats };
						if (outputFormats.includes('screenshot')) {
							output.screenshot = screenshotType;
						}
						if (outputFormats.includes('json') && jsonPrompt) {
							output.json = { prompt: jsonPrompt };
						}
						body.output = output;
					}

					if (Object.keys(requestOptions).length > 0) {
						body.request = {
							...opt(requestOptions.device, { device: requestOptions.device }),
							...opt(requestOptions.locale, { locale: requestOptions.locale }),
							...opt(requestOptions.onlyMainContent !== undefined, { only_main_content: requestOptions.onlyMainContent }),
							...opt(requestOptions.blockAds !== undefined, { block_ads: requestOptions.blockAds }),
							...opt(requestOptions.skipTlsVerification !== undefined, { skip_tls_verification: requestOptions.skipTlsVerification }),
						};
					}

					if (Object.keys(jsRenderOptions).length > 0) {
						body.js_render = {
							...opt(jsRenderOptions.enabled !== undefined, { enabled: jsRenderOptions.enabled }),
							...opt(jsRenderOptions.waitUntil, { wait_until: jsRenderOptions.waitUntil }),
							...opt(jsRenderOptions.viewportWidth || jsRenderOptions.viewportHeight, {
								viewport: {
									...opt(jsRenderOptions.viewportWidth, { width: jsRenderOptions.viewportWidth }),
									...opt(jsRenderOptions.viewportHeight, { height: jsRenderOptions.viewportHeight }),
								},
							}),
						};
					}

					if (Object.keys(proxyOptions).length > 0) {
						body.proxy = {
							...opt(proxyOptions.location, { location: proxyOptions.location }),
							...opt(proxyOptions.stickySession, { sticky_session: proxyOptions.stickySession }),
						};
					}

					if (webhookOptions.url) {
						body.webhook = {
							url: webhookOptions.url,
							...opt(webhookOptions.events, { events: webhookOptions.events }),
						};
					}

					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'xCrawlApi', {
						method: 'POST',
						baseURL: BASE_URL,
						url: '/v1/crawl',
						body,
						json: true,
					}) as IDataObject;

				} else if (operation === 'crawlResult') {
					const crawlId = this.getNodeParameter('crawlId', i) as string;
					responseData = await this.helpers.httpRequestWithAuthentication.call(this, 'xCrawlApi', {
						method: 'GET',
						baseURL: BASE_URL,
						url: `/v1/crawl/${crawlId}`,
						json: true,
					}) as IDataObject;
				}

				returnData.push({ json: responseData });

			} catch (error) {
				const err = error as { message: string; response?: { data: unknown } };
				const errDetail = err.response?.data
					? JSON.stringify(err.response.data)
					: err.message;
				const errMsg = `${err.message} | API response: ${errDetail}`;
				if (this.continueOnFail()) {
					returnData.push({ json: { error: errMsg } });
					continue;
				}
				throw new Error(errMsg);
			}
		}

		return [returnData];
	}
}
