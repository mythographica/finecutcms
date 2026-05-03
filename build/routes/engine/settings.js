/**
 * Settings API — read/update application settings.
 * Persists to data/settings.json, merges with runtime defaults on read.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { EngineRequest } from '../../core/collections/engineTypes.js';
import { settings } from '../../core/settings.js';
const ROOT = process.cwd();
const SETTINGS_PATH = path.join(ROOT, 'data', 'settings.json');
async function loadSettings() {
    try {
        const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
        return { ...settings, ...JSON.parse(raw) };
    }
    catch {
        return settings;
    }
}
async function saveSettings(partial) {
    const merged = { ...settings, ...partial };
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(merged, null, '\t'), 'utf-8');
    return merged;
}
export default async function (app) {
    app.get('/engine/settings', async (_req, reply) => {
        const current = await loadSettings();
        return reply.type('application/json').send(current);
    });
    app.post('/engine/settings', async (req, reply) => {
        const engineRequest = new EngineRequest({ body: req.body });
        const data = engineRequest.data;
        if (!data) {
            reply.code(400);
            return reply.type('application/json').send({ error: 'Missing data field' });
        }
        const updated = await saveSettings(data);
        return reply.type('application/json').send(updated);
    });
}
//# sourceMappingURL=settings.js.map