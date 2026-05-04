/**
 * Fastify server bootstrap.
 */
import Fastify from 'fastify';
import { lookupTyped } from 'mnemonica';
import {
	RouteData, PageData, RenderData, ResponseData
} from './collections/requestTypes.js';
import {
	EngineRequest, TreeResult, PageResult, CacheResult, TemplateResult
} from './collections/engineTypes.js';
import { defaultTypes } from 'mnemonica';
import { createLogger, setupCollectionLogging } from '../plugins/pino-logger.js';

const logger = createLogger();

const RequestData = lookupTyped('RequestData');

const app = Fastify({
	loggerInstance : logger
});

// Wire up mnemonica collection hooks to Pino (default collection)
setupCollectionLogging(defaultTypes as unknown as {
	registerHook: (hookType: string, callback: (hookData: Record<string, unknown>) => void) => void;
}, logger);

// Decorate Fastify with mnemonica constructors for route access
app.decorate('RequestData', RequestData);
app.decorate('RouteData', RouteData);
app.decorate('PageData', PageData);
app.decorate('RenderData', RenderData);
app.decorate('ResponseData', ResponseData);

app.decorate('EngineRequest', EngineRequest);
app.decorate('TreeResult', TreeResult);
app.decorate('PageResult', PageResult);
app.decorate('CacheResult', CacheResult);
app.decorate('TemplateResult', TemplateResult);

// Health check
app.get('/health', async () => {
	return { status : 'ok', mnemonica : true };
});

// Test endpoint: verify mnemonica chain works
app.get('/test-chain', async (_req, reply) => {
	const requestData = new RequestData({
		method  : 'GET',
		url     : '/test',
		query   : {},
		params  : {},
		body    : {},
		headers : {},
		id      : 'test'
	});
	const routeData = new requestData.RouteData({
		pagePath : '/test',
		isMain   : false,
		deep     : ''
	});
	const pageData = new routeData.PageData({
		header : {
			title       : 'Test',
			template    : 'default',
			pageIsCode  : false,
			keywords    : '',
			description : '',
			additional  : ''
		},
		content : 'Hello from mnemonica chain',
		info    : {},
		blocks  : [],
		path    : '/test'
	});
	const renderData = new pageData.RenderData({ parser : 'test' });
	const responseData = new renderData.ResponseData({
		body : JSON.stringify({}),
		contentType : 'application/json',
		statusCode : 200,
		fromCache : false
	});

	return reply
		.type(responseData.contentType)
		.code(responseData.statusCode)
		.send(responseData.body);
});

// Register frontend page route
const { default : registerFrontend } = await import('../routes/frontend.js');
await registerFrontend(app);

// Register admin API routes
const { default : registerSettings } = await import('../routes/engine/settings.js');
await registerSettings(app);

const { default : registerTreePages } = await import('../routes/engine/tree_pages.js');
await registerTreePages(app);

const { default : registerTemplate } = await import('../routes/engine/template.js');
await registerTemplate(app);

const { default : registerTemplateAction } = await import('../routes/engine/template_action.js');
await registerTemplateAction(app);

const { default : registerApi } = await import('../routes/engine/api.js');
await registerApi(app);

const PORT = Number(process.env.PORT) || 3000;

// Start the server if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
	app.listen({ port: PORT, host: '0.0.0.0' })
		.then(() => {
			logger.info(`FineCut server listening on http://0.0.0.0:${PORT}`);
		})
		.catch((err: Error) => {
			logger.error(err);
			process.exit(1);
		});
}

export { app, logger, PORT };
