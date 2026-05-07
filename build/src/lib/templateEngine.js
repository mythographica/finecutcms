const helpers = new Map();
export function registerHelper(name, fn) {
    helpers.set(name, fn);
}
function get(obj, path) {
    const parts = path.split('.');
    let result = obj;
    for (const part of parts) {
        if (result == null)
            return undefined;
        result = result[part];
    }
    return result;
}
export function compile(template) {
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
    return new Function('ctx', 'helpers', 'get', `return \`${code}\`;`);
}
export async function render(templatePath, context) {
    const { promises: fs } = await import('fs');
    let template = await fs.readFile(templatePath, 'utf-8');
    // Pre-resolve helper partials ({{>helperName}}) before compilation.
    // Helpers may be async; the compiled function is synchronous.
    const helperPattern = /\{\{>(\w+)\}\}/g;
    let match;
    const replacements = [];
    while ((match = helperPattern.exec(template)) !== null) {
        const name = match[1];
        const fn = helpers.get(name);
        if (fn) {
            const result = await fn(context);
            replacements.push({ match: match[0], result: String(result ?? '') });
        }
    }
    for (const r of replacements) {
        template = template.replace(r.match, r.result);
    }
    const fn = compile(template);
    return fn(context, helpers, get);
}
//# sourceMappingURL=templateEngine.js.map