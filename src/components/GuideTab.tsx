import { KeyRound, Upload, Trash2, FolderGit2, Archive, CheckSquare, GitBranch, FileEdit } from "lucide-react";

const sections = [
  {
    icon: KeyRound,
    title: "Connect Your Token",
    content: "Go to GitHub Settings → Developer Settings → Personal Access Tokens → Generate new token. Enable 'repo' and 'delete_repo' scopes. Paste the token in the Settings tab.",
  },
  {
    icon: FolderGit2,
    title: "Browse Repositories",
    content: "Once connected, the Repos tab shows all your repositories. Tap any repo to browse its files and folders.",
  },
  {
    icon: Upload,
    title: "Upload Files",
    content: "Inside a repo, tap 'Files' to upload individual files, or 'ZIP' to upload a ZIP archive. Files are uploaded in parallel batches for maximum speed.",
  },
  {
    icon: Archive,
    title: "ZIP Upload & Root Selection",
    content: "When uploading a ZIP, the app extracts and shows the folder tree. Set a 'root' folder to upload files starting from that point.",
  },
  {
    icon: FileEdit,
    title: "Edit Files",
    content: "Tap any file to open the built-in editor. Make your changes and hit 'Save & Commit' to push changes to GitHub.",
  },
  {
    icon: CheckSquare,
    title: "Multi-Select & Delete",
    content: "Tap 'Select' to enter selection mode. Select files and folders, then tap 'Delete' to remove everything in a single fast commit.",
  },
  {
    icon: Trash2,
    title: "Delete Repositories",
    content: "In the Repos list, each repo has a 'Delete' option. This permanently deletes the repository from GitHub.",
  },
  {
    icon: GitBranch,
    title: "Branch Switching",
    content: "Inside a repo browser, tap the branch name to switch between branches. All operations work on the selected branch.",
  },
];

export function GuideTab() {
  return (
    <div className="px-4 pt-4 pb-20 space-y-4 animate-slide-up">
      <div className="text-center space-y-2 mb-2">
        <img src="/icon-192.png" alt="Gitedit" className="w-12 h-12 rounded-xl mx-auto" />
        <h2 className="text-lg font-bold">How to Use Gitedit</h2>
        <p className="text-xs text-muted-foreground">Everything you need to know</p>
      </div>

      <div className="space-y-3">
        {sections.map(({ icon: Icon, title, content }, i) => (
          <div
            key={title}
            className="glass-card rounded-xl p-4 hover:border-primary/20 transition-all duration-200"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
