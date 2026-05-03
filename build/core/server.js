/**
 * Fastify server bootstrap.
 */
import Fastify from 'fastify';
import { requestTypes, RequestData, RouteData, PageData, RenderData, ResponseData } from './collections/requestTypes.js';
import { engineTypes, EngineRequest, TreeResult, PageResult, CacheResult, TemplateResult } from './collections/engineTypes.js';
import { createLogger, setupCollectionLogging } from '../plugins/pino-logger.js';
const logger = createLogger();
const app = Fastify({
    loggerInstance: logger
});
// Wire up mnemonica collection hooks to Pino
setupCollectionLogging(requestTypes, logger);
setupCollectionLogging(engineTypes, logger);
// Decorate Fastify with mnemonica collections for route access
app.decorate('requestTypes', requestTypes);
app.decorate('engineTypes', engineTypes);
// Expose individual constructors for convenience
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
    return { status: 'ok', mnemonica: true };
});
// Test endpoint: verify mnemonica chain works
app.get('/test-chain', async (_req, reply) => {
    const requestData = new RequestData({ url: '/test', method: 'GET', query: {}, params: {}, body: {}, headers: {}, id: 'test' });
    const routeData = new requestData.RouteData({
        pagePath: '/test',
        isMain: false,
        deep: ''
    });
    const pageData = new routeData.PageData({
        header: { title: 'Test' },
        content: 'Hello from mnemonica chain',
        info: {},
        blocks: [],
        path: '/test'
    });
    const renderData = new pageData.RenderData({ parser: 'test' });
    const responseData = new renderData.ResponseData({
        body: JSON.stringify({}),
        contentType: 'application/json',
        statusCode: 200,
        fromCache: false
    });
    return reply
        .type(responseData.contentType)
        .code(responseData.statusCode)
        .send(responseData.body);
});
// Register frontend page route
const { default: registerFrontend } = await import('../routes/frontend.js');
await registerFrontend(app);
// Register admin API routes
const { default: registerSettings } = await import('../routes/engine/settings.js');
await registerSettings(app);
const { default: registerTreePages } = await import('../routes/engine/tree_pages.js');
await registerTreePages(app);
const { default: registerTemplate } = await import('../routes/engine/template.js');
await registerTemplate(app);
const { default: registerTemplateAction } = await import('../routes/engine/template_action.js');
await registerTemplateAction(app);
const { default: registerApi } = await import('../routes/engine/api.js');
await registerApi(app);
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
try {
    await app.listen({ port: PORT, host: HOST });
    logger.info(`FineCut server listening on http://${HOST}:${PORT}`);
}
catch (err) {
    logger.error(err);
    process.exit(1);
}
//# sourceMappingURL=server.js.map