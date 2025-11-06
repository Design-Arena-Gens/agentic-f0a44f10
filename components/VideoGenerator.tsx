"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

function estimateDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const wpm = 165; // comfortable TTS pace
  const seconds = Math.ceil((words / wpm) * 60);
  return Math.max(8, Math.min(60, seconds)); // Shorts-friendly bounds
}

function wrapText(str: string, maxLen = 36): string {
  return str
    .split(/\n+/)
    .map((line) => line.match(new RegExp(`.{1,${maxLen}}(\s+|$)`, 'g'))?.join("\n").trim() ?? line)
    .join("\n");
}

async function ttsToMp3(text: string, apiKey?: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-openai-key': apiKey } : {}),
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

export default function VideoGenerator({ initialText, apiKey }: { initialText?: string; apiKey?: string }) {
  const [text, setText] = useState(initialText ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioOk, setAudioOk] = useState<boolean>(false);

  useEffect(() => {
    if (initialText && !text) setText(initialText);
  }, [initialText]);

  const generate = useCallback(async () => {
    setBusy(true);
    setVideoUrl(null);
    setStatus("Preparing ffmpeg?");

    try {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm', 'application/wasm')
      });

      const display = wrapText(text);
      const duration = estimateDurationSeconds(text);

      setStatus("Fetching TTS (optional)?");
      const mp3 = await ttsToMp3(text, apiKey);
      if (mp3) {
        await ffmpeg.writeFile('audio.mp3', mp3);
        setAudioOk(true);
      } else {
        setAudioOk(false);
      }

      setStatus("Loading font & script?");
      let fontBytes: Uint8Array | null = null;
      try {
        fontBytes = await fetchFile('/fonts/Inter-Regular.ttf');
      } catch {}
      if (!fontBytes) {
        try {
          fontBytes = await fetchFile('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa.ttf');
        } catch {}
      }
      if (!fontBytes) throw new Error('Font load failed');
      await ffmpeg.writeFile('Inter-Regular.ttf', fontBytes);
      await ffmpeg.writeFile('script.txt', new TextEncoder().encode(display));

      setStatus("Rendering video? this can take ~30-60s");
      const argsWithAudio = [
        '-f','lavfi','-i',`color=c=#0a0a0a:s=1080x1920:d=${duration}`,
        ...(mp3 ? ['-i','audio.mp3'] : []),
        '-vf',
        `drawbox=x=80:y=200:w=920:h=1520:color=#111111AA:t=fill,` +
        `drawtext=fontfile=Inter-Regular.ttf:textfile=script.txt:fontcolor=white:fontsize=52:line_spacing=10:` +
        `x=(w-text_w)/2:y=(h-text_h)/2:borderw=4:bordercolor=#000000AA`,
        '-t', `${duration}`,
        '-c:v','libx264','-pix_fmt','yuv420p',
        ...(mp3 ? ['-c:a','aac'] : []),
        '-shortest','out.mp4'
      ];

      await ffmpeg.exec(argsWithAudio);

      const data = await ffmpeg.readFile('out.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus("Done. Download your video.");
    } catch (e) {
      console.error(e);
      setStatus("Failed to render. Try shorter text or provide an API key.");
    } finally {
      setBusy(false);
    }
  }, [text, apiKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Paste or edit your script here (<= 60s recommended)"}
        rows={14}
        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #222', background: '#0f0f0f', color: '#eaeaea' }}
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={generate} disabled={busy || !text.trim()} style={{ padding: '10px 16px', borderRadius: 8, background: '#f59e0b', color: '#111', border: 0, fontWeight: 700 }}>
          {busy ? 'Rendering?' : 'Generate Short'}
        </button>
        <span style={{ opacity: 0.8 }}>{status}</span>
        {audioOk ? <span style={{ color: '#10b981', fontWeight: 600 }}>Voice added</span> : <span style={{ opacity: 0.7 }}>(no TTS?add OpenAI key)</span>}
      </div>
      {videoUrl && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
          <video src={videoUrl} controls style={{ width: 360, height: 640, background: '#000', borderRadius: 12, border: '1px solid #222' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={videoUrl} download={`viral-short.mp4`} style={{ padding: '10px 16px', borderRadius: 8, background: '#3b82f6', color: 'white', textDecoration: 'none' }}>Download MP4</a>
          </div>
        </div>
      )}
    </div>
  );
}
