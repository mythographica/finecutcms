/**
 * Frontend catch-all route.
 * Mnemonica chain: RequestData → RouteData → PageData → RenderData → ResponseData
 */
import path from 'path';
import { promises as fs } from 'fs';
import '../core/collections/requestTypes.js';
import { lookupTyped } from 'mnemonica';
import { checkStaticCache } from '../plugins/static-cache.js';
import { fileExists, loadPageFiles } from '../lib/fileUtils.js';
import { render } from '../lib/templateEngine.js';
import { jsonInfo, headAdditional, contentParser, menuMain, menuLeft } from '../lib/components.js';
import '../lib/registerHelpers.js';
import { settings } from '../core/settings.js';
const RequestData = lookupTyped('RequestData');
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const mimeTypes = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.txt': 'text/plain'
};
function parseUrl(url) {
    let uri = decodeURIComponent(url);
    uri = uri.replace(/index\.(php|htm|html)/g, '');
    uri = uri.replace(/_index\/?/g, '');
    uri = uri.replace(/^\//, '').replace(/\/$/, '');
    return '/' + uri;
}
export default async function (app) {
    app.get('/*', async (req, reply) => {
        // Serve static files from public/ if they exist
        const staticPath = path.join(PUBLIC_DIR, req.url);
        try {
            const stat = await fs.stat(staticPath);
            if (stat.isFile()) {
                const ext = path.extname(staticPath);
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                const data = await fs.readFile(staticPath);
                return reply.type(contentType).send(data);
            }
        }
        catch {
            // not a file, fall through to page rendering
        }
        let pagePath = '';
        let chainInstance;
        try {
            const requestData = new RequestData({
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
                body: req.body,
                headers: req.headers,
                id: req.id
            });
            chainInstance = requestData;
            pagePath = parseUrl(req.url);
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
                deep: ''
            });
            chainInstance = routeData;
            const pageFiles = await loadPageFiles(fullPagePath);
            const pageData = new routeData.PageData(pageFiles);
            chainInstance = pageData;
            // Check static cache before rendering
            const cached = await checkStaticCache(pagePath, pageFiles.header);
            if (cached) {
                const cachedRenderData = new pageData.RenderData({});
                const responseData = new cachedRenderData.ResponseData({
                    body: cached,
                    contentType: 'text/html',
                    statusCode: 200,
                    fromCache: true
                });
                return reply
                    .type(responseData.contentType)
                    .code(responseData.statusCode)
                    .send(responseData.body);
            }
            // Resolve components
            const components = {
                jsonInfo: jsonInfo(pageData),
                headAdditional: headAdditional(),
                contentParser: await contentParser(pageData),
                menuMain: await menuMain(pageData),
                menuLeft: await menuLeft(pageData)
            };
            const renderData = new pageData.RenderData(components);
            chainInstance = renderData;
            const templatePath = path.join(ROOT, 'views', 'templates', renderData.template || 'default', 'index.html');
            const context = {
                header: renderData.header,
                content: renderData.content,
                info: renderData.info,
                blocks: renderData.blocks,
                components: renderData.components,
                isMain: renderData.isMain,
                deep: renderData.deep,
                pagePath: renderData.pagePath,
                path: renderData.path
            };
            const html = await render(templatePath, context);
            const responseData = new renderData.ResponseData({
                body: html,
                contentType: 'text/html',
                statusCode: 200,
                fromCache: false
            });
            chainInstance = responseData;
            return reply
                .type(responseData.contentType)
                .code(responseData.statusCode)
                .send(responseData.body);
        }
        catch (err) {
            const error = err;
            req.log.error({ err: error.message, pagePath }, 'request failed');
            let displayError = error;
            if (chainInstance) {
                try {
                    const instance = chainInstance;
                    const exceptionCtor = instance.exception;
                    if (exceptionCtor) {
                        displayError = new exceptionCtor(error);
                    }
                }
                catch {
                    // fallback to plain error
                }
            }
            reply.code(500);
            return reply.type('text/html').send(`<h1>500 Internal Server Error</h1>` +
                `<pre>${displayError.message}</pre>`);
        }
    });
}
//# sourceMappingURL=frontend.js.map