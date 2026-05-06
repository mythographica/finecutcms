# Agent Instructions — FineCut CMS + mnemonica + tactica

> **Trust this document.** Every word below was learned the hard way.
> If you ignore these instructions, you will write unnecessary casts, break type safety, and waste time.

---

## 0. You Have Mnemonica Defined Constructors

In `src/core/collections/`, types are defined with `define()`:

```typescript
// src/core/collections/requestTypes.ts
export const RequestData = define('RequestData', function (
	this: { method: string; url: string; ... },
	req: { method: string; url: string; ... }
) {
	Object.assign(this, req);
});

export const RouteData = RequestData.define('RouteData', function (
	this: { pagePath: string; isMain: boolean; deep: string },
	routeInfo: RouteInfo
) {
	Object.assign(this, routeInfo);
});
```

At runtime, these are **constructor functions**. They live in mnemonica's default types collection.

---

## 1. Tactica Makes the `.tactica` Directory

Run `npm run tactica` (or `npx tactica --esm --verbose`). It scans the `define()` calls and generates:

- `.tactica/types.ts` — instance types (`RequestData`, `RequestData_RouteData`, etc.)
- `.tactica/registry.ts` — `TypeRegistry` augmentation for `mnemonica`

The registry file contains:

```typescript
declare module 'mnemonica' {
	interface TypeRegistry {
		'RequestData': new (...args: unknown[]) => RequestData;
		'RequestData_RouteData': new (...args: unknown[]) => RequestData_RouteData;
		// ... every type in the chain
	}
}
```

**This augmentation is real.** TypeScript sees it. It merges into the `mnemonica` module.

---

## 2. You Use `lookupTyped` for These Constructors

**NEVER** do this:

```typescript
// ❌ WRONG — bypasses the TypeRegistry
import { RequestData } from './collections/requestTypes.js';
const requestData = new RequestData({ ... }) as unknown as RequestDataT;
```

**ALWAYS** do this:

```typescript
// ✅ CORRECT — uses the TypeRegistry
import { lookupTyped } from 'mnemonica';

const RequestData = lookupTyped('RequestData');
const requestData = new RequestData({ ... });
```

`lookupTyped('RequestData')` returns a constructor typed through the augmented `TypeRegistry`. TypeScript knows:
- The constructor's argument shape
- That the instance has `.RouteData`, `.PageData`, `.RenderData`, etc.

**No casts. No `as unknown as`. No workarounds.**

---

## 3. You Trust It Works

Three facts to internalize:

### Fact 1: `lookupTyped` works at module level

You do **not** need to call it inside route handlers. Call it once at the top of the file:

```typescript
const RequestData = lookupTyped('RequestData');

app.get('/test', async (_req, reply) => {
	const requestData = new RequestData({ ... });
	const routeData = new requestData.RouteData({ ... });
});
```

It is a runtime lookup. The returned constructor is the same object every time.

### Fact 2: The runtime constructor is identical

These two lines return the **exact same object** at runtime:

```typescript
import { RequestData } from './collections/requestTypes.js'; // direct import
const RequestData2 = lookupTyped('RequestData');              // typed lookup
// RequestData === RequestData2  →  true
```

The difference is **purely TypeScript compile-time type information**. Direct import gives an untyped constructor. `lookupTyped` gives the typed one.

### Fact 3: Direct imports require casts because they are untyped

When you import directly from `./collections/requestTypes.js`, TypeScript sees the raw `define()` return type. It does **not** know about the `.RouteData` sub-constructor or the instance shape.

When you use `lookupTyped`, TypeScript reads the `TypeRegistry` augmentation and knows everything.

---

## 4. The Epiphany

The pattern is:

```
define() in collections
    ↓
tactica generates .tactica/types.ts + registry.ts
    ↓
lookupTyped() retrieves typed constructors at module level
    ↓
new instance.SubType({ ... }) chains naturally, fully typed, zero casts
```

