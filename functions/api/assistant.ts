// Pages Function — Assistente Mr. Lion via Cloudflare Workers AI (free tier).
// Rota: POST /api/assistant  body: { messages: [{role,content}], context: string }
// Compilada pelo Cloudflare (não pelo Vite). Tipos soltos para não exigir @cloudflare/workers-types.

// Tenta em ordem; usa o primeiro modelo disponível (resiliente a deprecações).
const MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/qwen/qwen2.5-7b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];

export async function onRequestPost(ctx: any): Promise<Response> {
  try {
    const body = await ctx.request.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const context = typeof body.context === "string" ? body.context : "";

    const system =
      "Você é o Assistente Mr. Lion, copiloto interno do Hub de gestão da Casa Mr. Lion " +
      "(whisky brasileiro premium, e-commerce D2C + revenda B2B). Responda SEMPRE em português do Brasil, " +
      "de forma curta, direta e prática. Use os dados do painel abaixo quando a pergunta for sobre a operação; " +
      "NÃO invente números que não estejam nos dados. Se a informação não estiver no painel, diga isso com honestidade.\n\n" +
      "DADOS ATUAIS DO PAINEL:\n" + (context || "(sem dados carregados)");

    const input = [{ role: "system", content: system }, ...messages.slice(-10)];

    if (!ctx.env || !ctx.env.AI) {
      return Response.json({
        reply: "O Assistente ainda não está conectado à IA — falta habilitar o binding 'AI' (Workers AI) no projeto Cloudflare.",
      });
    }

    let lastErr = "";
    for (const model of MODELS) {
      try {
        const res = await ctx.env.AI.run(model, { messages: input, max_tokens: 512 });
        const reply = res && (res.response ?? res.result?.response);
        if (reply) return Response.json({ reply: String(reply).trim() });
      } catch (e) {
        lastErr = String(e);
      }
    }
    return Response.json({ reply: "Assistente indisponível no momento (nenhum modelo respondeu).", error: lastErr });
  } catch (e) {
    return Response.json({ reply: "Assistente indisponível no momento. Tente de novo em instantes.", error: String(e) });
  }
}
