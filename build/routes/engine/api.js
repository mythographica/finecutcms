/**
 * Admin utility API — clear static cache, page CRUD.
 * Ported from _adm/api.php + page operations from tree_pages.php.
 */
import path from 'path';
import { EngineRequest } from '../../core/collections/engineTypes.js';
import { settings } from '../../core/settings.js';
import { removeRecursive, fileExists, mkdirp, setfiles, getfiles } from '../../lib/fileUtils.js';
const ROOT = process.cwd();
async function getPage(pagePath) {
    const [headerRaw, content, infoRaw, blocksRaw] = await Promise.all([
        getfiles('header.txt', pagePath),
        getfiles('content.txt', pagePath),
        getfiles('info.txt', pagePath),
        getfiles('blocks.txt', pagePath)
    ]);
    const header = headerRaw ? JSON.parse(headerRaw) : null;
    const info = infoRaw ? JSON.parse(infoRaw) : {};
    const blocks = blocksRaw ? JSON.parse(blocksRaw) : [];
    return { header, content, info, blocks, path: pagePath };
}
async function setPage(pagePath, data) {
    const header = data.header;
    const content = data.content || '';
    const blocks = data.blocks;
    await Promise.all([
        setfiles('header.txt', pagePath, JSON.stringify(header)),
        setfiles('content.txt', pagePath, content),
        setfiles('blocks.txt', pagePath, JSON.stringify(blocks || [])),
        setfiles('info.txt', pagePath, data.info || '')
    ]);
    return getPage(pagePath);
}
export default async function (app) {
    // POST /engine/api — clear cache, page CRUD
    app.post('/engine/api', async (req, reply) => {
        const body = req.body;
        const action = String(body.action || '');
        const leaf = String(body.leaf || '');
        const pathName = String(body.path || '');
        const data = body.data;
        const engineRequest = new EngineRequest({ body: req.body });
        // Clear static cache
        if (action === 'clear_cache') {
            const staticPath = path.join(ROOT, settings.static);
            const ok = await removeRecursive(staticPath);
            const cacheResult = new engineRequest.CacheResult(ok);
            return reply.type('application/json').send({ cleared: cacheResult.cleared });
        }
        // Get page content
        if (action === 'content_get') {
            const pagesPath = path.join(ROOT, settings.pages, leaf);
            if (!await fileExists(pagesPath)) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Page not found' });
            }
            const page = await getPage(pagesPath);
            const pageResult = new engineRequest.PageResult(page);
            return reply.type('application/json').send({ page: pageResult.page, status: true });
        }
        // Set page content
        if (action === 'content_set') {
            const pagesPath = path.join(ROOT, settings.pages, leaf);
            if (!await fileExists(pagesPath)) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Page not found' });
            }
            const page = await setPage(pagesPath, data || {});
            const pageResult = new engineRequest.PageResult(page);
            return reply.type('application/json').send({ page: pageResult.page, status: true });
        }
        // Create page
        if (action === 'set') {
            const parentPath = path.join(ROOT, settings.pages, leaf);
            const newPath = path.join(parentPath, pathName);
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
        // Delete page
        if (action === 'del') {
            const pagesPath = path.join(ROOT, settings.pages, leaf);
            const ok = await removeRecursive(pagesPath);
            return reply.type('application/json').send({ success: ok });
        }
        reply.code(400);
        return reply.type('application/json').send({ error: 'Unknown action' });
    });
}
//# sourceMappingURL=api.js.map