If you find yourself writing `as unknown as` with mnemonica instance types, **you have taken a wrong turn**. Stop. Use `lookupTyped`. Trust the registry. The types are real.

---

## 5. Hook Patterns

Mnemonica collection hooks fire for **every type in the collection**. Three hooks exist:

- `preCreation` — fires before a new instance is created
- `postCreation` — fires after a new instance is created
- `creationError` — fires when creation throws an error

Hook callbacks are typed through `hooksOpts` from mnemonica:

```typescript
import type { hooksOpts, TypesCollection } from 'mnemonica';

function setupHooks (collection: TypesCollection) {
	collection.registerHook('postCreation', (hookData: hooksOpts) => {
		// hookData.TypeName is string | undefined
		// hookData.inheritedInstance is object
		// hookData.args is unknown[]
	});
}
```

### Pattern 1: Observability (Logging with Chain Tracing)

```typescript
// src/plugins/pino-logger.ts
import { traceChain, formatChainTrace } from '../lib/chainTrace.js';

collection.registerHook('preCreation', (hookData: hooksOpts) => {
	const parent = hookData.existentInstance as Record<string, unknown> | undefined;
	log.info({
		event     : 'transform.start',
		TypeName  : hookData.TypeName,
		requestId : parent?.requestId as string | undefined,
		args      : hookData.args.length > 0
			? JSON.stringify(hookData.args[0]).slice(0, 200)
			: undefined
	}, 'starting transformation');
});

collection.registerHook('creationError', (hookData: hooksOpts) => {
	const error = hookData.inheritedInstance instanceof Error
		? hookData.inheritedInstance
		: new Error('Unknown creation error');

	// Reconstruct the full execution chain up to the failure point
	const chainSteps = traceChain(hookData.existentInstance);
	const chainTrace = formatChainTrace(chainSteps);

	log.error({
		event      : 'transform.error',
		TypeName   : hookData.TypeName,
		chainDepth : chainSteps.length,
		error      : error.message,
		chainTrace : chainTrace.split('\n')
	}, `transformation failed at step ${chainSteps.length}`);
});
```

### Pattern 2: Side Effects (Caching)

```typescript
// src/core/server.ts
collection.registerHook('postCreation', (hookData: hooksOpts) => {
	if (hookData.TypeName === 'ResponseData') {
		const instance = hookData.inheritedInstance as Record<string, unknown>;
		if (!instance.fromCache && instance.statusCode === 200) {
			writeStaticCache(instance.pagePath as string, instance.body as string);
		}
	}
});
```

### Pattern 3: Metrics (Request-Scoped Timing)

```typescript
const timings = new Map<string, number>();

collection.registerHook('preCreation', (hookData: hooksOpts) => {
	const parent = hookData.existentInstance as Record<string, unknown> | undefined;
	const requestId = parent?.requestId as string | undefined;
	if (requestId && hookData.TypeName === 'RequestData') {
		timings.set(requestId, performance.now());
	}
});

collection.registerHook('postCreation', (hookData: hooksOpts) => {
	const instance = hookData.inheritedInstance as Record<string, unknown>;
	const requestId = instance.requestId as string | undefined;
	if (requestId && hookData.TypeName === 'ResponseData') {
		const start = timings.get(requestId);
		if (start) {
			const duration = Math.round(performance.now() - start);
			timings.delete(requestId);
			metrics.histogram('request.duration', duration, { requestId });
		}
	}
});
```

### Pattern 4: Validation

**preCreation — prevent creation by throwing:**

```typescript
// Throwing in preCreation aborts construction and fires creationError
collection.registerHook('preCreation', (hookData: hooksOpts) => {
	if (hookData.TypeName === 'PageData') {
		const pageFiles = hookData.args[0] as { path?: string };
		if (!pageFiles.path) {
			throw new Error('PageData requires path');
		}
	}
});
```

**Hook interception — return `true` from creationError to prevent throwing:**

