/**
 * Page storage operations.
 * Separated from tree_pages.ts to avoid circular dependencies.
 */
import path from 'path';
import { getfiles, setfiles, fileExists } from './fileUtils.js';
import type { PageHeader } from '../types/index.js';

export type rawPageFiles = {
	header  : string;
	content : string;
	info    : string;
	blocks  : string;
	path    : string;
};

export async function getPage (pagePath: string): Promise<rawPageFiles> {
	const [header, content, info, blocks] = await Promise.all([
		getfiles('header.txt', pagePath),
		getfiles('content.txt', pagePath),
		getfiles('info.txt', pagePath),
		getfiles('blocks.txt', pagePath)
	]);

	return {
		header : header || '{}',
		content: content || '',
		info   : info || '',
		blocks : blocks || '[]',
		path   : pagePath
	};
}

export async function setPage (
	pagePath: string, data: Record<string, unknown>
): Promise<rawPageFiles> {
	let header = data.header as PageHeader | undefined;
	const content = (data.content as string) || '';
	const blocks = data.blocks as Array<{ name: string; value: string }> | undefined;

	let infoContent = (data.info as string) || '';
	const isEmpty = !infoContent;

	const ROOT = process.cwd();

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
