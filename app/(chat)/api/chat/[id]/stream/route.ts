import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "edge";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/** Ирт ирэх бодиос текстийг олон форматаар уншина */
function getUserText(body: any): string {
  if (!body) return "";

  // ai-sdk default: { message: { parts: [{ type: "text", text: "..." }] } }
  if (Array.isArray(body?.message?.parts)) {
    return body.message.parts
      .filter((p: any) => p?.type === "text" && typeof p?.text === "string")
      .map((p: any) => p.text)
      .join("\n")
      .trim();
  }

  // { message: "..." } эсвэл { message: { text: "..." } }
  if (typeof body?.message === "string") return body.message.trim();
  if (typeof body?.message?.text === "string") return body.message.text.trim();

  // { messages: [ ..., { content: [{ type:"text", text:"..." }] } ] }
  const last = body?.messages?.at?.(-1);
  if (Array.isArray(last?.content)) {
    const t = last.content.find((c: any) => c?.type === "text")?.text;
    if (typeof t === "string") return t.trim();
  }
  if (typeof last?.text === "string") return last.text.trim();

  return "";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  const userText = getUserText(body);
  if (!userText) {
    return new Response(JSON.stringify({ error: "Missing message text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const modelName = body?.model ?? "gpt-4o-mini";

  const result = await streamText({
    model: openai(modelName),
    messages: [
      { role: "system", content: "Дулаан, товч, хэрэглэгчээрээ хариул." },
      { role: "user", content: userText },
    ],
  });

  return result.toTextStreamResponse();
}
