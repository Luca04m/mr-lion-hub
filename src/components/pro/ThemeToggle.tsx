/**
 * ThemeToggle — alterna o tema light <-> dark (classe 'theme-dark' no <html>).
 * Persiste em localStorage 'mrlion_theme'. Botão pequeno com ícone sol/lua.
 *
 * Uso:
 *   <ThemeToggle />            // botão ícone-only
 *   <ThemeToggle showLabel />  // com label "Claro"/"Escuro"
 */
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredTheme, setTheme, type HubTheme } from "./theme";

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const [theme, setThemeState] = useState<HubTheme>("light");

  // Sincroniza com o que o boot já aplicou (evita flash / mismatch).
  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const toggle = () => {
    const next: HubTheme = theme === "light" ? "dark" : "light";
    setTheme(next);
    setThemeState(next);
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Mudar para tema escuro" : "Mudar para tema claro"}
      title={isLight ? "Tema Claro" : "Tema Escuro"}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-btn border border-border bg-card px-2.5 text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold",
        className,
      )}
    >
      {isLight ? (
        <Sun className="h-4 w-4 text-gold" />
      ) : (
        <Moon className="h-4 w-4 text-gold" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">{isLight ? "Claro" : "Escuro"}</span>
      )}
    </button>
  );
}

export default ThemeToggle;
