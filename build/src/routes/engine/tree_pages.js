/**
 * Page tree API — list, create, delete, get, set page content.
 * Ported from _adm/tree_pages.php.
 */
import { promises as fs } from 'fs';
import path from 'path';
import '../../core/collections/engineTypes.js';
import { lookupTyped } from 'mnemonica';
import { paths as resolvePaths } from '../../lib/fileUtils.js';
import { handleContentGet, handleContentSet, handleSet, handleMkdir, handleDel } from '../../lib/engineActions.js';
export { getPage, setPage } from '../../lib/pageStore.js';
const EngineRequest = lookupTyped('EngineRequest');
export default async function (app) {
    app.get('/engine/tree', async (req, reply) => {
        const query = req.query;
        const leaf = String(query.leaf || '');
        const pagesPath = resolvePaths(leaf);
        const entries = await fs.readdir(pagesPath, { withFileTypes: true });
        const tree = await Promise.all(entries
            .filter(e => e.isDirectory())
            .map(async (e) => {
            const subEntries = await fs.readdir(path.join(pagesPath, e.name), { withFileTypes: true }).catch(() => []);
            const hasSubdirs = subEntries.some(se => se.isDirectory());
            return { name: e.name, folder: hasSubdirs };
        }));
        const engineRequest = new EngineRequest({
            body: { action: 'get', leaf }
        });
        const treeResult = new engineRequest.TreeResult({ tree });
        return reply.type('application/json').send(treeResult.tree);
    });
    app.get('/engine/page', async (req, reply) => {
        const query = req.query;
        const leaf = String(query.leaf || '');
        try {
            const result = await handleContentGet(leaf);
            return reply.type('application/json').send(result);
        }
        catch (err) {
            reply.code(404);
            return reply.type('application/json').send({ error: 'Page not found' });
        }
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
            const tree = await Promise.all(entries
                .filter(e => e.isDirectory())
                .map(async (e) => {
                const subEntries = await fs.readdir(path.join(pagesPath, e.name), { withFileTypes: true }).catch(() => []);
                const hasSubdirs = subEntries.some(se => se.isDirectory());
                return { name: e.name, folder: hasSubdirs };
            }));
            const treeResult = new engineRequest.TreeResult({ tree });
            return reply.type('application/json').send(treeResult.tree);
        }
        if (action === 'set') {
            try {
                const result = await handleSet(leaf, pageName, data);
                return reply.type('application/json').send(result);
            }
            catch (err) {
                reply.code(409);
                return reply.type('application/json').send({ error: 'Page already exists' });
            }
        }
        if (action === 'mkdir') {
            const result = await handleMkdir(leaf, pageName);
            return reply.type('application/json').send(result);
        }
        if (action === 'del') {
            const result = await handleDel(leaf, pageName);
            return reply.type('application/json').send(result);
        }
        if (action === 'content_get') {
            try {
                const result = await handleContentGet(leaf);
                return reply.type('application/json').send(result);
            }
            catch (err) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Page not found' });
            }
        }
        if (action === 'content_set') {
            if (!data) {
                reply.code(400);
                return reply.type('application/json').send({ error: 'Missing data' });
            }
            const result = await handleContentSet(leaf, data);
            return reply.type('application/json').send(result);
        }
        reply.code(400);
        return reply.type('application/json').send({ error: 'Unknown action' });
    });
}
//# sourceMappingURL=tree_pages.js.map