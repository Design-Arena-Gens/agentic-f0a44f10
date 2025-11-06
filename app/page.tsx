"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const VideoGenerator = dynamic(() => import("@/components/VideoGenerator"), { ssr: false });

export default function Page() {
  const [query, setQuery] = useState("copypasta");
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<Array<{ id: string; title: string; text: string }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const key = localStorage.getItem("openai_key");
    if (key) setApiKey(key);
  }, []);

  const selectedScript = useMemo(() => scripts.find(s => s.id === selected) ?? null, [scripts, selected]);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/find?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setScripts(data.items ?? []);
      if (data.items?.length) setSelected(data.items[0].id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Viral Shorts Agent</h1>
      <p style={{ opacity: 0.8 }}>Search viral scripts, synthesize voice, and render a vertical MP4 for YouTube Shorts.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="topic or subreddit (e.g., copypasta, AskReddit, Jokes)"
          style={{ padding: 10, minWidth: 320, borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eaeaea" }}
        />
        <button onClick={search} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8, background: "#3b82f6", border: 0, color: 'white' }}>
          {loading ? 'Searching?' : 'Find viral scripts'}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="password"
            placeholder="OpenAI API key (optional for TTS)"
            defaultValue={apiKey ?? ''}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ padding: 10, minWidth: 340, borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eaeaea" }}
          />
          <button
            onClick={() => { if (apiKey) localStorage.setItem('openai_key', apiKey); }}
            style={{ padding: "10px 16px", borderRadius: 8, background: "#10b981", border: 0, color: 'white' }}
          >Save key</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div>
          <h3 style={{ marginBottom: 8 }}>Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scripts.map(s => (
              <button key={s.id} onClick={() => setSelected(s.id)} style={{
                textAlign: 'left', padding: 12, borderRadius: 10, border: '1px solid #222', background: selected === s.id ? '#111827' : '#0f0f0f'
              }}>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div style={{ opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.text}</div>
              </button>
            ))}
            {!scripts.length && <div style={{ opacity: 0.7 }}>No results yet. Try searching.</div>}
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: 8 }}>Editor & Render</h3>
          <VideoGenerator initialText={selectedScript?.text ?? ''} apiKey={apiKey ?? undefined} />
        </div>
      </div>
    </main>
  );
}
