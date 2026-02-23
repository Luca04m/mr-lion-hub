import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { TEAM_MEMBERS } from "@/lib/types";
import { setUser, validatePassword, getTasks } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const LoginPage = () => {
  const [selectedName, setSelectedName] = useState("");
  const [customName, setCustomName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const navigate = useNavigate();

  const activeName = selectedName || customName.trim();
  const showPasswordStep = !!activeName;

  const handleSelect = (name: string) => {
    setSelectedName(name);
    setCustomName("");
    setPassword("");
    setPasswordError(false);
  };

  const handleCustomInput = (value: string) => {
    setCustomName(value);
    setSelectedName("");
    setPassword("");
    setPasswordError(false);
  };

  const handleLogin = () => {
    if (!activeName) return;
    if (!validatePassword(password)) {
      setPasswordError(true);
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 500);
      toast.error("Senha incorreta");
      return;
    }
    setUser(activeName);
    confetti({ particleCount: 50, spread: 50, colors: ["#D4A843", "#F5D77A", "#22C55E"], origin: { y: 0.7 } });
    
    // Check late tasks
    const lateTasks = getTasks().filter(t => t.status === "atrasada");
    if (lateTasks.length > 0) {
      setTimeout(() => {
        toast.warning(`⚠️ Você tem ${lateTasks.length} tarefa(s) atrasada(s)`, {
          duration: 8000,
          action: { label: "Ver", onClick: () => navigate("/tasks?status=atrasada") },
        });
      }, 1000);
    }
    navigate("/overview");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-pattern">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-4"
      >
        <div className="gradient-card border border-border rounded-xl p-8 glow-gold">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl gradient-gold flex items-center justify-center mx-auto mb-4 text-2xl">
              🦁
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-gold">MR. LION</span>
              <span className="text-muted-foreground ml-2 font-normal">HUB</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">Hub Operacional</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {TEAM_MEMBERS.map((name, i) => (
              <motion.button
                key={name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(name)}
                className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg border text-foreground font-medium
                  hover:border-gold/40 hover:bg-accent/30 transition-all duration-200 text-sm
                  ${selectedName === name ? "border-gold/50 bg-accent/40" : "border-border bg-secondary/40"}`}
              >
                <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                  {name.charAt(0)}
                </div>
                {name}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Input
            value={customName}
            onChange={e => handleCustomInput(e.target.value)}
            placeholder="Outro nome..."
            className="bg-secondary/40 border-border focus:border-gold/50 mb-4"
          />

          <AnimatePresence>
            {showPasswordStep && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pb-1">
                  <label className="text-xs text-muted-foreground block">Senha de acesso</label>
                  <div className={`relative ${shakePassword ? "animate-shake" : ""}`}>
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
                      placeholder="••••••••••••"
                      className={`bg-secondary/40 pr-10 ${passwordError ? "border-destructive" : "border-border focus:border-gold/50"}`}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={handleLogin}
                    disabled={!password}
                    className="w-full gradient-gold text-primary-foreground font-semibold hover:opacity-90 glow-pulse"
                  >
                    Entrar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
