// app/(chat)/api/chat/[id]/stream/route.ts
import OpenAI from "openai";

export const runtime = "edge";
export const dynamic = "force-dynamic"; // энэ route-ыг заавал ашиглуул

// Клипэнтээс ирэх янз бүрийн body-оос текстийг уян хатан сугална
function extractText(body: any): string {
  if (!body) return "";
  if (typeof body.message === "string") return body.message.trim();

  const parts = body?.message?.parts || body?.parts;
  if (Array.isArray(parts)) {
    return parts
      .filter((p: any) => p && p.type === "text" && typeof p.text === "string")
      .map((p: any) => p.text)
      .join("\n")
      .trim();
  }
  if (typeof body === "string") return body.trim();
  return "";
}

export async function POST(req: Request) {
  // ---------- 0) TEST горим (OpenAI дуудахгүй, шууд урсгаж шалгана) ----------
  const url = new URL(req.url);
  if (url.searchParams.get("test") === "1") {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(enc.encode("data: Сайн уу 👋\n\n"));
        ctrl.enqueue(enc.encode("data: stream OK\n\n"));
        ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
        ctrl.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
  // --------------------------------------------------------------------------

  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const message = extractText(body);
  const model = body?.model || "gpt-4o-mini";
  if (!message) return new Response("Missing 'message' text", { status: 400 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const completion = await openai.chat.completions.create({
    model,
    stream: true,
    temperature: 0.7,
    messages: [
      { role: "system", content: "Дулаан, товч, хэрэгтэйгээр stream-лэж хариул." },
      { role: "user", content: message },
    ],
  });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of completion) {
          const token = part.choices?.[0]?.delta?.content;
          if (token) controller.enqueue(enc.encode(`data: ${token}\n\n`));
        }
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
