import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TEAM_MEMBERS } from "@/lib/types";
import { setUser } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const [customName, setCustomName] = useState("");
  const navigate = useNavigate();

  const handleSelect = (name: string) => {
    setUser(name);
    navigate("/dashboard");
  };

  const handleCustomEntry = () => {
    const name = customName.trim();
    if (name) {
      setUser(name);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-login">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4"
      >
        <div className="gradient-card border border-border rounded-xl p-8 glow-gold">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">
              <span className="font-display text-gold">MR. LION</span>
              <span className="text-foreground"> — Tarefas</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Identifique-se para acompanhar e gerenciar as tarefas da equipe em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {TEAM_MEMBERS.map((name, i) => (
              <motion.button
                key={name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(name)}
                className={`py-3 px-4 rounded-lg border border-border bg-secondary/50 text-secondary-foreground font-medium
                  hover:border-gold/50 hover:bg-accent/50 transition-all duration-200 text-sm
                  ${i === TEAM_MEMBERS.length - 1 && TEAM_MEMBERS.length % 2 !== 0 ? "col-span-1" : ""}`}
              >
                {name}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Outro nome..."
              className="flex-1 bg-secondary/50 border-border focus:border-gold/50"
              onKeyDown={e => e.key === "Enter" && handleCustomEntry()}
            />
            <Button
              onClick={handleCustomEntry}
              disabled={!customName.trim()}
              className="gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Entrar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
