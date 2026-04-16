import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class XCrawlApi implements ICredentialType {
	name = 'xCrawlApi';
	displayName = 'XCrawl API';
	documentationUrl = 'https://docs.xcrawl.com/doc';
	icon: Icon = {
		light: 'file:../nodes/WebScraper/xcrawl.svg',
		dark: 'file:../nodes/WebScraper/xcrawl.dark.svg',
	};
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API Key obtained after registering at xcrawl.com',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://run.xcrawl.com',
			url: '/v1/scrape',
			method: 'POST',
			json: true,
			body: {
				url: 'https://example.com',
				output: { formats: ['markdown'] },
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'success',
					value: true,
					message: 'Invalid API Key or authentication failed',
				},
			},
		],
	};
}
