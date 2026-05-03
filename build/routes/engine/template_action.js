/**
 * Template CRUD API — get, add, save, delete templates.
 * Ported from _adm/template_action.php.
 */
import path from 'path';
import { EngineRequest } from '../../core/collections/engineTypes.js';
import { getfiles, setfiles, removeRecursive, fileExists, mkdirp } from '../../lib/fileUtils.js';
const ROOT = process.cwd();
async function readTemplate(templatePath) {
    const indexPath = path.join(templatePath, 'index.html');
    const snippetPath = path.join(templatePath, 'snippet.txt');
    const headerPath = path.join(templatePath, 'header.txt');
    return {
        source: await fileExists(indexPath) ? await getfiles('index.html', templatePath) : '',
        snippet: await fileExists(snippetPath) ? await getfiles('snippet.txt', templatePath) : '',
        header: await fileExists(headerPath) ? await getfiles('header.txt', templatePath) : ''
    };
}
async function writeTemplate(templatePath, source, snippet, header) {
    await Promise.all([
        setfiles('index.html', templatePath, source),
        setfiles('snippet.txt', templatePath, snippet),
        setfiles('header.txt', templatePath, header)
    ]);
}
export default async function (app) {
    app.get('/engine/template-action', async (req, reply) => {
        const query = req.query;
        const action = String(query.action || '');
        const template = String(query.template || '');
        if (!template) {
            reply.code(400);
            return reply.type('application/json').send({ error: 'Missing template name' });
        }
        const templatePath = path.join(ROOT, 'views', 'templates', template);
        const engineRequest = new EngineRequest({ body: { action, template } });
        if (action === 'get') {
            if (!await fileExists(templatePath)) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Template not found' });
            }
            const data = await readTemplate(templatePath);
            const templateResult = new engineRequest.TemplateResult(data);
            return reply.type('application/json').send(templateResult.template);
        }
        if (action === 'getInfo') {
            if (!await fileExists(templatePath)) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Template not found' });
            }
            const { snippet, header } = await readTemplate(templatePath);
            const templateResult = new engineRequest.TemplateResult({ snippet, header });
            return reply.type('application/json').send(templateResult.template);
        }
        reply.code(400);
        return reply.type('application/json').send({ error: 'Unknown action' });
    });
    app.post('/engine/template-action', async (req, reply) => {
        const body = req.body;
        const action = String(body.action || '');
        const template = String(body.template || '');
        const source = String(body.source || '');
        const snippet = String(body.snippet || '');
        const header = String(body.header || '');
        if (!template) {
            reply.code(400);
            return reply.type('application/json').send({ error: 'Missing template name' });
        }
        const templatePath = path.join(ROOT, 'views', 'templates', template);
        if (action === 'add') {
            if (await fileExists(templatePath)) {
                reply.code(409);
                return reply.type('application/json').send({ error: 'Template with the same name already exists.' });
            }
            await mkdirp(templatePath);
            await writeTemplate(templatePath, source, snippet, header);
            return reply.type('application/json').send({ success: true });
        }
        if (action === 'save') {
            if (!await fileExists(templatePath)) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Template not found' });
            }
            await writeTemplate(templatePath, source, snippet, header);
            return reply.type('application/json').send({ success: true });
        }
        if (action === 'del') {
            if (!await fileExists(templatePath)) {
                reply.code(404);
                return reply.type('application/json').send({ error: 'Template not found' });
            }
            const ok = await removeRecursive(templatePath);
            return reply.type('application/json').send({ success: ok });
        }
        reply.code(400);
        return reply.type('application/json').send({ error: 'Unknown action' });
    });
}
//# sourceMappingURL=template_action.js.map