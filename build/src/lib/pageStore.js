/**
 * Page storage operations.
 * Separated from tree_pages.ts to avoid circular dependencies.
 */
import path from 'path';
import { getfiles, setfiles, fileExists } from './fileUtils.js';
export async function getPage(pagePath) {
    const [header, content, info, blocks] = await Promise.all([
        getfiles('header.txt', pagePath),
        getfiles('content.txt', pagePath),
        getfiles('info.txt', pagePath),
        getfiles('blocks.txt', pagePath)
    ]);
    // Defensive: handle double-encoded blocks from legacy corruption
    let blocksContent = blocks || '[]';
    if (blocksContent.startsWith('"') && blocksContent.endsWith('"')) {
        try {
            blocksContent = JSON.parse(blocksContent);
        }
        catch {
            blocksContent = '[]';
        }
    }
    return {
        header: header || '{}',
        content: content || '',
        info: info || '',
        blocks: blocksContent
    };
}
export async function setPage(pagePath, data) {
    let rawHeader = data.header;
    if (typeof rawHeader === 'string') {
        rawHeader = JSON.parse(rawHeader);
    }
    let header = rawHeader;
    const content = data.content || '';
    let rawBlocks = data.blocks;
    if (typeof rawBlocks === 'string') {
        rawBlocks = JSON.parse(rawBlocks);
    }
    const blocks = rawBlocks;
    let infoContent = data.info || '';
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
//# sourceMappingURL=pageStore.js.map