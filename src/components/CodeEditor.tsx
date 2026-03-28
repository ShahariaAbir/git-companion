import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Save,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Copy,
  ClipboardPaste,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CodeEditorProps {
  filePath: string;
  content: string;
  sha: string;
  commitMsg: string;
  saving: boolean;
  onContentChange: (content: string) => void;
  onCommitMsgChange: (msg: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function CodeEditor({
  filePath,
  content,
  sha,
  commitMsg,
  saving,
  onContentChange,
  onCommitMsgChange,
  onSave,
  onClose,
}: CodeEditorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);

  const lines = content.split("\n");
  const lineCount = lines.length;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumberRef.current) {
      lineNumberRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }
    const found: number[] = [];
    const lower = searchTerm.toLowerCase();
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(lower)) found.push(i);
    });
    setMatches(found);
    setMatchIndex(0);
  }, [searchTerm, content]);

  const goToMatch = (index: number) => {
    if (matches.length === 0 || !textareaRef.current) return;
    const lineNum = matches[index];
    textareaRef.current.scrollTop = lineNum * 20 - 100;
  };

  const nextMatch = () => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    goToMatch(next);
  };

  const prevMatch = () => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    goToMatch(prev);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newContent = content.slice(0, start) + text + content.slice(end);
        onContentChange(newContent);
        // Restore cursor after paste
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + text.length;
            textareaRef.current.selectionEnd = start + text.length;
            textareaRef.current.focus();
          }
        }, 0);
      } else {
        onContentChange(content + text);
      }
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const handleClear = () => {
    if (content.length === 0) return;
    if (!confirm("Clear all code? This can't be undone until you close without saving.")) return;
    onContentChange("");
    toast.success("Code cleared");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchTerm("");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-background flex flex-col"
    : "px-4 pt-4 pb-20 space-y-3 animate-slide-up flex flex-col";

  const editorHeight = fullscreen ? "flex-1" : "h-[60vh]";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-1 shrink-0">
        <Button size="icon" variant="ghost" onClick={onClose} className="active:scale-90 transition-transform shrink-0 h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-mono truncate flex-1 text-foreground">{filePath}</span>
        
        {/* Toolbar buttons */}
        <Button size="icon" variant="ghost" onClick={handleCopy} className="active:scale-90 transition-transform shrink-0 h-8 w-8" title="Copy all">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handlePaste} className="active:scale-90 transition-transform shrink-0 h-8 w-8" title="Paste from clipboard">
          <ClipboardPaste className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleClear} className="active:scale-90 transition-transform shrink-0 h-8 w-8 text-destructive hover:text-destructive" title="Clear all">
          <Eraser className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setSearchOpen(!searchOpen)} className="active:scale-90 transition-transform shrink-0 h-8 w-8">
          <Search className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setFullscreen(!fullscreen)} className="active:scale-90 transition-transform shrink-0 h-8 w-8">
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-1 shrink-0 animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-secondary border-border"
              autoFocus
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap min-w-[40px] text-center">
            {matches.length > 0 ? `${matchIndex + 1}/${matches.length}` : searchTerm ? "0" : ""}
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={prevMatch} disabled={matches.length === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={nextMatch} disabled={matches.length === 0}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setSearchOpen(false); setSearchTerm(""); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Editor with line numbers */}
      <div className={`${editorHeight} rounded-xl overflow-hidden border border-border/40 bg-card/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] relative flex`}>
        <div
          ref={lineNumberRef}
          className="w-12 shrink-0 overflow-hidden select-none bg-secondary/40 border-r border-border/30 py-3"
          style={{ lineHeight: "20px" }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`text-right pr-2 font-mono text-[11px] leading-[20px] ${
                matches.includes(i) ? "text-primary font-semibold" : "text-muted-foreground/60"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onScroll={handleScroll}
          className="flex-1 bg-transparent p-3 font-mono text-[12px] leading-[20px] resize-none focus:outline-none text-foreground placeholder:text-muted-foreground overflow-auto"
          spellCheck={false}
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Bottom actions */}
      <div className="space-y-2 shrink-0 px-1">
        <Input
          placeholder="Commit message (optional)"
          value={commitMsg}
          onChange={(e) => onCommitMsgChange(e.target.value)}
          className="bg-secondary border-border text-sm h-9"
        />
        <Button onClick={onSave} disabled={saving} className="w-full active:scale-[0.98] transition-transform h-10">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save & Commit"}
        </Button>
      </div>
    </div>
  );
}
