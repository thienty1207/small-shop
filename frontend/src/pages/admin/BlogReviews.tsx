import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Heart, MessageSquare, Reply, Send, Shield, Trash2 } from "lucide-react";

import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminDel, adminGet, adminPost } from "@/lib/admin-api";

interface BlogReviewItem {
  id: string;
  blog_post_id: string;
  blog_post_title: string;
  blog_post_slug: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  hearted: boolean;
  comment: string | null;
  created_at: string;
}

interface BlogReviewsResponse {
  items: BlogReviewItem[];
  total: number;
  page: number;
  total_pages: number;
}

interface ThreadHeartUser {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  hearted_at: string;
}

interface ThreadComment {
  id: string;
  blog_post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  comment: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
}

interface ThreadReply {
  id: string;
  blog_post_id: string;
  parent_review_id: string;
  reply_to_reply_id?: string | null;
  reply_to_user_id?: string | null;
  reply_to_user_name?: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
}

interface PostThreadPayload {
  post: {
    id: string;
    title: string;
    slug: string;
  };
  hearts: {
    total: number;
    items: ThreadHeartUser[];
  };
  comments: {
    total: number;
    items: ThreadComment[];
  };
  replies_by_comment_id: Record<string, ThreadReply[]>;
}

function buildReplyNestingMap(replies: ThreadReply[]): Record<string, number> {
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  const memo = new Map<string, number>();

  const resolveLevel = (replyId: string, visited: Set<string>): number => {
    if (memo.has(replyId)) return memo.get(replyId) ?? 0;
    if (visited.has(replyId)) return 0;

    visited.add(replyId);
    const reply = byId.get(replyId);
    if (!reply?.reply_to_reply_id) {
      memo.set(replyId, 0);
      return 0;
    }

    const parent = byId.get(reply.reply_to_reply_id);
    if (!parent) {
      memo.set(replyId, 1);
      return 1;
    }

    const level = Math.min(3, resolveLevel(parent.id, visited) + 1);
    memo.set(replyId, level);
    return level;
  };

  for (const reply of replies) {
    resolveLevel(reply.id, new Set<string>());
  }

  return Object.fromEntries(memo.entries());
}

function orderRepliesByThread(replies: ThreadReply[]): ThreadReply[] {
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  const childrenByParent = new Map<string, ThreadReply[]>();
  const roots: ThreadReply[] = [];

  for (const reply of replies) {
    const parentId = reply.reply_to_reply_id;
    if (parentId && byId.has(parentId)) {
      const current = childrenByParent.get(parentId) ?? [];
      current.push(reply);
      childrenByParent.set(parentId, current);
    } else {
      roots.push(reply);
    }
  }

  const sortByTime = (a: ThreadReply, b: ThreadReply) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  roots.sort(sortByTime);
  for (const children of childrenByParent.values()) {
    children.sort(sortByTime);
  }

  const ordered: ThreadReply[] = [];
  const visit = (reply: ThreadReply, stack: Set<string>) => {
    if (stack.has(reply.id)) return;
    ordered.push(reply);

    const children = childrenByParent.get(reply.id) ?? [];
    stack.add(reply.id);
    for (const child of children) {
      visit(child, stack);
    }
    stack.delete(reply.id);
  };

  for (const root of roots) {
    visit(root, new Set<string>());
  }

  return ordered;
}

