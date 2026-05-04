/**
 * Pino logger configuration with mnemonica collection hook integration.
 * Collection-level hooks fire for ALL types in the collection automatically.
 */
import pino from 'pino';
export function createLogger() {
    return pino({
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined
    });
}
export function setupCollectionLogging(collection, log) {
    collection.registerHook('preCreation', (hookData) => {
        const existentInstance = hookData.existentInstance;
        log.info({
            event: 'transform.start',
            TypeName: hookData.TypeName,
            requestId: existentInstance?.requestId
        }, 'starting transformation');
    });
    collection.registerHook('postCreation', (hookData) => {
        const inheritedInstance = hookData.inheritedInstance;
        log.info({
            event: 'transform.end',
            TypeName: hookData.TypeName,
            requestId: inheritedInstance.requestId
        }, 'transformation complete');
    });
    collection.registerHook('creationError', (hookData) => {
        const existentInstance = hookData.existentInstance;
        const error = hookData.error;
        log.error({
            event: 'transform.error',
            TypeName: hookData.TypeName,
            requestId: existentInstance?.requestId,
            error: error.message
        }, 'transformation failed');
    });
}
//# sourceMappingURL=pino-logger.js.map