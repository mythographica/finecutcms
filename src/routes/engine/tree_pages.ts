/**
 * Page tree API — list, create, delete, get, set page content.
 * Ported from _adm/tree_pages.php.
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { FastifyRequest, FastifyReply } from 'fastify';
import '../../core/collections/engineTypes.js';
import { lookupTyped } from 'mnemonica';
import {
	getfiles, setfiles, mkdirp, removeRecursive, paths as resolvePaths, fileExists
} from '../../lib/fileUtils.js';
import type { PageHeader } from '../../types/index.js';

const ROOT = process.cwd();

const EngineRequest = lookupTyped('EngineRequest');

export type rawPageFiles = {
	header  : string;
	content : string;
	info    : string;
	blocks  : string;
	path    : string;
};

type App = {
	get: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
	post: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
};

export async function getPage (pagePath: string): Promise<rawPageFiles> {
	const [header, content, info, blocks] = await Promise.all([
		getfiles('header.txt', pagePath),
		getfiles('content.txt', pagePath),
		getfiles('info.txt', pagePath),
		getfiles('blocks.txt', pagePath)
	]);

	return {
		header: header || '{}',
		content: content || '',
		info: info || '',
		blocks: blocks || '[]',
		path: pagePath
	};
}

export async function setPage (pagePath: string, data: Record<string, unknown>): Promise<rawPageFiles> {
	let header = data.header as PageHeader | undefined;
	const content = (data.content as string) || '';
	const blocks = data.blocks as Array<{ name: string; value: string }> | undefined;

	let infoContent = (data.info as string) || '';
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
			header = headerRaw ? JSON.parse(headerRaw) as PageHeader : header;
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

export default async function (app: App): Promise<void> {

	app.get('/engine/tree', async (req: FastifyRequest, reply: FastifyReply) => {
		const query = req.query as Record<string, unknown>;
		const leaf = String(query.leaf || '');
		const pagesPath = resolvePaths(leaf);

		const entries = await fs.readdir(pagesPath, { withFileTypes: true });
		const tree = entries
			.filter(e => e.isDirectory())
			.map(e => {
				return { name : e.name };
			});

		const engineRequest = new EngineRequest({
			body: { action: 'get', leaf } as Record<string, unknown>
		});
		const treeResult = new engineRequest.TreeResult({ tree });

		return reply.type('application/json').send(treeResult.tree);
	});

	app.get('/engine/page', async (req: FastifyRequest, reply: FastifyReply) => {
		const query = req.query as Record<string, unknown>;
		const leaf = String(query.leaf || '');
		const pagePath = resolvePaths(leaf);

		if (!await fileExists(pagePath)) {
			reply.code(404);
			return reply.type('application/json').send({ error: 'Page not found' });
		}

		const page = await getPage(pagePath);
		const engineRequest = new EngineRequest({
			body: { action: 'content_get', leaf } as Record<string, unknown>
		});
		const pageResult = new engineRequest.PageResult(page);

		return reply.type('application/json').send({ page: pageResult.page, status : true });
	});

	app.post('/engine/tree', async (req: FastifyRequest, reply: FastifyReply) => {
		const body = req.body as Record<string, unknown>;
		const action = String(body.action || '');
		const leaf = String(body.leaf || '');
		const pageName = String(body.path || '');
		const data = body.data as Record<string, unknown> | undefined;

		const engineRequest = new EngineRequest({
			body: req.body as Record<string, unknown>
		});

		if (action === 'get') {
			const pagesPath = resolvePaths(leaf);
			const entries = await fs.readdir(pagesPath, { withFileTypes: true });
			const tree = entries
				.filter(e => e.isDirectory())
				.map(e => ({ name : e.name }));
			const treeResult = new engineRequest.TreeResult({ tree });
			return reply.type('application/json').send(treeResult.tree);
		}

		if (action === 'set') {
			const target = path.join(ROOT, 'data/pages', leaf, pageName);
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

		if (action === 'mkdir') {
			const target = path.join(ROOT, 'data/pages', leaf, pageName);
			await mkdirp(target);
			return reply.type('application/json').send({ status : true });
		}

		if (action === 'del') {
			const target = path.join(ROOT, 'data/pages', leaf, pageName);
			const ok = await removeRecursive(target);
			return reply.type('application/json').send({ success : ok });
		}

		if (action === 'content_get') {
			const target = resolvePaths(leaf);
			const page = await getPage(target);
			const pageResult = new engineRequest.PageResult(page);
			return reply.type('application/json').send({ page: pageResult.page, status : true });
		}

		if (action === 'content_set') {
			if (!data) {
				reply.code(400);
				return reply.type('application/json').send({ error: 'Missing data' });
			}
			const target = resolvePaths(leaf);
			const page = await setPage(target, data);
			const pageResult = new engineRequest.PageResult(page);
			return reply.type('application/json').send({ page: pageResult.page, status : true });
		}

		reply.code(400);
		return reply.type('application/json').send({ error: 'Unknown action' });
	});
}
