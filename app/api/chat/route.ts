import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? ""),
    }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are Altair, a friendly, cute, polished AI robot assistant inspired by a WALL-E-like personality. Be warm, smart, concise, and helpful. Keep responses conversational and voice-friendly.",
        },
        ...formattedMessages,
      ],
    });

    const reply = response.output_text || "I’m here and ready to help.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        reply:
          "I hit an error connecting to the model. Check your OPENAI_API_KEY and deployment settings.",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
