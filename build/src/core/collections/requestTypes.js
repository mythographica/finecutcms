/**
 * Frontend mnemonica type collection.
 * RequestData → RouteData → PageData → RenderData → ResponseData
 */
import { define } from 'mnemonica';
export const RequestData = define('RequestData', function (req) {
    this.method = req.method;
    this.url = req.url;
    this.query = req.query;
    this.params = req.params;
    this.body = req.body;
    this.headers = req.headers;
    this.requestId = req.id;
});
export const RouteData = RequestData.define('RouteData', function (routeInfo) {
    this.pagePath = routeInfo.pagePath;
    this.isMain = routeInfo.isMain;
    this.deep = routeInfo.deep;
});
export const PageData = RouteData.define('PageData', function (pageFiles) {
    this.header = pageFiles.header;
    this.content = pageFiles.content;
    this.info = pageFiles.info;
    this.blocks = pageFiles.blocks;
    this.path = pageFiles.path;
});
export const RenderData = PageData.define('RenderData', function (components) {
    this.components = components;
    this.template = this.header?.template;
});
export const ResponseData = RenderData.define('ResponseData', function (output) {
    this.body = output.body;
    this.contentType = output.contentType;
    this.statusCode = output.statusCode;
    this.fromCache = output.fromCache;
});
//# sourceMappingURL=requestTypes.js.map