export default function AdminBlogReviews() {
  const [data, setData] = useState<BlogReviewsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [thread, setThread] = useState<PostThreadPayload | null>(null);

  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, { replyId: string; userName: string } | null>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const load = async (nextPage: number) => {
    setLoading(true);
    try {
      const response = await adminGet<BlogReviewsResponse>(
        `/api/admin/blog-reviews?page=${nextPage}&limit=20`,
      );
      setData(response);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [page]);

  const loadThread = async (postId: string) => {
    setThreadLoading(true);
    setThreadError(null);
    setSelectedPostId(postId);
    try {
      let payload: PostThreadPayload | null = null;
      const endpointCandidates = [
        `/api/admin/blog-reviews/post/${postId}/thread`,
        `/api/admin/blog/${postId}/thread`,
      ];

      let lastError: unknown = null;
      for (const endpoint of endpointCandidates) {
        try {
          payload = await adminGet<PostThreadPayload>(endpoint);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!payload) {
        throw lastError instanceof Error ? lastError : new Error("Không tải được chi tiết bài viết");
      }

      setThread(payload);
      setReplyDrafts({});
      setReplyTargets({});
      setExpandedComments({});
    } catch (error) {
      setThread(null);
      setThreadError((error as Error).message);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa tương tác này?")) return;
    setDeleting(id);
    try {
      await adminDel(`/api/admin/blog-reviews/${id}`);
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((item) => item.id !== id),
              total: Math.max(0, prev.total - 1),
            }
          : prev,
      );

      if (selectedPostId) {
        await loadThread(selectedPostId);
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Xóa bình luận này và toàn bộ phản hồi?")) return;
    setDeleting(commentId);
    try {
      await adminDel(`/api/admin/blog-reviews/comments/${commentId}`);
      setThread((prev) => {
        if (!prev) return prev;
        const nextRepliesMap = { ...prev.replies_by_comment_id };
        delete nextRepliesMap[commentId];
        return {
          ...prev,
          comments: {
            ...prev.comments,
            total: Math.max(0, prev.comments.total - 1),
            items: prev.comments.items.filter((c) => c.id !== commentId),
          },
          replies_by_comment_id: nextRepliesMap,
        };
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!confirm("Xóa phản hồi này?")) return;
    setDeleting(replyId);
    try {
      await adminDel(`/api/admin/blog-reviews/replies/${replyId}`);
      setThread((prev) => {
        if (!prev) return prev;
        const currentReplies = prev.replies_by_comment_id[commentId] ?? [];
        return {
          ...prev,
          replies_by_comment_id: {
            ...prev.replies_by_comment_id,
            [commentId]: currentReplies.filter((reply) => reply.id !== replyId),
          },
          comments: {
            ...prev.comments,
            items: prev.comments.items.map((comment) =>
              comment.id === commentId
                ? { ...comment, replies_count: Math.max(0, comment.replies_count - 1) }
                : comment,
            ),
          },
        };
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleAdminReply = async (commentId: string) => {
    const content = (replyDrafts[commentId] ?? "").trim();
    if (!content) return;

    const target = replyTargets[commentId];
    setSubmittingCommentId(commentId);
    try {
      const payload = await adminPost<{ reply: ThreadReply }>(
        `/api/admin/blog-reviews/comments/${commentId}/replies`,
        {
          content,
          reply_to_reply_id: target?.replyId ?? null,
        },
      );

      setThread((prev) => {
        if (!prev) return prev;
        const rawReply = payload.reply;
        const reply: ThreadReply = {
          ...rawReply,
          reply_to_reply_id: rawReply.reply_to_reply_id ?? target?.replyId ?? null,
          reply_to_user_name: rawReply.reply_to_user_name ?? target?.userName ?? null,
        };

        const currentReplies = prev.replies_by_comment_id[commentId] ?? [];
        return {
          ...prev,
          replies_by_comment_id: {
            ...prev.replies_by_comment_id,
            [commentId]: [...currentReplies, reply],
          },
          comments: {
            ...prev.comments,
            items: prev.comments.items.map((comment) =>
              comment.id === commentId
                ? { ...comment, replies_count: comment.replies_count + 1 }
                : comment,
            ),
          },
        };
      });

      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      setReplyTargets((prev) => ({ ...prev, [commentId]: null }));
      setExpandedComments((prev) => ({ ...prev, [commentId]: true }));
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setSubmittingCommentId(null);
    }
  };

  return (
    <AdminLayout title="Đánh giá bài viết">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">{data ? `${data.total} tương tác` : "Đang tải..."}</p>
        </div>

        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-gray-900" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-10">
            <MessageSquare className="h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-400">Chưa có tương tác bài viết nào.</p>
          </div>
        ) : (
          <>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            {threadLoading ? (
              <p className="text-sm text-gray-400">Đang tải chi tiết bài viết...</p>
            ) : threadError ? (
              <p className="text-sm text-red-400">{threadError}</p>
            ) : !thread ? (
              <p className="text-sm text-gray-500">Bấm “Xem đầy đủ” để xem toàn bộ tim, comment, reply của một bài viết.</p>
            ) : (
              <div className="space-y-5">
                <div className="border-b border-gray-800 pb-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Đang xem bài viết</p>
                  <p className="text-lg font-semibold text-white">{thread.post.title}</p>
                  <p className="text-xs text-gray-500">/{thread.post.slug}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                    <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-white">
                      <Heart className="h-4 w-4 text-rose-500" />
                      Lượt tim ({thread.hearts.total})
                    </p>
                    {thread.hearts.items.length === 0 ? (
                      <p className="text-xs text-gray-500">Chưa có lượt tim.</p>
                    ) : (
                      <div className="max-h-48 space-y-2 overflow-auto pr-1">
                        {thread.hearts.items.map((heart) => (
                          <div key={heart.user_id} className="text-xs text-gray-300">
                            <span className="font-medium text-white">{heart.user_name}</span>
                            <span className="ml-2 text-gray-500">
                              {new Date(heart.hearted_at).toLocaleString("vi-VN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                      <MessageSquare className="h-4 w-4 text-sky-400" />
                      Bình luận ({thread.comments.total})
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Admin có thể xóa comment/reply và trả lời với danh tính <span className="text-sky-400">Admin hệ thống</span>.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {thread.comments.items.length === 0 ? (
                    <p className="text-sm text-gray-500">Bài viết này chưa có bình luận.</p>
                  ) : (
                    thread.comments.items.map((comment) => {
                      const replies = thread.replies_by_comment_id[comment.id] ?? [];
                      const sortedReplies = orderRepliesByThread(replies);
                      const nestingMap = buildReplyNestingMap(sortedReplies);
                      const isExpanded = expandedComments[comment.id] ?? false;

                      return (
                        <div key={comment.id} className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{comment.user_name}</p>
                              <p className="mt-1 text-sm text-gray-300">{comment.comment}</p>
                              <p className="mt-1 text-[11px] text-gray-500">
                                {new Date(comment.created_at).toLocaleString("vi-VN")} • {comment.likes_count} tim
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:bg-red-400/10 hover:text-red-400"
                              disabled={deleting === comment.id}
                              onClick={() => void handleDeleteComment(comment.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>

                          {sortedReplies.length > 0 && (
                            <div className="mt-3">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
                                onClick={() => {
                                  setExpandedComments((prev) => ({
                                    ...prev,
                                    [comment.id]: !(prev[comment.id] ?? false),
                                  }));
                                }}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                {isExpanded ? "Ẩn" : "Xem"} {sortedReplies.length} phản hồi
                              </button>
                            </div>
                          )}

                          {isExpanded && sortedReplies.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {sortedReplies.map((reply) => {
                                const level = nestingMap[reply.id] ?? 0;
                                const isSystemAdmin = reply.user_name.toLowerCase().includes("admin hệ thống");
                                return (
                                  <div
                                    key={reply.id}
                                    className={`rounded-md border border-gray-800 bg-gray-900 p-2.5 ${level > 0 ? "border-l-2 border-l-sky-700" : ""}`}
                                    style={level > 0 ? { marginLeft: `${level * 18}px` } : undefined}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-[11px] text-gray-300">
                                          <span className="font-semibold text-white">{reply.user_name}</span>
                                          {isSystemAdmin && (
                                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">
                                              <Shield className="h-2.5 w-2.5" />
                                              Admin
                                            </span>
                                          )}
                                          {reply.reply_to_user_name && (
                                            <>
                                              <span className="mx-1.5 text-gray-500">trả lời</span>
                                              <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">
                                                @{reply.reply_to_user_name}
                                              </span>
                                            </>
                                          )}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-200">{reply.content}</p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                          {new Date(reply.created_at).toLocaleString("vi-VN")}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-gray-500 hover:bg-sky-400/10 hover:text-sky-300"
                                          onClick={() => {
                                            setReplyTargets((prev) => ({
                                              ...prev,
                                              [comment.id]: { replyId: reply.id, userName: reply.user_name },
                                            }));
                                            setExpandedComments((prev) => ({ ...prev, [comment.id]: true }));
                                          }}
                                        >
                                          <Reply size={13} />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-gray-500 hover:bg-red-400/10 hover:text-red-400"
                                          disabled={deleting === reply.id}
                                          onClick={() => void handleDeleteReply(comment.id, reply.id)}
                                        >
                                          <Trash2 size={13} />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="mt-3 rounded-md border border-gray-800 bg-gray-900 p-2.5">
                            {replyTargets[comment.id] && (
                              <div className="mb-2 flex items-center justify-between rounded border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
                                <span>
                                  Đang trả lời <span className="text-sky-200">@{replyTargets[comment.id]?.userName}</span>
                                </span>
                                <button
                                  type="button"
                                  className="underline underline-offset-2"
                                  onClick={() =>
                                    setReplyTargets((prev) => ({
                                      ...prev,
                                      [comment.id]: null,
                                    }))
                                  }
                                >
                                  Hủy
                                </button>
                              </div>
                            )}

                            <textarea
                              rows={2}
                              value={replyDrafts[comment.id] ?? ""}
                              onChange={(event) =>
                                setReplyDrafts((prev) => ({ ...prev, [comment.id]: event.target.value }))
                              }
                              className="w-full rounded-md border border-gray-700 bg-gray-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500"
                              placeholder={replyTargets[comment.id]
                                ? `Trả lời @${replyTargets[comment.id]?.userName}...`
                                : "Trả lời với danh Admin hệ thống..."}
                            />

                            <div className="mt-2 flex justify-end">
                              <Button
                                size="sm"
                                className="gap-2 bg-sky-600 text-white hover:bg-sky-500"
                                disabled={submittingCommentId === comment.id}
                                onClick={() => void handleAdminReply(comment.id)}
                              >
                                <Send size={13} />
                                {submittingCommentId === comment.id ? "Đang gửi..." : "Trả lời"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs uppercase text-gray-400">
                    <th className="px-4 py-3 text-left">Người dùng</th>
                    <th className="px-4 py-3 text-left">Bài viết</th>
                    <th className="px-4 py-3 text-left">Tim</th>
                    <th className="px-4 py-3 text-left">Bình luận</th>
                    <th className="px-4 py-3 text-left">Ngày</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 font-medium text-white">{item.user_name}</td>
                      <td className="px-4 py-3 text-gray-300">{item.blog_post_title}</td>
                      <td className="px-4 py-3">
                        {item.hearted ? (
                          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="max-w-sm truncate px-4 py-3 text-gray-400">
                        {item.comment ?? <span className="italic text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                            onClick={() => void loadThread(item.blog_post_id)}
                          >
                            <Eye size={14} />
                            Xem chi tiết
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:bg-red-400/10 hover:text-red-400"
                            disabled={deleting === item.id}
                            onClick={() => void handleDelete(item.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {data.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.user_name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    {item.hearted && <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />}
                  </div>

                  <p className="line-clamp-2 text-sm text-gray-300">{item.blog_post_title}</p>

                  <p className="mt-2 rounded-md bg-gray-900 px-2 py-1.5 text-xs text-gray-400">
                    {item.comment ?? <span className="italic text-gray-600">Không có bình luận</span>}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                      onClick={() => void loadThread(item.blog_post_id)}
                    >
                      <Eye size={14} />
                      Xem chi tiết
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:bg-red-400/10 hover:text-red-400"
                      disabled={deleting === item.id}
                      onClick={() => void handleDelete(item.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {data.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Trang {page} / {data.total_pages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
