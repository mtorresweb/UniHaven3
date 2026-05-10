import "server-only";
import { Octokit } from "octokit";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.GITHUB_USERNAME!;

export type GitHubFile = {
  path: string; // path inside repo, e.g. "documento-principal.pdf"
  content: Buffer; // raw file buffer
  encoding?: "base64" | "utf-8";
};

/** Generate a safe repo slug from project title and year */
export function buildRepoName(
  type: string,
  title: string,
  year: number
): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${year}-${type.toLowerCase()}-${slug}`;
}

/** Create a private GitHub repository for a project */
export async function createProjectRepo(
  repoName: string,
  description: string
): Promise<string> {
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name: repoName,
    description,
    private: true,
    auto_init: false,
    has_issues: false,
    has_wiki: false,
    has_projects: false,
  });
  return data.full_name; // "owner/repo-name"
}

/** Commit multiple files to a repo in a single tree (efficient for initial upload) */
export async function commitFilesToRepo(
  repo: string,
  files: GitHubFile[],
  message: string,
  branch = "main"
): Promise<string> {
  const [owner, repoName] = repo.split("/");

  // 1. Create blobs for each file
  const blobs = await Promise.all(
    files.map((f) =>
      octokit.rest.git.createBlob({
        owner,
        repo: repoName,
        content: f.content.toString("base64"),
        encoding: "base64",
      })
    )
  );

  // 2. Get or create base tree SHA
  let baseTreeSha: string | undefined;
  let parentSha: string | undefined;
  try {
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
    });
    parentSha = ref.object.sha;
    const { data: commit } = await octokit.rest.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: parentSha,
    });
    baseTreeSha = commit.tree.sha;
  } catch {
    // Repo is empty — no base tree
  }

  // 3. Create tree
  const { data: tree } = await octokit.rest.git.createTree({
    owner,
    repo: repoName,
    base_tree: baseTreeSha,
    tree: files.map((f, i) => ({
      path: f.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: blobs[i].data.sha,
    })),
  });

  // 4. Create commit
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo: repoName,
    message,
    tree: tree.sha,
    ...(parentSha ? { parents: [parentSha] } : { parents: [] }),
  });

  // 5. Update or create branch ref
  if (parentSha) {
    await octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });
  } else {
    await octokit.rest.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${branch}`,
      sha: newCommit.sha,
    });
  }

  return newCommit.sha;
}

/** Make a repository public (called when admin approves a project) */
export async function makeRepoPublic(repo: string): Promise<void> {
  const [owner, repoName] = repo.split("/");
  await octokit.rest.repos.update({
    owner,
    repo: repoName,
    private: false,
  });
}

/** Make a repository private (called when a project is rejected/hidden) */
export async function makeRepoPrivate(repo: string): Promise<void> {
  const [owner, repoName] = repo.split("/");
  await octokit.rest.repos.update({
    owner,
    repo: repoName,
    private: true,
  });
}

/** Get commits for a repo (for version history display) */
export async function getRepoCommits(repo: string) {
  const [owner, repoName] = repo.split("/");
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo: repoName,
    per_page: 20,
  });
  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.author?.date,
    url: c.html_url,
  }));
}

/** Build the public GitHub URL for a repo */
export function repoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

/** Generate a README.md for a project */
export function generateReadme(opts: {
  title: string;
  abstract: string;
  type: string;
  area: string;
  year: number;
  authors: string[];
  license: string;
  keywords: string[];
}): Buffer {
  const typeLabel = { THESIS: "Tesis de Grado", RESEARCH: "Investigación", CLASSROOM: "Proyecto de Aula" }[opts.type] ?? opts.type;
  const md = `# ${opts.title}

> **${typeLabel}** · ${opts.area} · ${opts.year}

## Resumen

${opts.abstract}

## Autores

${opts.authors.map((a) => `- ${a}`).join("\n")}

## Palabras clave

${opts.keywords.join(", ")}

## Licencia

${opts.license}

---

*Proyecto publicado en [UniHaven](https://unihaven.vercel.app) — Repositorio Académico de la Universidad Popular del Cesar.*
`;
  return Buffer.from(md, "utf-8");
}
