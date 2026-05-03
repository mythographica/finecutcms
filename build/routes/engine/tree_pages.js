/**
 * Page tree API — list, create, delete, get, set page content.
 * Ported from _adm/tree_pages.php.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { EngineRequest } from '../../core/collections/engineTypes.js';
import { getfiles, setfiles, mkdirp, removeRecursive, paths as resolvePaths, fileExists, parseHeader } from '../../lib/fileUtils.js';
const ROOT = process.cwd();
/**
 * Load all page files for a given page path.
 */
async function getPage(pagePath) {
    const [header, content, infoRaw, blocksRaw] = await Promise.all([
        parseHeader(pagePath),
        getfiles('content.txt', pagePath),
        getfiles('info.txt', pagePath),
        getfiles('blocks.txt', pagePath)
    ]);
    const info = infoRaw ? JSON.parse(infoRaw) : {};
    const blocks = blocksRaw ? JSON.parse(blocksRaw) : [];
    return { header, content, info, blocks, path: pagePath };
}
/**
 * Save page data. If info is empty, fills from template snippet.
 */
async function setPage(pagePath, data) {
    let header = data.header;
    const content = data.content || '';
    const blocks = data.blocks;
    let infoContent = data.info || '';
    const isEmpty = !infoContent;
    // Auto-fill from template defaults when creating new page
    if (isEmpty && header?.template) {
        const templatePath = path.join(ROOT, 'views', 'templates', header.template);
        const snippetPath = path.join(templatePath, 'snippet.txt');
        if (await fileExists(snippetPath)) {
            infoContent = await getfiles('snippet.txt', templatePath);
        }
        const templateHeaderPath = path.join(templatePath, 'header.txt');
        if (await fileExists(templateHeaderPath)) {
            const headerRaw = await getfiles('header.txt', templatePath);
            header = headerRaw ? JSON.parse(headerRaw) : header;
        }
    }
    await Promise.all([
        setfiles('header.txt', pagePath, JSON.stringify(header)),
        setfiles('content.txt', pagePath, content),
        setfiles('blocks.txt', pagePath, JSON.stringify(blocks || [])),
        setfiles('info.txt', pagePath, infoContent)
    ]);
    return getPage(pagePath);
}
export default async function (app) {
    // GET /engine/tree — list pages at a leaf
    app.get('/engine/tree', async (req, reply) => {
        const query = req.query;
        const leaf = String(query.leaf || '');
        const pagesPath = resolvePaths(leaf);
        const entries = await fs.readdir(pagesPath, { withFileTypes: true });
        const tree = entries
            .filter(e => e.isDirectory())
            .map(e => {
            return { name: e.name };
        });
        const engineRequest = new EngineRequest({ body: { action: 'get', leaf } });
        const treeResult = new engineRequest.TreeResult({ tree });
        return reply.type('application/json').send(treeResult.tree);
    });
    // GET /engine/page — get page content
    app.get('/engine/page', async (req, reply) => {
        const query = req.query;
        const leaf = String(query.leaf || '');
        const pagePath = resolvePaths(leaf);
        if (!await fileExists(pagePath)) {
            reply.code(404);
            return reply.type('application/json').send({ error: 'Page not found' });
        }
        const page = await getPage(pagePath);
        const engineRequest = new EngineRequest({ body: { action: 'content_get', leaf } });
        const pageResult = new engineRequest.PageResult(page);
        return reply.type('application/json').send({ page: pageResult.page, status: true });
    });
    // POST /engine/tree — create, delete, or set page
    app.post('/engine/tree', async (req, reply) => {
        const body = req.body;
        const action = String(body.action || '');
        const leaf = String(body.leaf || '');
        const pageName = String(body.path || '');
        const data = body.data;
        const engineRequest = new EngineRequest({ body: req.body });
        if (action === 'get') {
            // Same as GET /engine/tree
            const pagesPath = resolvePaths(leaf);
            const entries = await fs.readdir(pagesPath, { withFileTypes: true });
            const tree = entries
                .filter(e => e.isDirectory())
                .map(e => ({ name: e.name }));
            const treeResult = new engineRequest.TreeResult({ tree });
            return reply.type('application/json').send(treeResult.tree);
        }
        if (action === 'del') {
            const pagePath = resolvePaths(leaf);
            const ok = await removeRecursive(pagePath);
            return reply.type('application/json').send({ success: ok });
        }
        if (action === 'set') {
            const parentPath = resolvePaths(leaf);
            const newPath = path.join(parentPath, pageName);
            if (await fileExists(newPath)) {
                reply.code(409);
                return reply.type('application/json').send({ error: 'The page with the same name already exists.' });
            }
            await mkdirp(newPath);
            await Promise.all([
                setfiles('info.txt', newPath, ''),
                setfiles('header.txt', newPath, ''),
                setfiles('content.txt', newPath, ''),
                setfiles('blocks.txt', newPath, '')
            ]);
            if (data) {
                const page = await setPage(newPath, data);
                const pageResult = new engineRequest.PageResult(page);
                return reply.type('application/json').send({ page: pageResult.page, status: true });
            }
            return reply.type('application/json').send({ success: true });
        }
        if (action === 'content_set') {
            const pagePath = resolvePaths(leaf);
            if (!await fileExists(pagePath)) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Page not found' });
            }
            const page = await setPage(pagePath, data || {});
            const pageResult = new engineRequest.PageResult(page);
            return reply.type('application/json').send({ page: pageResult.page, status: true });
        }
        reply.code(400);
        return reply.type('application/json').send({ error: 'Unknown action' });
    });
}
//# sourceMappingURL=tree_pages.js.map