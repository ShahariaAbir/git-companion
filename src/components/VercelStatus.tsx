import { useState, useEffect, useCallback } from "react";
import { ExternalLink, CheckCircle2, XCircle, Loader2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VercelDeployment {
  uid: string;
  state: string;
  url: string;
  created: number;
  meta?: { githubCommitMessage?: string; githubCommitRef?: string };
}

interface VercelStatusProps {
  repoName: string;
  owner: string;
}

const STATE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  READY: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Live", color: "text-green-500" },
  BUILDING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Building", color: "text-yellow-500" },
  ERROR: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Failed", color: "text-destructive" },
  QUEUED: { icon: <Clock className="h-3.5 w-3.5" />, label: "Queued", color: "text-muted-foreground" },
  CANCELED: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Canceled", color: "text-muted-foreground" },
  INITIALIZING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Initializing", color: "text-yellow-500" },
};

export function VercelStatus({ repoName, owner }: VercelStatusProps) {
  const [vercelToken, setVercelToken] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<VercelDeployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Load vercel token from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("gitedit_vercel_token");
    setVercelToken(stored);
  }, []);

  const fetchDeployments = useCallback(async () => {
    if (!vercelToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=&limit=5&meta-githubRepo=${repoName}&meta-githubOrg=${owner}`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDeployments(data.deployments || []);
    } catch {
      // Try alternative: search by project name
      try {
        const res = await fetch(
          `https://api.vercel.com/v6/deployments?limit=5`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.deployments || []).filter(
            (d: VercelDeployment) =>
              d.meta?.githubCommitRef &&
              (d.url?.includes(repoName.toLowerCase()) ||
                d.meta?.githubCommitMessage)
          );
          setDeployments(filtered.slice(0, 5));
        }
      } catch {
        setDeployments([]);
      }
    }
    setLoading(false);
  }, [vercelToken, repoName, owner]);

  useEffect(() => {
    if (vercelToken) fetchDeployments();
  }, [vercelToken, fetchDeployments]);

  // Auto-refresh when building
  useEffect(() => {
    if (!vercelToken) return;
    const isBuilding = deployments.some((d) => d.state === "BUILDING" || d.state === "QUEUED" || d.state === "INITIALIZING");
    if (!isBuilding) return;
    const interval = setInterval(fetchDeployments, 8000);
    return () => clearInterval(interval);
  }, [deployments, vercelToken, fetchDeployments]);

  const saveToken = (token: string) => {
    localStorage.setItem("gitedit_vercel_token", token);
    setVercelToken(token);
  };

  // Not connected state
  if (!vercelToken) {
    return (
      <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <svg viewBox="0 0 76 65" className="h-3.5 w-3.5 fill-foreground"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
          Vercel Deployments
        </div>
        <p className="text-[10px] text-muted-foreground">Connect your Vercel account to see build status.</p>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Vercel API token"
            className="flex-1 bg-secondary border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveToken((e.target as HTMLInputElement).value);
              }
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            className="text-xs h-7"
            onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
              if (input.value) saveToken(input.value);
            }}
          >
            Connect
          </Button>
        </div>
      </div>
    );
  }

  const latest = deployments[0];
  const latestState = latest ? STATE_CONFIG[latest.state] || STATE_CONFIG.QUEUED : null;

  return (
    <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-xs font-medium text-foreground">
          <svg viewBox="0 0 76 65" className="h-3.5 w-3.5 fill-foreground"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
          Vercel
          {latestState && (
            <span className={`flex items-center gap-1 ${latestState.color}`}>
              {latestState.icon}
              <span className="text-[10px]">{latestState.label}</span>
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={fetchDeployments} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => { localStorage.removeItem("gitedit_vercel_token"); setVercelToken(null); setDeployments([]); }}
            title="Disconnect Vercel"
          >
            <XCircle className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-1.5 animate-fade-in">
          {deployments.length === 0 ? (
            <p className="text-[10px] text-muted-foreground py-2 text-center">No deployments found for this repo</p>
          ) : (
            deployments.map((d) => {
              const cfg = STATE_CONFIG[d.state] || STATE_CONFIG.QUEUED;
              return (
                <div key={d.uid} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 border border-border/30">
                  <span className={cfg.color}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">
                      {d.meta?.githubCommitMessage || d.url || "Deployment"}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(d.created).toLocaleString()} · {cfg.label}
                    </p>
                  </div>
                  {d.url && (
                    <a href={`https://${d.url}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
