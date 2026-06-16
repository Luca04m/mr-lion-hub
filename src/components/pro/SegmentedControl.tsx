/**
 * SegmentedControl — toggle de opções (ex: Líquido/Envase, Mês/Ano, Simplified/Detailed).
 * Sóbrio: container neutro; item ativo = superfície card elevada + texto foreground.
 * Genérico no tipo do value.
 *
 * Uso:
 *   const [v, setV] = useState<"mes" | "ano">("mes");
 *   <SegmentedControl
 *     value={v}
 *     onChange={setV}
 *     options={[{ label: "Mês", value: "mes" }, { label: "Ano", value: "ano" }]}
 *   />
 */
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-btn border border-border bg-muted/50 p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-sub font-medium transition-colors duration-150",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
