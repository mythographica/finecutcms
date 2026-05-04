/**
 * Page tree API — list, create, delete, get, set page content.
 * Ported from _adm/tree_pages.php.
 */
import { promises as fs } from 'fs';
import path from 'path';
import '../../core/collections/engineTypes.js';
import { lookupTyped } from 'mnemonica';
import { getfiles, setfiles, mkdirp, removeRecursive, paths as resolvePaths, fileExists, parseHeader } from '../../lib/fileUtils.js';
const ROOT = process.cwd();
const EngineRequest = lookupTyped('EngineRequest');
async function getPage(pagePath) {
    const [header, content, infoRaw, blocksRaw] = await Promise.all([
        parseHeader(pagePath),
        getfiles('content.txt', pagePath),
        getfiles('info.txt', pagePath),
        getfiles('blocks.txt', pagePath)
    ]);
    const info = infoRaw
        ? JSON.parse(infoRaw)
        : {};
    const blocks = blocksRaw
        ? JSON.parse(blocksRaw)
        : [];
    return { header, content, info, blocks, path: pagePath };
}
async function setPage(pagePath, data) {
    let header = data.header;
    const content = data.content || '';
    const blocks = data.blocks;
    let infoContent = data.info || '';
    const isEmpty = !infoContent;
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
        const engineRequest = new EngineRequest({
            body: { action: 'get', leaf }
        });
        const treeResult = new engineRequest.TreeResult({ tree });
        return reply.type('application/json').send(treeResult.tree);
    });
    app.get('/engine/page', async (req, reply) => {
        const query = req.query;
        const leaf = String(query.leaf || '');
        const pagePath = resolvePaths(leaf);
        if (!await fileExists(pagePath)) {
            reply.code(404);
            return reply.type('application/json').send({ error: 'Page not found' });
        }
        const page = await getPage(pagePath);
        const engineRequest = new EngineRequest({
            body: { action: 'content_get', leaf }
        });
        const pageResult = new engineRequest.PageResult(page);
        return reply.type('application/json').send({ page: pageResult.page, status: true });
    });
    app.post('/engine/tree', async (req, reply) => {
        const body = req.body;
        const action = String(body.action || '');
        const leaf = String(body.leaf || '');
        const pageName = String(body.path || '');
        const data = body.data;
        const engineRequest = new EngineRequest({
            body: req.body
        });
        if (action === 'get') {
            const pagesPath = resolvePaths(leaf);
            const entries = await fs.readdir(pagesPath, { withFileTypes: true });
            const tree = entries
                .filter(e => e.isDirectory())
                .map(e => ({ name: e.name }));
            const treeResult = new engineRequest.TreeResult({ tree });
            return reply.type('application/json').send(treeResult.tree);
        }
        if (action === 'mkdir') {
            const target = path.join(ROOT, 'data/pages', leaf, pageName);
            await mkdirp(target);
            return reply.type('application/json').send({ status: true });
        }
        if (action === 'del') {
            const target = path.join(ROOT, 'data/pages', leaf, pageName);
            const ok = await removeRecursive(target);
            return reply.type('application/json').send({ status: ok });
        }
        if (action === 'content_get') {
            const target = resolvePaths(leaf);
            const page = await getPage(target);
            const pageResult = new engineRequest.PageResult(page);
            return reply.type('application/json').send({ page: pageResult.page, status: true });
        }
        if (action === 'content_set') {
            if (!data) {
                reply.code(400);
                return reply.type('application/json').send({ error: 'Missing data' });
            }
            const target = resolvePaths(leaf);
            const page = await setPage(target, data);
            const pageResult = new engineRequest.PageResult(page);
            return reply.type('application/json').send({ page: pageResult.page, status: true });
        }
        reply.code(400);
        return reply.type('application/json').send({ error: 'Unknown action' });
    });
}
//# sourceMappingURL=tree_pages.js.map