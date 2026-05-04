// Generated TypeRegistry for type-safe mnemonica.lookupTyped<TypeRegistry>()
// Import this interface and use with lookupTyped from mnemonica
//
// Usage:
//   import { lookupTyped } from 'mnemonica';
//   import { TypeRegistry } from './.tactica/registry';
//   const Sentience = lookupTyped<TypeRegistry>('Sentience');
//   // TypeScript knows: Sentience is a constructor for SentienceInstance
//   const instance = new Sentience({ purpose: 'AI' });
//   // instance has full intellisense for Consciousness, Memory, etc.

import type {
	RequestData,
	RequestData_RouteData,
	RequestData_RouteData_PageData,
	RequestData_RouteData_PageData_RenderData,
	RequestData_RouteData_PageData_RenderData_ResponseData,
	EngineRequest,
	EngineRequest_TreeResult,
	EngineRequest_PageResult,
	EngineRequest_CacheResult,
	EngineRequest_TemplateResult,
} from './types.js';

/**
 * Type registry augmenting mnemonica's TypeRegistry interface
 * This enables type-safe lookupTyped() without explicit type arguments
 *
 * Usage: const SomeType = lookupTyped('SomeType'); // Fully typed!
 */
declare module 'mnemonica' {
	interface TypeRegistry {
		'RequestData': new (req: { method: string; url: string; query: Record<string, unknown>; params: Record<string, unknown>; body: Record<string, unknown>; headers: Record<string, unknown>; id: string }) => RequestData;
		'RequestData.RouteData': new (routeInfo: { pagePath: string; isMain: boolean; deep: string }) => RequestData_RouteData;
		'RequestData.RouteData.PageData': new (pageFiles: { header: { title: string; template: string; pageIsCode: boolean; keywords: string; description: string; additional: string } | null; content: string; info: Record<string, unknown>; blocks: Array<{ name: string; value: string }>; path: string }) => RequestData_RouteData_PageData;
		'RequestData.RouteData.PageData.RenderData': new (components: Record<string, string | Promise<string>>) => RequestData_RouteData_PageData_RenderData;
		'RequestData.RouteData.PageData.RenderData.ResponseData': new (output: { body: string; contentType: string; statusCode: number; fromCache: boolean }) => RequestData_RouteData_PageData_RenderData_ResponseData;
		'EngineRequest': new (req: { body: Record<string, unknown> }) => EngineRequest;
		'EngineRequest.TreeResult': new (result: { tree: unknown }) => EngineRequest_TreeResult;
		'EngineRequest.PageResult': new (pageData: unknown) => EngineRequest_PageResult;
		'EngineRequest.CacheResult': new (cleared: boolean) => EngineRequest_CacheResult;
		'EngineRequest.TemplateResult': new (templateData: unknown) => EngineRequest_TemplateResult;
	}
}

import type { TypeRegistry } from 'mnemonica';
export type { TypeRegistry };