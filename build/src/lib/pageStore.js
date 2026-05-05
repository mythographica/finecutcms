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
    return {
        header: header || '{}',
        content: content || '',
        info: info || '',
        blocks: blocks || '[]',
        path: pagePath
    };
}
export async function setPage(pagePath, data) {
    let header = data.header;
    const content = data.content || '';
    const blocks = data.blocks;
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