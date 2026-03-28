const BASE = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export interface ProgressInfo {
  current: number;
  total: number;
  currentFile: string;
}

export type ProgressCallback = (info: ProgressInfo) => void;

export async function getUser(token: string) {
  const res = await fetch(`${BASE}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error("Invalid token");
  return res.json();
}

export async function getRepos(token: string, page = 1, perPage = 30, sort = "updated") {
  const res = await fetch(
    `${BASE}/user/repos?per_page=${perPage}&page=${page}&sort=${sort}&affiliation=owner,collaborator`,
    { headers: headers(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch repos");
  return res.json();
}

export async function createRepo(token: string, name: string, description: string, isPrivate: boolean) {
  const res = await fetch(`${BASE}/user/repos`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to create repo");
  }
  return res.json();
}

export async function deleteRepo(token: string, owner: string, repo: string) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!res.ok) throw new Error("Failed to delete repo");
}

export async function getRepoContents(token: string, owner: string, repo: string, path = "", ref?: string) {
  let url = `${BASE}/repos/${owner}/${repo}/contents/${path}`;
  if (ref) url += `?ref=${ref}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error("Failed to fetch contents");
  return res.json();
}

export async function getFileContent(token: string, owner: string, repo: string, path: string, ref?: string) {
  let url = `${BASE}/repos/${owner}/${repo}/contents/${path}`;
  if (ref) url += `?ref=${ref}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error("Failed to fetch file");
  return res.json();
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string
) {
  const body: Record<string, string> = { message, content };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to save file");
  }
  return res.json();
}

export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch?: string
) {
  const body: Record<string, string> = { message, sha };
  if (branch) body.branch = branch;
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to delete file");
}

export async function getBranches(token: string, owner: string, repo: string) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/branches`, { headers: headers(token) });
  if (!res.ok) throw new Error("Failed to fetch branches");
  return res.json();
}

