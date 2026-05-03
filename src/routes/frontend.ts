/**
 * Frontend catch-all route.
 * Mnemonica chain: RequestData → RouteData → PageData → RenderData → ResponseData
 */
import path from 'path';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { RequestData } from '../core/collections/requestTypes.js';
import { checkStaticCache, writeStaticCache } from '../plugins/static-cache.js';
import { fileExists, loadPageFiles } from '../lib/fileUtils.js';
import { render } from '../lib/templateEngine.js';
import {
	jsonInfo, headAdditional, contentParser, menuMain, menuLeft
} from '../lib/components.js';
import '../lib/registerHelpers.js';
import { settings } from '../core/settings.js';
import type { TemplateContext, PageFiles } from '../types/index.js';

const ROOT = process.cwd();

type MnemInstance = Record<string, unknown>;
type MnemCtor = new (...args: unknown[]) => MnemInstance;

function parseUrl (url: string): string {
	let uri = decodeURIComponent(url);
	uri = uri.replace(/index\.(php|htm|html)/g, '');
	uri = uri.replace(/_index\/?/g, '');
	uri = uri.replace(/^\//, '').replace(/\/$/, '');
	return '/' + uri;
}

export default async function (app: { get: (path: string, handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void }): Promise<void> {

	app.get('/*', async (req: FastifyRequest, reply: FastifyReply) => {
		try {
			const requestData = new (RequestData as MnemCtor)(req) as MnemInstance & { RouteData: MnemCtor };

			let pagePath = parseUrl(req.url);
			let isMain = false;

			if (pagePath === '/' || pagePath === '') {
				pagePath = '/_index';
				isMain = true;
			}

			const fullPagePath = path.join(ROOT, settings.pages, pagePath);

			if (!await fileExists(fullPagePath)) {
				reply.code(404);
				return reply.type('text/html').send('<h1>404 Not Found</h1>');
			}

			const routeData = new requestData.RouteData({
				pagePath,
				isMain,
				deep : ''
			}) as MnemInstance & { PageData: MnemCtor };

			const pageFiles = await loadPageFiles(fullPagePath);
			const pageData = new routeData.PageData(pageFiles) as MnemInstance & { RenderData: MnemCtor };

			// Check static cache before rendering
			const cached = await checkStaticCache(pagePath, pageFiles.header);
			if (cached) {
				const cachedRenderData = new pageData.RenderData({ components : {} }) as MnemInstance & { ResponseData: MnemCtor };
				const responseData = new cachedRenderData.ResponseData({
					body : cached,
					contentType : 'text/html',
					statusCode : 200,
					fromCache : true
				});
				return reply
					.type(responseData.contentType as string)
					.code(responseData.statusCode as number)
					.send(responseData.body as string);
			}

			// Resolve components
			const components = {
				jsonInfo       : jsonInfo(pageData as unknown as TemplateContext),
				headAdditional : headAdditional(),
				contentParser  : await contentParser(pageData as unknown as TemplateContext),
				menuMain       : await menuMain(pageData as unknown as TemplateContext),
				menuLeft       : await menuLeft(pageData as unknown as TemplateContext)
			};

			const renderData = new pageData.RenderData(components) as MnemInstance & { ResponseData: MnemCtor };
			const templatePath = path.join(
				ROOT, 'views', 'templates',
				(renderData.template as string) || 'default',
				'index.html'
			);

			const context: TemplateContext = {
				header     : renderData.header as PageFiles['header'],
				content    : renderData.content as string,
				info       : renderData.info as Record<string, unknown>,
				blocks     : renderData.blocks as Array<{ name: string; value: string }>,
				components : renderData.components as Record<string, string>,
				isMain     : renderData.isMain as boolean,
				deep       : renderData.deep as string,
				pagePath   : renderData.pagePath as string,
				path       : renderData.path as string
			};

			const html = await render(templatePath, context);

			await writeStaticCache(pagePath, html);

			const responseData = new renderData.ResponseData({
				body : html,
				contentType : 'text/html',
				statusCode : 200,
				fromCache : false
			});

			return reply
				.type(responseData.contentType as string)
				.code(responseData.statusCode as number)
				.send(responseData.body as string);

		} catch (err) {
			req.log.error(err);
			reply.code(500);
			return reply.type('text/html').send(`<h1>500 Internal Server Error</h1><pre>${(err as Error).message}</pre>`);
		}
	});
}
