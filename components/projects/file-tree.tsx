"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

export type FileTreeItem = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  githubPath: string | null;
  blobUrl: string | null;
};

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  file?: FileTreeItem;
  children?: TreeNode[];
};

/** Construye un árbol de carpetas a partir de rutas relativas como "src/assets/an.png". */
function buildTree(files: FileTreeItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  for (const file of files) {
    const segments = file.name.split("/").filter(Boolean);
    let level = root;
    let path = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      path = path ? `${path}/${segment}` : segment;
      const isFile = i === segments.length - 1;

      if (isFile) {
        level.push({ name: segment, path, type: "file", file });
      } else {
        let folder = folderMap.get(path);
        if (!folder) {
          folder = { name: segment, path, type: "folder", children: [] };
          folderMap.set(path, folder);
          level.push(folder);
        }
        level = folder.children!;
      }
    }
  }

  return root;
}

/** Ordena carpetas primero y, dentro de cada grupo, alfabéticamente. */
function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((node) =>
      node.type === "folder" && node.children
        ? { ...node, children: sortTree(node.children) }
        : node,
    )
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
}

export function FileTree({
  files,
  projectId,
}: {
  files: FileTreeItem[];
  projectId: string;
}) {
  const tree = useMemo(() => sortTree(buildTree(files)), [files]);
  // Por defecto todas las carpetas inician cerradas (set vacío).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function renderNodes(nodes: TreeNode[], depth: number) {
    return nodes.map((node) => {
      const paddingLeft = depth * 16 + 8;

      if (node.type === "folder") {
        const isExpanded = expanded.has(node.path);
        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => toggleFolder(node.path)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              style={{ paddingLeft }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 text-amber-500" />
              )}
              <span className="min-w-0 truncate font-medium">{node.name}</span>
            </button>
            {isExpanded &&
              node.children &&
              renderNodes(node.children, depth + 1)}
          </div>
        );
      }

      const file = node.file!;
      return (
        <div
          key={file.id}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted"
          style={{ paddingLeft }}
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{node.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)} · {file.mimeType}
            </p>
          </div>
          {(file.githubPath || file.blobUrl) && (
            <div className="flex shrink-0 items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="h-8">
                <a
                  href={`/api/projects/${projectId}/files/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Ver
                </a>
              </Button>
              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <a
                  href={`/api/projects/${projectId}/files/${file.id}?download=1`}
                  title="Descargar"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="sr-only">Descargar</span>
                </a>
              </Button>
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="rounded-lg border bg-card p-2">{renderNodes(tree, 0)}</div>
  );
}
