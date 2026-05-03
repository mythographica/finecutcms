/**
 * Frontend mnemonica type collection.
 * RequestData → RouteData → PageData → RenderData → ResponseData
 */
import { createTypesCollection } from 'mnemonica';
import type { PageFiles, RouteInfo, ResponseOutput } from '../../types/index.js';

// mnemonica types are internal — cast to unknown for application use
export const requestTypes: unknown = createTypesCollection();

type DefineFn = (name: string, handler: (...args: unknown[]) => void) => unknown;

export const RequestData: unknown = (requestTypes as { define: DefineFn }).define('RequestData', function (this: Record<string, unknown>, req: {
	method: string;
	url: string;
	query: Record<string, unknown>;
	params: Record<string, unknown>;
	body: Record<string, unknown>;
	headers: Record<string, unknown>;
	id: string;
}) {
	this.method = req.method;
	this.url = req.url;
	this.query = req.query;
	this.params = req.params;
	this.body = req.body;
	this.headers = req.headers;
	this.requestId = req.id;
} as (...args: unknown[]) => void);

export const RouteData: unknown = (RequestData as { define: DefineFn }).define('RouteData', function (this: Record<string, unknown>, routeInfo: RouteInfo) {
	this.pagePath = routeInfo.pagePath;
	this.isMain = routeInfo.isMain;
	this.deep = routeInfo.deep;
} as (...args: unknown[]) => void);

export const PageData: unknown = (RouteData as { define: DefineFn }).define('PageData', function (this: Record<string, unknown>, pageFiles: PageFiles) {
	this.header = pageFiles.header;
	this.content = pageFiles.content;
	this.info = pageFiles.info;
	this.blocks = pageFiles.blocks;
	this.path = pageFiles.path;
} as (...args: unknown[]) => void);

export const RenderData: unknown = (PageData as { define: DefineFn }).define('RenderData', function (this: Record<string, unknown>, components: Record<string, string | Promise<string>>) {
	this.components = components;
	this.template = (this.header as PageFiles['header'])?.template;
} as (...args: unknown[]) => void);

export const ResponseData: unknown = (RenderData as { define: DefineFn }).define('ResponseData', function (this: Record<string, unknown>, output: ResponseOutput) {
	this.body = output.body;
	this.contentType = output.contentType;
	this.statusCode = output.statusCode;
	this.fromCache = output.fromCache;
} as (...args: unknown[]) => void);
