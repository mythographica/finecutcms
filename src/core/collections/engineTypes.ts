/**
 * Engine (admin API) mnemonica type collection.
 */
import { createTypesCollection } from 'mnemonica';

export const engineTypes: unknown = createTypesCollection({ strictChain : true });

type DefineFn = (name: string, handler: (...args: unknown[]) => void) => unknown;

export const EngineRequest: unknown = (engineTypes as { define: DefineFn }).define('EngineRequest', function (this: Record<string, unknown>, req: { body: Record<string, unknown> }) {
	this.action = req.body.action;
	this.data = req.body.data;
	this.leaf = req.body.leaf;
	this.path = req.body.path;
	this.template = req.body.template;
} as (...args: unknown[]) => void);

export const TreeResult: unknown = (EngineRequest as { define: DefineFn }).define('TreeResult', function (this: Record<string, unknown>, result: { tree: unknown }) {
	this.tree = result.tree;
} as (...args: unknown[]) => void);

export const PageResult: unknown = (EngineRequest as { define: DefineFn }).define('PageResult', function (this: Record<string, unknown>, pageData: unknown) {
	this.page = pageData;
} as (...args: unknown[]) => void);

export const CacheResult: unknown = (EngineRequest as { define: DefineFn }).define('CacheResult', function (this: Record<string, unknown>, cleared: boolean) {
	this.cleared = cleared;
} as (...args: unknown[]) => void);

export const TemplateResult: unknown = (EngineRequest as { define: DefineFn }).define('TemplateResult', function (this: Record<string, unknown>, templateData: unknown) {
	this.template = templateData;
} as (...args: unknown[]) => void);
