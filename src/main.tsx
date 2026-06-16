import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./components/pro/theme";

// Aplica o tema light/dark (classe 'theme-dark' no <html>) antes do render — default light, sem classe.
initTheme();

createRoot(document.getElementById("root")!).render(<App />);
