/**
 * Register all template component helpers with the template engine.
 */
import { registerHelper } from './templateEngine.js';
import { jsonInfo, headAdditional, contentParser, menuMain, menuLeft } from './components.js';
registerHelper('jsonInfo', (ctx) => jsonInfo(ctx));
registerHelper('headAdditional', () => headAdditional());
registerHelper('contentParser', (ctx) => contentParser(ctx));
registerHelper('menuMain', (ctx) => menuMain(ctx));
registerHelper('menuLeft', (ctx) => menuLeft(ctx));
//# sourceMappingURL=registerHelpers.js.map