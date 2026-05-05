/**
 * Shared engine action handlers.
 * Extracted from api.ts and tree_pages.ts to eliminate duplication.
 */
import path from 'path';
import { settings } from '../core/settings.js';
import { removeRecursive, fileExists, mkdirp } from './fileUtils.js';
import { getPage, setPage } from './pageStore.js';
const ROOT = process.cwd();
export async function handleContentGet(leaf) {
    const pagesPath = path.join(ROOT, settings.pages, leaf);
    if (!await fileExists(pagesPath)) {
        throw new Error('404:Page not found');
    }
    const page = await getPage(pagesPath);
    return { page, status: true };
}
export async function handleContentSet(leaf, data) {
    const target = path.join(ROOT, settings.pages, leaf);
    const page = await setPage(target, data);
    return { page, status: true };
}
export async function handleSet(leaf, pageName, data) {
    const target = path.join(ROOT, 'data/pages', leaf, pageName);
    if (await fileExists(target)) {
        throw new Error('409:Page already exists');
    }
    await mkdirp(target);
    if (data) {
        await setPage(target, data);
    }
    return { status: true };
}
export async function handleMkdir(leaf, pageName) {
    const target = path.join(ROOT, 'data/pages', leaf, pageName);
    await mkdirp(target);
    return { status: true };
}
export async function handleDel(leaf, pageName) {
    const target = path.join(ROOT, 'data/pages', leaf, pageName);
    const ok = await removeRecursive(target);
    return { success: ok };
}
//# sourceMappingURL=engineActions.js.map