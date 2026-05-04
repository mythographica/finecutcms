/**
 * Engine (admin API) mnemonica type collection.
 */
import { define } from 'mnemonica';
export const EngineRequest = define('EngineRequest', function (req) {
    this.action = req.body.action;
    this.data = req.body.data;
    this.leaf = req.body.leaf;
    this.path = req.body.path;
    this.template = req.body.template;
});
export const TreeResult = EngineRequest.define('TreeResult', function (result) {
    this.tree = result.tree;
});
export const PageResult = EngineRequest.define('PageResult', function (pageData) {
    this.page = pageData;
});
export const CacheResult = EngineRequest.define('CacheResult', function (cleared) {
    this.cleared = cleared;
});
export const TemplateResult = EngineRequest.define('TemplateResult', function (templateData) {
    this.template = templateData;
});
//# sourceMappingURL=engineTypes.js.map