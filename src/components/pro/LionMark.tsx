/**
 * LionMark — selo da marca (ícone real Mr. Lion, grayscale) sobre fundo creme fixo,
 * para contrastar igual em light e dark. Substitui o emoji 🦁.
 * O SVG vive em public/brand-lion.svg (servido como asset estático).
 *
 * Uso: <LionMark className="h-9 w-9 rounded-sub border border-border" />
 * (o className define tamanho/raio/borda; o fundo-selo é fixo)
 */
import { cn } from "@/lib/utils";

export function LionMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#F4F0E8]",
        className,
      )}
    >
      <img
        src="/brand-lion.svg"
        alt="Mr. Lion"
        className="h-[80%] w-[80%] object-contain"
        draggable={false}
      />
    </span>
  );
}

export default LionMark;
