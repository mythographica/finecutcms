/**
 * Admin utility API — clear static cache, page CRUD.
 * Ported from _adm/api.php + page operations from tree_pages.php.
 */
import path from 'path';
import type { FastifyRequest, FastifyReply } from 'fastify';
import '../../core/collections/engineTypes.js';
import { lookupTyped } from 'mnemonica';
import { settings } from '../../core/settings.js';
import { removeRecursive, fileExists, mkdirp, setfiles, getfiles } from '../../lib/fileUtils.js';
import type { PageFiles, PageHeader } from '../../types/index.js';

const ROOT = process.cwd();

const EngineRequest = lookupTyped('EngineRequest');

type BlockItem = { name: string; value: string };

type App = {
	get: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
	post: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
};

async function getPage (pagePath: string): Promise<PageFiles> {
	const [headerRaw, content, infoRaw, blocksRaw] = await Promise.all([
		getfiles('header.txt', pagePath),
		getfiles('content.txt', pagePath),
		getfiles('info.txt', pagePath),
		getfiles('blocks.txt', pagePath)
	]);

	const header: PageHeader | null = headerRaw
		? JSON.parse(headerRaw) as PageHeader
		: null;
	const info: Record<string, unknown> = infoRaw
		? JSON.parse(infoRaw) as Record<string, unknown>
		: {};
	const blocks: BlockItem[] = blocksRaw
		? JSON.parse(blocksRaw) as BlockItem[]
		: [];

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
