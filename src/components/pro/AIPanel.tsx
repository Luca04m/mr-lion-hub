/**
 * AIPanel — chat funcional do "Assistente Mr. Lion".
 * Conversa com Cloudflare Workers AI via /api/assistant, com contexto dos dados do Hub.
 *
 * Uso:
 *   <AIPanel className="h-full" />
 */
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { askAssistant, type ChatMsg } from "@/lib/assistant";

export interface AIPanelProps {
  className?: string;
}

const WELCOME: ChatMsg = {
  role: "assistant",
  content: "Oi! Sou o Assistente Mr. Lion. Posso resumir tarefas, leads do CRM, conteúdo e reuniões do painel. O que você quer saber?",
};

const SUGGESTIONS = [
  "Quantas tarefas estão atrasadas?",
  "Como está o pipeline de revendedores?",
  "O que tem agendado de conteúdo?",
];

export function AIPanel({ className }: AIPanelProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const reply = await askAssistant(next.slice(1)); // remove a saudação fake do histórico
    setMessages(m => [...m, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-soft", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-sub border border-gold/30 bg-gold/[0.08] text-gold">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">Assistente Mr. Lion</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            Cloudflare Workers AI
          </div>
        </div>
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((b, i) => (
          <div key={i} className={cn("flex", b.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-sub px-3 py-2 text-[13px] leading-relaxed",
                b.role === "user"
                  ? "rounded-br-sm border border-border bg-secondary text-foreground"
                  : "rounded-bl-sm border border-border bg-muted/60 text-foreground/90",
              )}
            >
              {b.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-sub rounded-bl-sm border border-border bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> pensando...
            </div>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-sub border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-gold/30 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-btn border border-input bg-muted/40 px-3 py-2 focus-within:border-gold/30">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte algo..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Enviar"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-sub border border-border bg-secondary text-gold transition-opacity hover:bg-gold/10 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;
