"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { addComment, deleteComment, loadMoreComments } from "@/app/actions/comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronDown, MessageSquare, Reply, Send, Trash2 } from "lucide-react";

export type ReplyComment = {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: Date;
  userId: string;
  user: { name: string | null; image: string | null; email: string | null };
  parentId: string | null;
};

export type CommentWithReplies = {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: Date;
  userId: string;
  user: { name: string | null; image: string | null; email: string | null };
  replies: ReplyComment[];
  parentId: string | null;
};

interface CommentsSectionProps {
  projectId: string;
  initialComments: CommentWithReplies[];
  currentUserId?: string;
  isAdmin?: boolean;
  totalComments: number;
}

type ActionComment = {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: Date | string;
  userId: string;
  user: { name: string | null; image: string | null; email: string | null };
  parentId: string | null;
  replies?: ActionReply[];
};

type ActionReply = {
  id: string;
  content: string;
  hidden: boolean;
  createdAt: Date | string;
  userId: string;
  user: { name: string | null; image: string | null; email: string | null };
  parentId: string | null;
};

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "U";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeReply(reply: ActionReply): ReplyComment {
  return {
    ...reply,
    createdAt: new Date(reply.createdAt),
  };
}

function normalizeComment(comment: ActionComment): CommentWithReplies {
  return {
    ...comment,
    createdAt: new Date(comment.createdAt),
    replies: (comment.replies ?? []).map(normalizeReply),
  };
}

function relativeDate(date: Date) {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: es,
  });
}

export function CommentsSection({
  projectId,
  initialComments,
  currentUserId,
  isAdmin = false,
  totalComments,
}: CommentsSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [commentCount, setCommentCount] = useState(totalComments);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, startLoadingMore] = useTransition();

  const loginHref = useMemo(
    () => `/login?callbackUrl=${encodeURIComponent(`/projects/${projectId}`)}`,
    [projectId]
  );

  function openReply(commentId: string) {
    if (!currentUserId) {
      router.push(loginHref);
      return;
    }

    setReplyingTo((current) => (current === commentId ? null : commentId));
  }

  function updateReplyDraft(commentId: string, value: string) {
    setReplyDrafts((current) => ({ ...current, [commentId]: value }));
  }

  function insertReply(parentId: string, reply: ReplyComment) {
    setComments((current) =>
      current.map((comment) => {
        if (comment.id !== parentId) return comment;
        return {
          ...comment,
          replies: [...comment.replies, reply],
        };
      })
    );
  }

  function removeCommentLocally(commentId: string) {
    setComments((current) => {
      if (current.some((comment) => comment.id === commentId)) {
        setCommentCount((count) => Math.max(0, count - 1));
        return current.filter((comment) => comment.id !== commentId);
      }

      return current.map((comment) => ({
        ...comment,
        replies: comment.replies.filter((reply) => reply.id !== commentId),
      }));
    });
  }

  function submitComment(parentId?: string) {
    const rawValue = parentId ? replyDrafts[parentId] ?? "" : commentText;
    const content = rawValue.trim();

    if (!content) {
      toast.error("Escribe un comentario antes de enviarlo.");
      return;
    }

    if (content.length > 2000) {
      toast.error("El comentario no puede superar 2000 caracteres.");
      return;
    }

    startTransition(async () => {
      const result = await addComment(projectId, content, parentId);

      if (result.error || !result.comment) {
        toast.error(result.error ?? "No se pudo publicar el comentario.");
        return;
      }

      const createdComment = normalizeComment(result.comment as ActionComment);

      if (parentId) {
        insertReply(parentId, {
          id: createdComment.id,
          content: createdComment.content,
          hidden: createdComment.hidden,
          createdAt: createdComment.createdAt,
          userId: createdComment.userId,
          user: createdComment.user,
          parentId: createdComment.parentId,
        });
        updateReplyDraft(parentId, "");
        setReplyingTo(null);
      } else {
        setComments((current) => [createdComment, ...current]);
        setCommentText("");
        setCommentCount((count) => count + 1);
      }

      router.refresh();
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const result = await deleteComment(commentId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      removeCommentLocally(commentId);
      router.refresh();
    });
  }

  function handleLoadMore() {
    startLoadingMore(async () => {
      const result = await loadMoreComments(projectId, comments.length);

      if (result.error || !result.comments) {
        toast.error(result.error ?? "No se pudieron cargar más comentarios.");
        return;
      }

      const nextComments = result.comments.map((comment) => normalizeComment(comment as ActionComment));
      setComments((current) => [
        ...current,
        ...nextComments.filter((comment) => !current.some((item) => item.id === comment.id)),
      ]);
    });
  }

  function CommentCard({ comment, isReply = false }: { comment: CommentWithReplies | ReplyComment; isReply?: boolean }) {
    const canDelete = Boolean(currentUserId && (currentUserId === comment.userId || isAdmin));

    return (
      <div className={cn("flex gap-3", isReply && "rounded-lg border bg-muted/20 p-3") }>
        <Avatar className="h-10 w-10 border-0">
          <AvatarImage src={comment.user.image ?? undefined} alt={comment.user.name ?? comment.user.email ?? "Usuario"} />
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {getInitials(comment.user.name, comment.user.email)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium text-foreground break-words">
              {comment.user.name ?? comment.user.email ?? "Usuario"}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{relativeDate(comment.createdAt)}</span>
          </div>

          <p className="break-words text-sm leading-relaxed text-muted-foreground">
            {comment.content}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {!isReply && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openReply(comment.id)}
                className="h-auto px-0 py-0 text-muted-foreground hover:text-foreground"
              >
                <Reply className="mr-1 h-3.5 w-3.5" />
                Responder
              </Button>
            )}

            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="h-auto px-0 py-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Eliminar
              </Button>
            )}
          </div>

          {!isReply && replyingTo === comment.id && (
            <div className="space-y-3 rounded-lg border bg-card p-3">
              <Textarea
                value={replyDrafts[comment.id] ?? ""}
                onChange={(event) => updateReplyDraft(comment.id, event.target.value)}
                placeholder="Escribe una respuesta..."
                maxLength={2000}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => submitComment(comment.id)} disabled={isPending}>
                  <Send className="mr-1 h-3.5 w-3.5" />
                  Responder
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {!isReply && "replies" in comment && comment.replies.length > 0 && (
            <div className="space-y-3 border-l border-border pl-4 pt-1">
              {comment.replies.map((reply) => (
                <CommentCard key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Comentarios ({commentCount})</h2>
      </div>

      <div className="rounded-xl border bg-card p-4">
        {currentUserId ? (
          <div className="space-y-3">
            <Textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Comparte tu opinión sobre este proyecto..."
              maxLength={2000}
              rows={4}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{commentText.trim().length}/2000</span>
              <Button type="button" onClick={() => submitComment()} disabled={isPending}>
                <Send className="mr-2 h-4 w-4" />
                Comentar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Inicia sesión para comentar.</p>
            <Button asChild variant="outline" size="sm">
              <Link href={loginHref}>Iniciar sesión</Link>
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment, index) => (
            <div key={comment.id} className="space-y-6">
              <CommentCard comment={comment} />
              {index < comments.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay comentarios. Sé el primero en participar.
        </div>
      )}

      {comments.length < commentCount && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
            <ChevronDown className="mr-2 h-4 w-4" />
            Cargar más
          </Button>
        </div>
      )}
    </section>
  );
}
