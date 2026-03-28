import { useEffect, useState, useCallback } from "react";
import {
  getRepoContents,
  getFileContent,
  createOrUpdateFile,
  batchDeleteFiles,
  batchUploadFiles,
  getBranches,
  downloadRepoZip,
} from "@/lib/github";
import type { ProgressInfo } from "@/lib/github";
import {
  ArrowLeft,
  File,
  Folder,
  Trash2,
  Plus,
  Upload,
  CheckSquare,
  Square,
  CheckCheck,
  X,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ZipUploader } from "./ZipUploader";
import { ProgressOverlay } from "./ProgressOverlay";
import { CodeEditor } from "./CodeEditor";
import { VercelStatus } from "./VercelStatus";

interface RepoBrowserProps {
  token: string;
  owner: string;
  repo: { name: string; default_branch: string };
  onBack: () => void;
}

interface ContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  size?: number;
}

export function RepoBrowser({ token, owner, repo, onBack }: RepoBrowserProps) {
  const [path, setPath] = useState("");
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string; sha: string } | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showZip, setShowZip] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState(repo.default_branch);
  const [showBranches, setShowBranches] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [downloading, setDownloading] = useState(false);

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRepoContents(token, owner, repo.name, path, branch);
      const items: ContentItem[] = Array.isArray(data)
        ? data.map((d: ContentItem) => ({ name: d.name, path: d.path, type: d.type, sha: d.sha, size: d.size }))
        : [];
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setContents(items);
    } catch {
      setContents([]);
    }
    setLoading(false);
  }, [token, owner, repo.name, path, branch]);

  useEffect(() => { loadContents(); }, [loadContents]);

  useEffect(() => {
    getBranches(token, owner, repo.name)
      .then((b: { name: string }[]) => setBranches(b.map((x) => x.name)))
      .catch(() => {});
  }, [token, owner, repo.name]);

  const navigateTo = (p: string) => {
    setPath(p);
    setSelected(new Set());
    setSelectMode(false);
  };

  const goUp = () => {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    navigateTo(parts.join("/"));
  };

  const openFile = async (item: ContentItem) => {
    if (selectMode) {
      toggleSelect(item.path);
      return;
    }
    if (item.type === "dir") {
      navigateTo(item.path);
      return;
    }
    try {
      const data = await getFileContent(token, owner, repo.name, item.path, branch);
      const content = atob(data.content.replace(/\n/g, ""));
      setEditingFile({ path: item.path, content, sha: data.sha });
      setEditContent(content);
    } catch {
      toast.error("Could not load file");
    }
  };

  const saveFile = async () => {
    if (!editingFile) return;
    setSaving(true);
    try {
      const msg = commitMsg.trim() || `Update ${editingFile.path}`;
      await createOrUpdateFile(
        token, owner, repo.name, editingFile.path,
        btoa(unescape(encodeURIComponent(editContent))),
        msg, editingFile.sha, branch
      );
      toast.success("File saved");
      setEditingFile(null);
      setCommitMsg("");
      loadContents();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setSaving(false);
  };

  const toggleSelect = (p: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === contents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contents.map((c) => c.path)));
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const paths = Array.from(selected);
    if (!confirm(`Delete ${paths.length} item(s)? This cannot be undone!`)) return;

    // Instant UI removal
    const removedPaths = new Set(paths);
    setContents((prev) => prev.filter((item) => !removedPaths.has(item.path)));
    setSelected(new Set());
    setSelectMode(false);

    setDeleting(true);
    setProgressLabel("Deleting files");
    setProgress({ current: 0, total: 1, currentFile: "Preparing..." });

    try {
      const msg = commitMsg.trim() || `Delete ${paths.length} file(s)`;
      await batchDeleteFiles(token, owner, repo.name, paths, msg, branch, (info) => {
        setProgress(info);
      });
      toast.success(`Deleted ${paths.length} item(s)`);
      setCommitMsg("");
    } catch (e) {
      toast.error((e as Error).message);
    }

    // Always refresh to sync with remote
    await loadContents();
    setDeleting(false);
    setProgress(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const uploads: Array<{ path: string; content: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = await fileToBase64(file);
      const filePath = path ? `${path}/${file.name}` : file.name;
      uploads.push({ path: filePath, content });
    }
    setProgressLabel("Uploading files");
    setProgress({ current: 0, total: uploads.length, currentFile: "Starting..." });
    try {
      const msg = commitMsg.trim() || `Upload ${uploads.length} file(s)`;
      await batchUploadFiles(token, owner, repo.name, uploads, msg, branch, (info) => {
        setProgress(info);
      });
      toast.success(`Uploaded ${uploads.length} file(s)`);
      setShowUpload(false);
      setCommitMsg("");
      await loadContents();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setProgress(null);
    e.target.value = "";
  };

  const createNewFile = async () => {
    if (!newFileName.trim()) return;
    const filePath = path ? `${path}/${newFileName.trim()}` : newFileName.trim();
    try {
      const msg = commitMsg.trim() || `Create ${filePath}`;
      await createOrUpdateFile(token, owner, repo.name, filePath, btoa(""), msg, undefined, branch);
      toast.success("File created");
      setShowNewFile(false);
      setNewFileName("");
      setCommitMsg("");
      await loadContents();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleZipFiles = async (files: Array<{ path: string; content: string }>) => {
    if (files.length === 0) return;
    setProgressLabel("Uploading ZIP files");
    setProgress({ current: 0, total: files.length, currentFile: "Starting..." });
    try {
      const finalFiles = files.map((f) => ({
        path: path ? `${path}/${f.path}` : f.path,
        content: f.content,
      }));
      const msg = commitMsg.trim() || `Upload ${finalFiles.length} files from ZIP`;
      await batchUploadFiles(token, owner, repo.name, finalFiles, msg, branch, (info) => {
        setProgress(info);
      });
      toast.success(`Uploaded ${finalFiles.length} files from ZIP`);
      setShowZip(false);
      setCommitMsg("");
      await loadContents();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setProgress(null);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadRepoZip(token, owner, repo.name, branch);
      toast.success("Download started!");
    } catch (e) {
      toast.error((e as Error).message);
    }
    setDownloading(false);
  };

  // Editing view - new CodeEditor
  if (editingFile) {
    return (
      <CodeEditor
        filePath={editingFile.path}
        content={editContent}
        sha={editingFile.sha}
        commitMsg={commitMsg}
        saving={saving}
        onContentChange={setEditContent}
        onCommitMsgChange={setCommitMsg}
        onSave={saveFile}
        onClose={() => setEditingFile(null)}
      />
    );
  }

  // ZIP upload view
  if (showZip) {
    return (
      <div className="px-4 pt-4 pb-20 animate-slide-up">
        <ProgressOverlay label={progressLabel} progress={progress} />
        <div className="flex items-center gap-2 mb-4">
          <Button size="icon" variant="ghost" onClick={() => setShowZip(false)} className="active:scale-90 transition-transform">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">Upload ZIP</span>
        </div>
        <Input
          placeholder="Commit message (optional)"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          className="bg-secondary border-border text-sm mb-3"
        />
        <ZipUploader onUpload={handleZipFiles} />
      </div>
    );
  }

  const breadcrumbs = path ? path.split("/") : [];

  return (
    <div className="px-4 pt-4 pb-20 space-y-3 animate-slide-up">
      <ProgressOverlay label={progressLabel} progress={progress} />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={path ? goUp : onBack} className="active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{repo.name}</h3>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground overflow-x-auto scrollbar-hide">
            <button onClick={() => navigateTo("")} className="hover:text-primary transition-colors shrink-0">root</button>
            {breadcrumbs.map((part, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                <span>/</span>
                <button
                  onClick={() => navigateTo(breadcrumbs.slice(0, i + 1).join("/"))}
                  className="hover:text-primary transition-colors"
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Branch selector */}
        <div className="relative">
          <button
            onClick={() => setShowBranches(!showBranches)}
            className="flex items-center gap-1 text-xs bg-secondary rounded-md px-2 py-1 border border-border active:scale-95 transition-transform"
          >
            <GitBranch className="h-3 w-3 text-primary" />
            <span className="max-w-[60px] truncate">{branch}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showBranches && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[120px] max-h-48 overflow-y-auto animate-fade-in">
              {branches.map((b) => (
                <button
                  key={b}
                  onClick={() => { setBranch(b); setShowBranches(false); navigateTo(""); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors ${b === branch ? "text-primary font-medium" : ""}`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="secondary" onClick={() => setSelectMode(!selectMode)} className="active:scale-95 transition-transform">
          {selectMode ? <X className="h-3 w-3 mr-1" /> : <CheckSquare className="h-3 w-3 mr-1" />}
          {selectMode ? "Cancel" : "Select"}
        </Button>
        {selectMode && (
          <>
            <Button size="sm" variant="secondary" onClick={selectAll} className="active:scale-95 transition-transform">
              <CheckCheck className="h-3 w-3 mr-1" />
              {selected.size === contents.length ? "Deselect" : "All"}
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={selected.size === 0 || deleting} className="active:scale-95 transition-transform">
              <Trash2 className="h-3 w-3 mr-1" />
              {deleting ? "Deleting..." : `Delete (${selected.size})`}
            </Button>
          </>
        )}
        {!selectMode && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setShowNewFile(!showNewFile)} className="active:scale-95 transition-transform">
              <Plus className="h-3 w-3 mr-1" /> New
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowUpload(!showUpload)} className="active:scale-95 transition-transform">
              <Upload className="h-3 w-3 mr-1" /> Files
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowZip(true)} className="active:scale-95 transition-transform">
              <Upload className="h-3 w-3 mr-1" /> ZIP
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDownloadZip} disabled={downloading} className="active:scale-95 transition-transform">
              <Download className="h-3 w-3 mr-1" /> {downloading ? "..." : "Download"}
            </Button>
          </>
        )}
      </div>

      {/* New file input */}
      {showNewFile && (
        <div className="flex gap-2 animate-fade-in">
          <Input
            placeholder="filename.txt"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="bg-secondary border-border text-sm flex-1"
          />
          <Button size="sm" onClick={createNewFile} disabled={!newFileName.trim()}>Create</Button>
        </div>
      )}

      {/* File upload */}
      {showUpload && (
        <div className="glass-card rounded-lg p-3 animate-fade-in">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="text-xs w-full file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-xs file:cursor-pointer"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Select one or more files to upload</p>
        </div>
      )}

      {/* Commit message */}
      {(selectMode || showNewFile || showUpload) && (
        <Input
          placeholder="Commit message (optional)"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          className="bg-secondary border-border text-sm animate-fade-in"
        />
      )}

      {/* Vercel Status */}
      <VercelStatus repoName={repo.name} owner={owner} />

      {/* File list */}
      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 bg-card rounded-lg animate-pulse border border-border" style={{ animationDelay: `${i * 80}ms` }} />
          ))
        ) : contents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            This folder is empty
          </p>
        ) : (
          contents.map((item, i) => (
            <button
              key={item.path}
              onClick={() => openFile(item)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 text-left active:scale-[0.98] ${
                selected.has(item.path)
                  ? "bg-primary/10 border-primary/40"
                  : "bg-card border-border hover:border-primary/20"
              }`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {selectMode && (
                <span className="shrink-0">
                  {selected.has(item.path) ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              )}
              {item.type === "dir" ? (
                <Folder className="h-4 w-4 text-accent shrink-0" />
              ) : (
                <File className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm truncate flex-1">{item.name}</span>
              {item.type === "file" && item.size !== undefined && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {item.size > 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}
                </span>
              )}
              {item.type === "dir" && !selectMode && (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
