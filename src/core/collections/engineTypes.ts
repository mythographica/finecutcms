/**
 * Engine (admin API) mnemonica type collection.
 */
import { define } from 'mnemonica';

export const EngineRequest = define('EngineRequest', function (
	this: {
		action: unknown;
		data: unknown;
		leaf: unknown;
		path: unknown;
		template: unknown;
	},
	req: { body: Record<string, unknown> }
) {
	this.action = req.body.action;
	this.data = req.body.data;
	this.leaf = req.body.leaf;
	this.path = req.body.path;
	this.template = req.body.template;
});

export const TreeResult = EngineRequest.define('TreeResult', function (
	this: { tree: unknown },
	result: { tree: unknown }
) {
	this.tree = result.tree;
});

export const PageResult = EngineRequest.define('PageResult', function (
	this: { page: unknown },
	pageData: unknown
) {
	this.page = pageData;
});

export const CacheResult = EngineRequest.define('CacheResult', function (
	this: { cleared: boolean },
	cleared: boolean
) {
	this.cleared = cleared;
});

export const TemplateResult = EngineRequest.define('TemplateResult', function (
	this: { template: unknown },
	templateData: unknown
) {
	this.template = templateData;
});
