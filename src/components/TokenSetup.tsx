import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Eye, EyeOff } from "lucide-react";

interface TokenSetupProps {
  onConnect: (token: string) => void;
  loading: boolean;
  error: string | null;
}

export function TokenSetup({ onConnect, loading, error }: TokenSetupProps) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 animate-fade-in">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <img
            src="/icon-192.png"
            alt="Gitedit"
            className="w-20 h-20 rounded-2xl mx-auto shadow-lg shadow-primary/10"
          />
          <h1 className="text-2xl font-bold tracking-tight">Gitedit</h1>
          <p className="text-sm text-muted-foreground">
            Enter your Personal Access Token to manage your repositories.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="pr-10 font-mono text-sm bg-secondary border-border"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={() => onConnect(token.trim())}
            disabled={!token.trim() || loading}
            className="w-full"
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </div>

        <a
          href="https://github.com/settings/tokens/new?scopes=repo,delete_repo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Generate a token on GitHub
        </a>

        <div className="glass-card rounded-xl p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-secondary-foreground">Required scopes:</p>
          <p>• <code className="font-mono text-primary">repo</code> — Full control of repositories</p>
          <p>• <code className="font-mono text-primary">delete_repo</code> — Delete repositories</p>
        </div>
      </div>
    </div>
  );
}
