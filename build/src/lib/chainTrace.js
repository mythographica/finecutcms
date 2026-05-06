/**
 * Mnemonica chain tracing utilities.
 * Reconstructs the execution path from any instance in the chain.
 */
import { getProps } from 'mnemonica';
/**
 * Walk up the mnemonica parent chain and collect every step.
 * Returns array from root (RequestData) to leaf (current instance).
 */
export function traceChain(instance) {
    const steps = [];
    function walk(current) {
        const props = getProps(current);
        if (!props)
            return;
        const { __type__: type, __args__: args, __timestamp__: timestamp, __parent__: parent } = props;
        const typeName = type?.TypeName;
        if (!typeName)
            return;
        // Collect enumerable properties (skip internal mnemonica props)
        const properties = {};
        for (const [key, value] of Object.entries(current)) {
            if (!key.startsWith('__') && typeof value !== 'function') {
                properties[key] = value;
            }
        }
        steps.unshift({
            TypeName: typeName,
            timestamp: timestamp || 0,
            args: args || [],
            properties
        });
        if (parent && typeof parent === 'object') {
            walk(parent);
        }
    }
    walk(instance);
    return steps;
}
/**
 * Format chain steps into a human-readable trace string.
 */
export function formatChainTrace(steps) {
    return steps.map((step, i) => {
        const indent = '  '.repeat(i);
        const args = step.args.length > 0
            ? JSON.stringify(step.args[0]).slice(0, 120)
            : '{}';
        return `${indent}${step.TypeName} (${args})`;
    }).join('\n');
}
/**
 * Extract requestId from a chain by looking at the root RequestData step.
 */
export function getRequestId(instance) {
    const steps = traceChain(instance);
    const root = steps[0];
    if (!root)
        return undefined;
    return root.properties.requestId;
}
//# sourceMappingURL=chainTrace.js.map