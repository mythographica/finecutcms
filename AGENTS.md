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

### Pattern 1: Observability (Logging)

```typescript
// src/plugins/pino-logger.ts
collection.registerHook('preCreation', (hookData: hooksOpts) => {
	const parent = hookData.existentInstance as Record<string, unknown> | undefined;
	log.info({
		event     : 'transform.start',
		TypeName  : hookData.TypeName,
		requestId : parent?.requestId as string | undefined
	}, 'starting transformation');
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

### Pattern 3: Metrics (Timing)

```typescript
const timings = new Map<string, number>();

collection.registerHook('preCreation', (hookData: hooksOpts) => {
	timings.set(hookData.TypeName, performance.now());
});

collection.registerHook('postCreation', (hookData: hooksOpts) => {
	const start = timings.get(hookData.TypeName);
	if (start) {
		metrics.histogram('transform.duration', performance.now() - start, {
			TypeName: hookData.TypeName
		});
	}
});
```

### Pattern 4: Validation

```typescript
collection.registerHook('preCreation', (hookData: hooksOpts) => {
	if (hookData.TypeName === 'PageData') {
		const pageFiles = hookData.args[0] as { path?: string };
		if (!pageFiles.path) {
			throw new Error('PageData requires path');
		}
	}
});
```

**Key principle:** Hooks are cross-cutting. Zero business logic references. All behavior is observed from outside.

---

## Quick Reference

| Situation | What to do |
|-----------|-----------|
| Need a typed constructor | `const MyType = lookupTyped('MyType')` |
| Need to chain instances | `new parent.Child({ ... })` — no cast needed |
| About to write `as unknown as` | Stop. Use `lookupTyped` instead |
| Decorating Fastify with constructors | Direct import is fine (`app.decorate('X', X)`) — decoration is runtime-only |
| Need collection hook types | `import type { TypesCollection, hooksOpts } from 'mnemonica'` |
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
