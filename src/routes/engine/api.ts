/**
 * Admin utility API — clear static cache, page CRUD.
 * Ported from _adm/api.php + page operations from tree_pages.php.
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { FastifyRequest, FastifyReply } from 'fastify';
import '../../core/collections/engineTypes.js';
import { lookupTyped } from 'mnemonica';
import { settings } from '../../core/settings.js';
import { removeRecursive, fileExists, mkdirp } from '../../lib/fileUtils.js';
import { getPage, setPage } from './tree_pages.js';

const ROOT = process.cwd();
const SETTINGS_PATH = path.join(ROOT, 'data', 'settings.json');

const EngineRequest = lookupTyped('EngineRequest');

type App = {
	get: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
	post: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
};

export default async function (app: App): Promise<void> {

	app.post('/engine/api', async (req: FastifyRequest, reply: FastifyReply) => {
		const body = req.body as Record<string, unknown>;
		const action = String(body.action || '');
		const leaf = String(body.leaf || '');
		const pathName = String(body.path || '');
		const data = body.data as Record<string, unknown> | undefined;

		const engineRequest = new EngineRequest({
			body: req.body as Record<string, unknown>
		});

		if (action === 'clear_cache') {
			const staticPath = path.join(ROOT, settings.static);
			const ok = await removeRecursive(staticPath);
			const cacheResult = new engineRequest.CacheResult(ok);
			return reply.type('application/json').send({ cleared : cacheResult.cleared });
		}

		if (action === 'content_get') {
			const pagesPath = path.join(ROOT, settings.pages, leaf);
			if (!await fileExists(pagesPath)) {
				reply.code(404);
				return reply.type('application/json').send({ error: 'Page not found' });
			}
			const page = await getPage(pagesPath);
			const pageResult = new engineRequest.PageResult(page);
			return reply.type('application/json').send({ page: pageResult.page, status : true });
		}

		if (action === 'content_set') {
			if (!data) {
				reply.code(400);
				return reply.type('application/json').send({ error: 'Missing data' });
			}
			const page = await setPage(
				path.join(ROOT, settings.pages, leaf),
				data
			);
			const pageResult = new engineRequest.PageResult(page);
			return reply.type('application/json').send({ page: pageResult.page, status : true });
		}

		if (action === 'set') {
			const target = path.join(ROOT, settings.pages, leaf, pathName);
			if (await fileExists(target)) {
				reply.code(409);
				return reply.type('application/json').send({ error: 'Page already exists' });
			}
			await mkdirp(target);
			if (data) {
				await setPage(target, data);
			}
			return reply.type('application/json').send({ status : true });
		}

		if (action === 'settings_path') {
			return reply.type('text/plain').send(settings.pages);
		}

		if (action === 'settings') {
			const dataVal = String(body.data || '');
			if (dataVal) {
				await fs.writeFile(SETTINGS_PATH, dataVal, 'utf-8');
			}
			const current = await fs.readFile(SETTINGS_PATH, 'utf-8');
			return reply.type('text/plain').send(current);
		}

		if (action === 'mkdir') {
			const target = path.join(ROOT, settings.pages, leaf, pathName);
			await mkdirp(target);
			return reply.type('application/json').send({ status : true });
		}

		if (action === 'del') {
			const target = path.join(ROOT, settings.pages, leaf, pathName);
			const ok = await removeRecursive(target);
			return reply.type('application/json').send({ status : ok });
		}

		reply.code(400);
		return reply.type('application/json').send({ error: 'Unknown action' });
	});
}
