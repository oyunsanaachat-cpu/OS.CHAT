import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Текстийг body-оос гаргаж авах жижиг туслах
function extractText(body: any): string {
  const t =
    body?.message?.parts?.find?.((p: any) => p?.type === "text")?.text ??
    body?.message?.text ??
    "";
  return typeof t === "string" ? t : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userText = extractText(body);

    if (!userText) {
      return Response.json(
        { error: "Missing message text" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Чи бол ойлгомжтой, урам өгдөг туслагч." },
        { role: "user", content: userText },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "…";
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json(
      { error: "upstream_error", detail: e?.message ?? "" },
      { status: 500 }
    );
  }
}
