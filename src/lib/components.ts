/**
 * Template component helpers.
 * Pure functions that generate HTML fragments from page context.
 */
import path from 'path';
import { promises as fs } from 'fs';
import { fileExists } from './fileUtils.js';
import type { TemplateContext } from '../types/index.js';

const ROOT = process.cwd();

/**
 * Generate meta tags from page info metadata.
 */
export function jsonInfo (ctx: TemplateContext): string {
	const info = ctx.info || {};
	const lines: string[] = [];
	if (info.meta && typeof info.meta === 'object') {
		for (const [key, value] of Object.entries(info.meta as Record<string, string>)) {
			lines.push(`<meta name="${key}" content="${value}">`);
		}
	}
	return lines.join('\n');
}

/**
 * Additional head content placeholder.
 */
export function headAdditional (): string {
	return '';
}

/**
 * Parse page content — returns raw content.
 */
export async function contentParser (ctx: TemplateContext): Promise<string> {
	if (ctx.header?.pageIsCode) {
		return ctx.content || '';
	}
	return ctx.content || '';
}

/**
 * Render main navigation menu.
 */
export async function menuMain (ctx: TemplateContext): Promise<string> {
	const menuFile = path.join(ROOT, 'data', 'menu_main.json');
	if (!await fileExists(menuFile)) return '';

	const raw = await fs.readFile(menuFile, 'utf-8').catch(() => '[]');
	const menu = JSON.parse(raw) as Array<{
		type: string;
		link: string;
		title: string;
		menu?: Array<{ type: string; link: string; title: string }>;
	}>;
	const activeLink = ctx.pagePath?.split('/')[1] || '';

	const items = menu.map((item) => {
		if (item.type !== 'link') return '';
		const isActive = item.link === `/${activeLink}/`;
		if (item.menu) {
			const subItems = item.menu.map((sub) => {
				if (sub.type === 'link') {
					return `<li><a href="${ctx.deep}${sub.link}">${sub.title}</a></li>`;
				}
				if (sub.type === 'divider') return '<li class="divider"></li>';
				if (sub.type === 'header') return `<li class="nav-header">${sub.title}</li>`;
				return '';
			}).join('');
			return `
				<li class="dropdown ${isActive ? 'active' : ''}">
					<a href="#" class="dropdown-toggle" data-toggle="dropdown">${item.title}<b class="caret"></b></a>
					<ul class="dropdown-menu">${subItems}</ul>
				</li>`;
		}
		return `<li class="${isActive ? 'active' : ''}"><a href="${ctx.deep}${item.link}">${item.title}</a></li>`;
	});

	return items.join('');
}

/**
 * Render left sidebar menu.
 */
export async function menuLeft (ctx: TemplateContext): Promise<string> {
	const menuFile = path.join(ROOT, 'data', 'menu_left.json');
	if (!await fileExists(menuFile)) return '';

	const raw = await fs.readFile(menuFile, 'utf-8').catch(() => '[]');
	const menu = JSON.parse(raw) as Array<{
		type: string;
		link: string;
		title: string;
		menu?: Array<{ type: string; link: string; title: string }>;
	}>;
	const activeLink = ctx.pagePath || '/';

	const items = menu.map((item) => {
		if (item.type !== 'link') return '';
		const isActive = item.link === activeLink;
		if (item.menu) {
			const subItems = item.menu.map((sub) => {
				if (sub.type === 'link') {
					const subActive = sub.link === activeLink;
					const href = `${ctx.deep}${sub.link}`;
					const cls = subActive ? 'active' : '';
					return `<li><a href="${href}" class="${cls}">${sub.title}</a></li>`;
				}
				if (sub.type === 'divider') return '<li class="divider"></li>';
				if (sub.type === 'header') return `<li class="header">${sub.title}</li>`;
				return '';
			}).join('');
			return `
				<li><a href="${ctx.deep}${item.link}" class="${isActive ? 'active' : ''}">${item.title}</a>
				<ul>${subItems}</ul></li>`;
		}
		return `<li><a href="${ctx.deep}${item.link}" class="${isActive ? 'active' : ''}">${item.title}</a></li>`;
	});

	return items.join('');
}
