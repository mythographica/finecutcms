/**
 * Settings API — read/update application settings.
 * Persists to data/settings.json, merges with runtime defaults on read.
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { EngineRequest } from '../../core/collections/engineTypes.js';
import { settings } from '../../core/settings.js';
import type { Settings } from '../../types/index.js';

const ROOT = process.cwd();
const SETTINGS_PATH = path.join(ROOT, 'data', 'settings.json');

type MnemInstance = Record<string, unknown>;
type MnemCtor = new (...args: unknown[]) => MnemInstance;

async function loadSettings (): Promise<Settings> {
	try {
		const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
		return { ...settings, ...JSON.parse(raw) } as Settings;
	} catch {
		return settings;
	}
}

async function saveSettings (partial: Partial<Settings>): Promise<Settings> {
	const merged = { ...settings, ...partial };
	await fs.writeFile(SETTINGS_PATH, JSON.stringify(merged, null, '\t'), 'utf-8');
	return merged as Settings;
}

export default async function (app: { get: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void; post: (p: string, h: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) => void }): Promise<void> {

	app.get('/engine/settings', async (_req: FastifyRequest, reply: FastifyReply) => {
		const current = await loadSettings();
		return reply.type('application/json').send(current);
	});

	app.post('/engine/settings', async (req: FastifyRequest, reply: FastifyReply) => {
		const engineRequest = new (EngineRequest as MnemCtor)({ body: req.body }) as MnemInstance;
		const data = engineRequest.data as Partial<Settings> | undefined;

		if (!data) {
			reply.code(400);
			return reply.type('application/json').send({ error: 'Missing data field' });
		}

		const updated = await saveSettings(data);
		return reply.type('application/json').send(updated);
	});
}
