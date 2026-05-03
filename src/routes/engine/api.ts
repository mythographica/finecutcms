/**
 * Admin utility API — clear static cache, page CRUD.
 * Ported from _adm/api.php + page operations from tree_pages.php.
 */
import path from 'path';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { EngineRequest } from '../../core/collections/engineTypes.js';
import { settings } from '../../core/settings.js';
import { removeRecursive, fileExists, mkdirp, setfiles, getfiles } from '../../lib/fileUtils.js';
import type { PageFiles, PageHeader } from '../../types/index.js';

const ROOT = process.cwd();

type MnemInstance = Record<string, unknown>;
type MnemCtor = new (...args: unknown[]) => MnemInstance;

async function getPage (pagePath: string): Promise<PageFiles> {
	const [headerRaw, content, infoRaw, blocksRaw] = await Promise.all([
		getfiles('header.txt', pagePath),
		getfiles('content.txt', pagePath),
		getfiles('info.txt', pagePath),
		getfiles('blocks.txt', pagePath)
	]);

	const header: PageHeader | null = headerRaw ? JSON.parse(headerRaw) as PageHeader : null;
	const info: Record<string, unknown> = infoRaw ? JSON.parse(infoRaw) as Record<string, unknown> : {};
	const blocks: Array<{ name: string; value: string }> = blocksRaw ? JSON.parse(blocksRaw) as Array<{ name: string; value: string }> : [];

	return { header, content, info, blocks, path: pagePath };
}

async function setPage (pagePath: string, data: Record<string, unknown>): Promise<PageFiles> {
	const header = data.header as PageHeader | undefined;
	const content = (data.content as string) || '';
	const blocks = data.blocks as Array<{ name: string; value: string }> | undefined;

	await Promise.all([
		setfiles('header.txt', pagePath, JSON.stringify(header)),
		setfiles('content.txt', pagePath, content),
		setfiles('blocks.txt', pagePath, JSON.stringify(blocks || [])),
		setfiles('info.txt', pagePath, (data.info as string) || '')
	]);

	return getPage(pagePath);
}

export default async function (app: { get: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void; post: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void }): Promise<void> {

	// POST /engine/api — clear cache, page CRUD
	app.post('/engine/api', async (req: FastifyRequest, reply: FastifyReply) => {
		const body = req.body as Record<string, unknown>;
		const action = String(body.action || '');
		const leaf = String(body.leaf || '');
		const pathName = String(body.path || '');
		const data = body.data as Record<string, unknown> | undefined;

		const engineRequest = new (EngineRequest as MnemCtor)({ body: req.body }) as MnemInstance;

		// Clear static cache
		if (action === 'clear_cache') {
			const staticPath = path.join(ROOT, settings.static);
			const ok = await removeRecursive(staticPath);
			const cacheResult = new (engineRequest as MnemInstance & { CacheResult: MnemCtor }).CacheResult(ok);
			return reply.type('application/json').send({ cleared : cacheResult.cleared });
		}

		// Get page content
		if (action === 'content_get') {
			const pagesPath = path.join(ROOT, settings.pages, leaf);
			if (!await fileExists(pagesPath)) {
				reply.code(404);
				return reply.type('application/json').send({ error: 'Page not found' });
			}
			const page = await getPage(pagesPath);
			const pageResult = new (engineRequest as MnemInstance & { PageResult: MnemCtor }).PageResult(page);
			return reply.type('application/json').send({ page: pageResult.page, status : true });
		}

		// Set page content
		if (action === 'content_set') {
			const pagesPath = path.join(ROOT, settings.pages, leaf);
			if (!await fileExists(pagesPath)) {
				reply.code(404);
				return reply.type('application/json').send({ error: 'Page not found' });
			}
			const page = await setPage(pagesPath, data || {});
			const pageResult = new (engineRequest as MnemInstance & { PageResult: MnemCtor }).PageResult(page);
			return reply.type('application/json').send({ page: pageResult.page, status : true });
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
				const pageResult = new (engineRequest as MnemInstance & { PageResult: MnemCtor }).PageResult(page);
				return reply.type('application/json').send({ page: pageResult.page, status : true });
			}

			return reply.type('application/json').send({ success : true });
		}

		// Delete page
		if (action === 'del') {
			const pagesPath = path.join(ROOT, settings.pages, leaf);
			const ok = await removeRecursive(pagesPath);
			return reply.type('application/json').send({ success : ok });
		}

		reply.code(400);
		return reply.type('application/json').send({ error: 'Unknown action' });
	});
}
