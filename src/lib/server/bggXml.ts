// BGG's XML API returns small, regular documents, so a few patterns read them without an XML
// library. Only the fields we use are parsed.
import type { BggSearchHit, BggThing } from '#lib/games.js';

/** Each `<item …>…</item>` with its attributes and inner XML. */
function items(xml: string) {
	return [...xml.matchAll(/<item\s([^>]*)>([\s\S]*?)<\/item>/g)].map(([, attrs, body]) => ({
		type: attr(attrs, 'type'),
		id: Number(attr(attrs, 'id')),
		body
	}));
}

function attr(attrs: string, name: string): string | null {
	const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
	return match ? decode(match[1]) : null;
}

/** `value` of the first `<tag … />` whose attributes match `where`. */
function tagValue(body: string, tag: string, where = ''): string | null {
	for (const [, attrs] of body.matchAll(new RegExp(`<${tag}\\s([^>]*?)/?>`, 'g'))) {
		if (attrs.includes(where)) return attr(attrs, 'value');
	}
	return null;
}

function text(body: string, tag: string): string | null {
	const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(body);
	return match ? decode(match[1].trim()) : null;
}

function decode(value: string): string {
	return value
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

function year(body: string): number | null {
	const value = Number(tagValue(body, 'yearpublished'));
	return value > 0 ? value : null;
}

/** `/xmlapi2/search?type=boardgame`: base games only, no expansions. */
export function parseSearch(xml: string): BggSearchHit[] {
	return items(xml)
		.filter((item) => item.type === 'boardgame' && item.id > 0)
		.map((item) => ({
			id: item.id,
			name: tagValue(item.body, 'name') ?? '',
			year: year(item.body)
		}));
}

/** `/xmlapi2/thing?id=…&stats=1` */
export function parseThings(xml: string): BggThing[] {
	return items(xml)
		.filter((item) => item.id > 0)
		.map((item) => ({
			id: item.id,
			name: tagValue(item.body, 'name', 'type="primary"') ?? '',
			year: year(item.body),
			image: text(item.body, 'image'),
			thumbnail: text(item.body, 'thumbnail'),
			ratings: Number(tagValue(item.body, 'usersrated')) || 0
		}));
}

