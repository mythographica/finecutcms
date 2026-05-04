/**
 * Minimal template engine.
 * Syntax:
 *   {{obj.path}}        — property access
 *   {{#if obj.path}}...{{/if}}  — conditional
 *   {{#if !obj.path}}...{{/if}} — negated conditional
 *   {{>helperName}}     — partial include (registered helper)
 */
import type { TemplateContext, HelperFn } from '../types/index.js';

const helpers = new Map<string, HelperFn>();

export function registerHelper (name: string, fn: HelperFn): void {
	helpers.set(name, fn);
}

function get (obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split('.');
	let result: unknown = obj;
	for (const part of parts) {
		if (result == null) return undefined;
		result = (result as Record<string, unknown>)[part];
	}
	return result;
}

export function compile (template: string): (
	ctx: TemplateContext,
	helpersMap: Map<string, HelperFn>,
	getFn: typeof get
) => string {
	const escaped = template
		.replace(/\\/g, '\\\\')
		.replace(/`/g, '\\`')
		.replace(/\$/g, '\\$');

	const code = escaped
		.replace(/\{\{#if\s+!([^}]+)\}\}/g, '\${!get(ctx, \'$1\') ? `')
		.replace(/\{\{#if\s+([^}]+)\}\}/g, '\${get(ctx, \'$1\') ? `')
		.replace(/\{\{\/if\}\}/g, '` : \'\'}')
		.replace(/\{\{>(\w+)\}\}/g, '\${helpers.get(\'$1\')?.(ctx) ?? \'\'}')
		.replace(/\{\{([^}]+)\}\}/g, '\${get(ctx, \'$1\') ?? \'\'}');

	return new Function('ctx', 'helpers', 'get', `return \`${code}\`;`) as (
		ctx: TemplateContext,
		helpersMap: Map<string, HelperFn>,
		getFn: typeof get
	) => string;
}

export async function render (templatePath: string, context: TemplateContext): Promise<string> {
	const { promises: fs } = await import('fs');
	const template = await fs.readFile(templatePath, 'utf-8');
	const fn = compile(template);
	return fn(context, helpers, get);
}
