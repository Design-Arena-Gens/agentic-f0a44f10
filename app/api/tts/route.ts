import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text: string = (body?.text ?? '').toString();
    if (!text || text.length < 2) return NextResponse.json({ error: 'No text' }, { status: 400 });

    const headerKey = request.headers.get('x-openai-key') ?? undefined;
    const apiKey = headerKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 400 });

    const openai = new OpenAI({ apiKey });
    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: text,
      format: 'mp3'
    });
    const arrayBuffer = await speech.arrayBuffer();

    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
