import { NextResponse } from 'next/server';

async function fetchRedditListing(path: string) {
  const url = `https://www.reddit.com${path}.json?limit=10&t=day`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'viral-shorts-agent/1.0 (by gpt5)' },
    cache: 'no-store'
  });
  if (!res.ok) return null;
  return (await res.json()) as any;
}

function sanitize(str: string): string {
  return (str ?? '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? 'copypasta').toLowerCase();

  // Heuristic subreddit selection
  const subs = new Set<string>();
  if (/joke|funny|humor/.test(q)) subs.add('Jokes');
  if (/ask|story|reddit/.test(q)) subs.add('AskReddit');
  if (/copy|copypasta|meme|viral/.test(q)) subs.add('copypasta');
  if (!subs.size) subs.add(q.includes('r/') ? q.replace('r/','') : q);
  // Always add a couple of good defaults
  subs.add('AskReddit');
  subs.add('copypasta');

  const items: Array<{ id: string; title: string; text: string }> = [];

  await Promise.all(Array.from(subs).map(async (sub) => {
    const listing = await fetchRedditListing(`/r/${encodeURIComponent(sub)}/top`);
    if (!listing) return;
    const posts = listing.data?.children ?? [];
    for (const p of posts) {
      const d = p.data;
      const title = sanitize(d.title);
      const body = sanitize(d.selftext || '');
      if (!title) continue;
      // Build a short script: title + truncated body
      const text = (title + (body ? '. ' + body : '')).slice(0, 1200);
      items.push({ id: d.id, title, text });
    }
  }));

  // Dedup by title
  const uniq = new Map<string, { id: string; title: string; text: string }>();
  for (const it of items) {
    if (!uniq.has(it.title)) uniq.set(it.title, it);
  }

  return NextResponse.json({ items: Array.from(uniq.values()).slice(0, 20) });
}
