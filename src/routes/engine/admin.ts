/**
 * Admin panel route — elFinder backend + redirect to static admin page.
 */
import path from 'path';
import { promises as fs } from 'fs';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { mkdirp, removeRecursive } from '../../lib/fileUtils.js';

const ROOT = process.cwd();

async function buildFileInfo (
	filePath: string, rootPath: string
): Promise<Record<string, unknown>> {
	const stats = await fs.stat(filePath).catch(() => null);
	if (!stats) {
		return { error: 'File not found' };
	}

	const name = path.basename(filePath);
	const isDir = stats.isDirectory();
	const relativePath = path.relative(rootPath, filePath);
	const hash = Buffer.from(relativePath || '.').toString('base64')
		.replace(/[^a-zA-Z0-9]/g, '');

	return {
		name,
		hash,
		mime : isDir ? 'directory' : 'application/octet-stream',
		ts   : Math.floor(stats.mtime.getTime() / 1000),
		size : isDir ? 0 : stats.size,
		read : true,
		write: true,
		locked: false
	};
}

async function listDir (
	dirPath: string, rootPath: string
): Promise<Record<string, unknown>[]> {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const result: Record<string, unknown>[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		const info = await buildFileInfo(fullPath, rootPath);
		result.push(info);
	}

	return result;
}

async function copyDir (src: string, dest: string): Promise<void> {
	await mkdirp(dest);
	const entries = await fs.readdir(src, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			await copyDir(srcPath, destPath);
		} else {
			await fs.copyFile(srcPath, destPath);
		}
	}
}

async function handleElfinder (
	req: FastifyRequest, reply: FastifyReply
): Promise<unknown> {
	const query = req.query as Record<string, string>;
	const body = (req.body || {}) as Record<string, unknown>;
	const cmd = query.cmd || (body.cmd as string);
	const target = query.target || (body.target as string);
	const filesPath = path.join(ROOT, 'data', 'files');
	await mkdirp(filesPath);

	const resolvePath = (hash: string): string => {
		return path.join(
			filesPath,
			Buffer.from(hash, 'base64').toString('utf-8')
		);
	};

	if (cmd === 'open') {
		const dirPath = target ? resolvePath(target) : filesPath;
		const cwd = await buildFileInfo(dirPath, filesPath);
		const files = await listDir(dirPath, filesPath);
		return reply.type('application/json').send({ cwd, files });
	}

	if (cmd === 'mkdir') {
		const name = String(query.name || body.name || '');
		const dirPath = target ? resolvePath(target) : filesPath;
		const newDir = path.join(dirPath, name);
		await mkdirp(newDir);
		const added = await buildFileInfo(newDir, filesPath);
		return reply.type('application/json').send({ added: [added] });
	}

	if (cmd === 'mkfile') {
		const name = String(query.name || body.name || '');
		const dirPath = target ? resolvePath(target) : filesPath;
		const newFile = path.join(dirPath, name);
		await fs.writeFile(newFile, '', 'utf-8');
		const added = await buildFileInfo(newFile, filesPath);
		return reply.type('application/json').send({ added: [added] });
	}

	if (cmd === 'rm') {
		const targets = (query.targets || body.targets || []) as string[];
		const removed: string[] = [];
		for (const t of targets) {
			const filePath = resolvePath(t);
			await removeRecursive(filePath);
			removed.push(t);
		}
		return reply.type('application/json').send({ removed });
	}

	if (cmd === 'ls') {
		const dirPath = target ? resolvePath(target) : filesPath;
		const entries = await fs.readdir(dirPath, { withFileTypes: true });
		const list = entries.map(e => e.name);
		return reply.type('application/json').send({ list });
	}

	if (cmd === 'tree') {
		const dirPath = target ? resolvePath(target) : filesPath;
		const tree = await listDir(dirPath, filesPath);
		return reply.type('application/json').send({ tree });
	}

	if (cmd === 'get') {
		const filePath = resolvePath(target);
		const content = await fs.readFile(filePath, 'utf-8').catch(() => '');
		return reply.type('application/json').send({ content });
	}

	if (cmd === 'put') {
		const filePath = resolvePath(target);
		const content = String(query.content || body.content || '');
		await fs.writeFile(filePath, content, 'utf-8');
		const changed = await buildFileInfo(filePath, filesPath);
		return reply.type('application/json').send({ changed: [changed] });
	}

	if (cmd === 'rename') {
		const name = String(query.name || body.name || '');
		const filePath = resolvePath(target);
		const dirPath = path.dirname(filePath);
		const newPath = path.join(dirPath, name);
		await fs.rename(filePath, newPath);
		const added = await buildFileInfo(newPath, filesPath);
		return reply.type('application/json').send({
			added: [added], removed: [target]
		});
	}

	if (cmd === 'paste') {
		const src = String(query.src || body.src || '');
		const dst = String(query.dst || body.dst || '');
		const cut = Number(query.cut || body.cut || 0);
		const srcPath = resolvePath(src);
		const dstPath = resolvePath(dst);
		const name = path.basename(srcPath);
		const destFile = path.join(dstPath, name);

		if (cut) {
			await fs.rename(srcPath, destFile);
		} else {
			const stat = await fs.stat(srcPath);
			if (stat.isDirectory()) {
				await copyDir(srcPath, destFile);
			} else {
				await fs.copyFile(srcPath, destFile);
			}
		}
		const added = await buildFileInfo(destFile, filesPath);
		return reply.type('application/json').send({
			added: [added], removed: cut ? [src] : []
		});
	}

	if (cmd === 'upload') {
		return reply.type('application/json').send({ added: [] });
	}

	return reply.type('application/json').send({ error: ['Unknown command'] });
}

type AdminApp = {
	get: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
	post: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void;
};

export default async function (app: AdminApp): Promise<void> {

	// Redirect /engine/admin to the static admin page
	app.get('/engine/admin', async (_req: FastifyRequest, reply: FastifyReply) => {
		return reply.redirect('/admin/admin.html');
	});

	// elFinder connector
	app.get('/engine/elfinder', handleElfinder);
	app.post('/engine/elfinder', handleElfinder);
}
