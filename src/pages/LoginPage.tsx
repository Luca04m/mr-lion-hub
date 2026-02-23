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
    navigate("/overview");
  };

  const handleCustomEntry = () => {
    const name = customName.trim();
    if (name) {
      setUser(name);
      navigate("/overview");
    }
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
            <p className="text-muted-foreground text-sm mt-2">
              Hub Operacional
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {TEAM_MEMBERS.map((name, i) => (
              <motion.button
                key={name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(name)}
                className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg border border-border bg-secondary/40 text-foreground font-medium
                  hover:border-gold/40 hover:bg-accent/30 transition-all duration-200 text-sm"
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

          <div className="flex gap-2">
            <Input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Outro nome..."
              className="flex-1 bg-secondary/40 border-border focus:border-gold/50"
              onKeyDown={e => e.key === "Enter" && handleCustomEntry()}
            />
            <Button
              onClick={handleCustomEntry}
              disabled={!customName.trim()}
              className="gradient-gold text-primary-foreground font-semibold hover:opacity-90 glow-pulse"
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
