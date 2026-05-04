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
    const template = await fs.readFile(templatePath, 'utf-8');
    const fn = compile(template);
    return fn(context, helpers, get);
}
//# sourceMappingURL=templateEngine.js.map