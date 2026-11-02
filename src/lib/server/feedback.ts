import { GITHUB_REPO, GITHUB_TOKEN } from '$app/env/private';

/** The suggestion box needs a GitHub token; without one its link is hidden. */
export const feedbackEnabled = Boolean(GITHUB_TOKEN);

export const FEEDBACK_KINDS = {
	bug: { word: 'Bug', label: 'bug' },
	idea: { word: 'Idea', label: 'enhancement' }
} as const;
export type FeedbackKind = keyof typeof FEEDBACK_KINDS;

const FROM_APP_LABEL = 'from-the-app';
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 5000;

export class FeedbackError extends Error {}

export type Feedback = {
	kind: FeedbackKind;
	title: string;
	description: string;
	from: string;
	userAgent: string | null;
};

/** Checks the form; returns the friendly error to show, or the cleaned-up fields. */
export function validateFeedback(form: FormData): { error: string } | Omit<Feedback, 'from' | 'userAgent'> {
	const kind = form.get('kind');
	if (kind !== 'bug' && kind !== 'idea') return { error: 'Is it a bug or an idea?' };
	const title = String(form.get('title') ?? '').trim();
	if (title.length < 3) return { error: 'Give it a short title' };
	if (title.length > TITLE_MAX) return { error: `Keep the title under ${TITLE_MAX} characters` };
	const description = String(form.get('description') ?? '').trim();
	if (!description) return { error: 'Tell us a bit more' };
	if (description.length > DESCRIPTION_MAX) return { error: 'That description is too long' };
	return { kind, title, description };
}

// The repo is public: keep free text from pinging GitHub users.
const defang = (s: string) => s.replaceAll('@', '@​');

function issueBody(f: Feedback): string {
	const lines = [`**From:** ${defang(f.from)}`];
	if (f.userAgent) lines.push(`**Browser:** ${defang(f.userAgent.slice(0, 300))}`);
	lines.push('', defang(f.description));
	return lines.join('\n');
}

async function github(method: string, path: string, body: unknown): Promise<Response> {
	try {
		return await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
			method,
			headers: {
				authorization: `Bearer ${GITHUB_TOKEN}`,
				accept: 'application/vnd.github+json',
				'x-github-api-version': '2022-11-28',
				'content-type': 'application/json',
				'user-agent': 'boardgamer-2000'
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		throw new FeedbackError("Couldn't reach GitHub. Try again in a moment.");
	}
}

let labelReady: Promise<void> | undefined;

/** Creates the "from-the-app" label once per server start (422 means it's already there). */
function ensureLabel(): Promise<void> {
	labelReady ??= github('POST', '/labels', {
		name: FROM_APP_LABEL,
		color: '7c5cff',
		description: 'Sent from the suggestion box in the app'
	}).then((res) => {
		if (!res.ok && res.status !== 422) {
			labelReady = undefined;
			console.error('GitHub label', res.status);
		}
	});
	return labelReady;
}

/** Turns a suggestion into a GitHub issue and returns its number. */
export async function submitFeedback(f: Feedback): Promise<number> {
	await ensureLabel();
	const kind = FEEDBACK_KINDS[f.kind];
	const res = await github('POST', '/issues', {
		title: `[${kind.word}] ${f.title}`,
		body: issueBody(f),
		labels: [kind.label, FROM_APP_LABEL]
	});
	if (!res.ok) {
		console.error('GitHub issue', res.status, await res.text());
		throw new FeedbackError("Couldn't send it right now. Try again later.");
	}
	const issue: { number: number } = await res.json();
	return issue.number;
}

const WINDOW_MS = 10 * 60_000;
const PER_PLAYER = 5;
const recent = new Map<string, number[]>();

/** A few per player per ten minutes, so a stuck button can't flood the issue list. */
export function allowFeedback(playerId: string, now = Date.now()): boolean {
	const mine = (recent.get(playerId) ?? []).filter((t) => now - t < WINDOW_MS);
	if (mine.length >= PER_PLAYER) return false;
	mine.push(now);
	recent.set(playerId, mine);
	return true;
}
