import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, LogOut, Eye, EyeOff, RefreshCw } from "lucide-react";

interface SettingsTabProps {
  token: string;
  user: Record<string, unknown>;
  onUpdateToken: (token: string) => void;
  onDisconnect: () => void;
}

export function SettingsTab({ token, user, onUpdateToken, onDisconnect }: SettingsTabProps) {
  const [newToken, setNewToken] = useState("");
  const [show, setShow] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!newToken.trim()) return;
    setUpdating(true);
    await new Promise((r) => setTimeout(r, 500));
    onUpdateToken(newToken.trim());
    setNewToken("");
    setUpdating(false);
  };

  const masked = token.slice(0, 6) + "Ã¢ÂÂ¢".repeat(20) + token.slice(-4);

  return (
    <div className="px-4 pt-4 pb-20 space-y-6 animate-slide-up">
      <div className="text-center space-y-3">
        <img
          src={(user.avatar_url as string) || ""}
          alt="avatar"
          className="w-16 h-16 rounded-full ring-2 ring-primary/30 mx-auto"
        />
        <h2 className="font-bold text-lg">{(user.login as string) || "User"}</h2>
        <p className="text-xs text-muted-foreground">{(user.email as string) || "Connected via token"}</p>
      </div>

      {/* Current token */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Access Token</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-secondary rounded px-2 py-1 flex-1 truncate">
            {show ? token : masked}
          </code>
          <button onClick={() => setShow(!show)} className="text-muted-foreground active:scale-90 transition-transform">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Update token */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Update Token</span>
        </div>
        <Input
          type="password"
          placeholder="Paste new token..."
          value={newToken}
          onChange={(e) => setNewToken(e.target.value)}
          className="bg-secondary border-border font-mono text-sm"
        />
        <Button onClick={handleUpdate} disabled={!newToken.trim() || updating} className="w-full active:scale-[0.98] transition-transform" variant="secondary">
          {updating ? "Updating..." : "Update Token"}
        </Button>
      </div>

      {/* App info */}
      <div className="glass-card rounded-xl p-4 flex items-center gap-3">
        <img src="/icon-192.png" alt="Gitedit" className="w-10 h-10 rounded-xl" />
        <div>
          <p className="text-sm font-semibold">Gitedit</p>
          <p className="text-[10px] text-muted-foreground">Mobile GitHub Manager [Made By S.Abir] | v1.0</p>
        </div>
      </div>

      {/* Disconnect */}
      <Button onClick={onDisconnect} variant="destructive" className="w-full active:scale-[0.98] transition-transform">
        <LogOut className="h-4 w-4 mr-2" />
        Disconnect
      </Button>
    </div>
  );
}
