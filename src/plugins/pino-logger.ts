/**
 * Pino logger configuration with mnemonica collection hook integration.
 * Collection-level hooks fire for ALL types in the collection automatically.
 */
import pino from 'pino';
import type { TypesCollection, hooksOpts } from 'mnemonica';

export function createLogger () {
	return pino({
		level : process.env.LOG_LEVEL || 'info',
		transport: process.env.NODE_ENV !== 'production'
			? { target: 'pino-pretty', options: { colorize: true } }
			: undefined
	});
}

export function setupCollectionLogging (collection: TypesCollection, log: ReturnType<typeof createLogger>) {
	collection.registerHook('preCreation', (hookData: hooksOpts) => {
		const existentInstance = hookData.existentInstance as Record<string, unknown> | undefined;
		log.info({
			event    : 'transform.start',
			TypeName : hookData.TypeName,
			requestId: existentInstance?.requestId as string | undefined
		}, 'starting transformation');
	});

	collection.registerHook('postCreation', (hookData: hooksOpts) => {
		const inheritedInstance = hookData.inheritedInstance as Record<string, unknown>;
		log.info({
			event    : 'transform.end',
			TypeName : hookData.TypeName,
			requestId: inheritedInstance.requestId as string | undefined
		}, 'transformation complete');
	});

	collection.registerHook('creationError', (hookData: hooksOpts) => {
		const existentInstance = hookData.existentInstance as Record<string, unknown> | undefined;
		const error = hookData.inheritedInstance as Error;
		log.error({
			event    : 'transform.error',
			TypeName : hookData.TypeName,
			requestId: existentInstance?.requestId as string | undefined,
			error    : error.message
		}, 'transformation failed');
	});
}