export async function getRepoBranch(token: string, owner: string, repo: string, branch: string) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/branches/${branch}`, { headers: headers(token) });
  if (!res.ok) throw new Error("Failed to fetch branch");
  return res.json();
}

export async function createBlob(token: string, owner: string, repo: string, content: string, encoding = "base64") {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ content, encoding }),
  });
  if (!res.ok) throw new Error("Failed to create blob");
  return res.json();
}

export async function createTree(
  token: string,
  owner: string,
  repo: string,
  baseTree: string | null,
  tree: Array<{ path: string; mode: string; type: string; sha: string | null }>
) {
  const body: Record<string, unknown> = { tree };
  if (baseTree) body.base_tree = baseTree;
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create tree");
  return res.json();
}

export async function createCommit(
  token: string,
  owner: string,
  repo: string,
  message: string,
  tree: string,
  parents: string[]
) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ message, tree, parents }),
  });
  if (!res.ok) throw new Error("Failed to create commit");
  return res.json();
}

export async function updateRef(
  token: string,
  owner: string,
  repo: string,
  ref: string,
  sha: string,
  force = false
) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/git/refs/${ref}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ sha, force }),
  });
  if (!res.ok) {
    let message = "Failed to update ref";
    try {
      const err = await res.json();
      if (err?.message) message = err.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getTreeRecursive(token: string, owner: string, repo: string, treeSha: string) {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    { headers: headers(token) }
  );
  if (!res.ok) throw new Error("Failed to get tree");
  return res.json();
}

// Batch upload files using Git tree API with progress
export async function batchUploadFiles(
  token: string,
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
  message: string,
  branch = "main",
  onProgress?: ProgressCallback
) {
  const branchData = await getRepoBranch(token, owner, repo, branch);
  const latestCommitSha = branchData.commit.sha;
  const baseTreeSha = branchData.commit.commit.tree.sha;

  const treeItems: Array<{ path: string; mode: string; type: string; sha: string | null }> = [];

  // Upload blobs in parallel batches of 5 for speed
  const BATCH_SIZE = 5;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file, j) => {
        onProgress?.({ current: i + j + 1, total: files.length, currentFile: file.path });
        const blob = await createBlob(token, owner, repo, file.content, "base64");
        return { path: file.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
      })
    );
    treeItems.push(...results);
  }

  onProgress?.({ current: files.length, total: files.length, currentFile: "Creating commit..." });

  const tree = await createTree(token, owner, repo, baseTreeSha, treeItems);
  const commit = await createCommit(token, owner, repo, message, tree.sha, [latestCommitSha]);
  await updateRef(token, owner, repo, `heads/${branch}`, commit.sha);

  return commit;
}

// Recursively collect all file paths under a directory
async function collectFilesInDir(
  token: string,
  owner: string,
  repo: string,
  dirPath: string,
  branch: string
): Promise<Array<{ path: string; sha: string }>> {
  const items = await getRepoContents(token, owner, repo, dirPath, branch);
  if (!Array.isArray(items)) return [];
  const results: Array<{ path: string; sha: string }> = [];
  for (const item of items) {
    if (item.type === "file") {
      results.push({ path: item.path, sha: item.sha });
    } else if (item.type === "dir") {
      const subFiles = await collectFilesInDir(token, owner, repo, item.path, branch);
      results.push(...subFiles);
    }
  }
  return results;
}

// Reliable delete: always remove files one-by-one using Contents API
export async function batchDeleteFiles(
  token: string,
  owner: string,
  repo: string,
  paths: string[],
  message: string,
  branch = "main",
  onProgress?: ProgressCallback
) {
  onProgress?.({ current: 0, total: 1, currentFile: "Resolving files..." });

  const filesMap = new Map<string, string>();

  for (const rawPath of paths) {
    const normalizedPath = rawPath.replace(/^\/+|\/+$/g, "");
    if (!normalizedPath) continue;

    try {
      const data = await getRepoContents(token, owner, repo, normalizedPath, branch);

      if (Array.isArray(data)) {
        const dirFiles = await collectFilesInDir(token, owner, repo, normalizedPath, branch);
        for (const file of dirFiles) {
          filesMap.set(file.path, file.sha);
        }
      } else if (data?.type === "file") {
        filesMap.set(data.path, data.sha);
      }
    } catch {
      console.warn("Could not resolve path: " + normalizedPath);
    }
  }

  const filesToDelete = Array.from(filesMap.entries()).map(([path, sha]) => ({ path, sha }));

  if (filesToDelete.length === 0) {
    throw new Error("No files found to delete");
  }

  let deletedCount = 0;

  for (let i = 0; i < filesToDelete.length; i++) {
    const file = filesToDelete[i];
    onProgress?.({
      current: i + 1,
      total: filesToDelete.length,
      currentFile: file.path,
    });

    try {
      const freshData = await getFileContent(token, owner, repo, file.path, branch);
      await deleteFile(token, owner, repo, file.path, freshData.sha, message, branch);
      deletedCount += 1;
    } catch {
      console.warn("Failed to delete: " + file.path);
    }
  }

  if (deletedCount === 0) {
    throw new Error("Failed to delete files");
  }

  if (deletedCount < filesToDelete.length) {
    throw new Error(`Deleted ${deletedCount}/${filesToDelete.length} files. Please retry to delete remaining files.`);
  }

  onProgress?.({ current: filesToDelete.length, total: filesToDelete.length, currentFile: "Done!" });
}

export function getToken(): string | null {
  return localStorage.getItem("github_token");
}

export function setToken(token: string) {
  localStorage.setItem("github_token", token);
}

export function clearToken() {
  localStorage.removeItem("github_token");
}

// Download entire repo as ZIP
export async function downloadRepoZip(token: string, owner: string, repo: string, branch = "main") {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/zipball/${branch}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error("Failed to download repo");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${repo}-${branch}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
