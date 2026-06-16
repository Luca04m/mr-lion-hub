/**
 * AIPanel — painel "Assistente Mr. Lion" VISUAL (não funcional / mock).
 * Card neutro sóbrio com borda. Bolhas de chat discretas. Input sóbrio.
 *
 * Uso:
 *   <AIPanel />
 *   <AIPanel className="h-full" />
 */
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIPanelProps {
  className?: string;
}

interface Bubble {
  from: "user" | "ai";
  text: string;
}

const SAMPLE: Bubble[] = [
  {
    from: "user",
    text: "Como tá o faturamento da semana vs. a anterior?",
  },
  {
    from: "ai",
    text: "Faturamento de R$ 21.700 nos últimos 7 dias, +12,4% vs. a semana anterior. O Honey segue como carro-chefe (38% das vendas) e o ticket médio subiu para R$ 184.",
  },
  {
    from: "ai",
    text: "Sugestão: o Black Honey teve 3x mais visitas que vendas — vale revisar a oferta ou um combo de degustação para destravar a conversão.",
  },
];

export function AIPanel({ className }: AIPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-soft",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-sub border border-gold/30 bg-gold/[0.08] text-gold">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            Assistente Mr. Lion
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            Online
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {SAMPLE.map((b, i) => (
          <div
            key={i}
            className={cn("flex", b.from === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-sub px-3 py-2 text-[13px] leading-relaxed",
                b.from === "user"
                  ? "rounded-br-sm border border-border bg-secondary text-foreground"
                  : "rounded-bl-sm border border-border bg-muted/60 text-foreground/90",
              )}
            >
              {b.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input (visual/desabilitado) */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-btn border border-input bg-muted/40 px-3 py-2">
          <input
            type="text"
            disabled
            placeholder="Pergunte algo..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            disabled
            aria-label="Enviar"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-sub border border-border bg-secondary text-muted-foreground opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;