```typescript
// If creationError returns true, the errored instance is returned
// instead of thrown. Useful for error recovery or testing.
collection.registerHook('creationError', (hookData: hooksOpts) => {
	const error = hookData.inheritedInstance as Error;
	log.error({ TypeName: hookData.TypeName, msg: error.message });
	return true; // intercept: do not throw
});
```

### Pattern 5: Chain Tracing

Mnemonica stores parent references in `__parent__`. You can walk the entire chain:

```typescript
import { getProps } from 'mnemonica';

function traceChain(instance: object): Array<{ TypeName: string; args: unknown[] }> {
	const steps = [];
	function walk(current: object) {
		const props = getProps(current);
		if (!props) return;
		const { __type__: type, __args__: args, __parent__: parent } = props;
		steps.unshift({ TypeName: type.TypeName, args });
		if (parent && typeof parent === 'object') walk(parent);
	}
	walk(instance);
	return steps;
}
```

This reconstructs: `RequestData → RouteData → PageData → RenderData → ResponseData` with their constructor arguments.

**TypeName maps to TypeRegistry.** In hooks, `hookData.TypeName` is the constructor name (e.g. `'ResponseData'`). The full registry key is `'RequestData.RouteData.PageData.RenderData.ResponseData'`. Use `lookupTyped(TypeName)` to retrieve the typed constructor if needed. The `inheritedInstance` shape corresponds to the type from `.tactica/types.ts`.

### Pattern 6: Instance Introspection (`parse()`)

Mnemonica instances expose `.parse()` for structural inspection:

```typescript
const parsed = responseData.parse();
// parsed.name   → 'ResponseData'
// parsed.props  → own properties { body, contentType, statusCode, fromCache }
// parsed.joint  → prototype properties (inherited from RenderData)
// parsed.parent → parent prototype (RenderData instance)
// parsed.self   → the instance itself
```

Use this for debugging chain state or logging instance structure without manual `getProps` calls.

### Pattern 7: Exception Enrichment (`exception()`)

Mnemonica instances expose `.exception()` as a bound constructor. Call it with `new` to create an enriched error that carries the full instance lifecycle:

```typescript
// Inside a route handler
try {
	const pageData = new routeData.PageData(pageFiles);
} catch (err) {
	// enrichedError is instanceof Error AND instanceof the mnemonica type
	// It carries:
	// - originalError: the caught error
	// - instance: the mnemonica instance where exception() was called
	// - extract(): function to dump instance properties
	// - parse(): function to get instance structure
	// - stack: merged lifecycle trace + constructor definitions stack
	const enrichedError = new routeData.exception(err as Error);
	logger.error(enrichedError);
}
```

The first argument must be `instanceof Error`. Additional arguments are stored on `.args`.

**Key principle:** Hooks are cross-cutting. Zero business logic references. All behavior is observed from outside. Errors carry their full construction context.

---

## Quick Reference

| Situation | What to do |
|-----------|-----------|
| Need a typed constructor | `const MyType = lookupTyped('MyType')` |
| Need to chain instances | `new parent.Child({ ... })` — no cast needed |
| About to write `as unknown as` | Stop. Use `lookupTyped` instead |
| Decorating Fastify with constructors | Direct import is fine (`app.decorate('X', X)`) — decoration is runtime-only |
| Need collection hook types | `import type { TypesCollection, hooksOpts } from 'mnemonica'` |
| Need instance structure | `instance.parse()` — { name, props, joint, parent, self } |
| Need to trace instance chain | `import { getProps } from 'mnemonica'` → walk `__parent__` |
| Need to enrich errors | `new instance.exception(originalError)` — lifecycle traces + parse() |
| Need typed constructor from hook | `lookupTyped(hookData.TypeName as string)` |
| Type not found | Run `npm run tactica` to regenerate `.tactica/` |

---

## Build Verification

After any change involving mnemonica types:

```bash
npm run tactica      # regenerate .tactica/
npx tsc --noEmit     # verify zero TypeScript errors
npx eslint src/      # verify zero lint errors
npx vitest run       # verify all tests pass
```
