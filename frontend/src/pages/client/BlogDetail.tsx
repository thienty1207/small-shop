import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, Heart, Send } from "lucide-react";
import DOMPurify from "dompurify";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { BlogPostPublic } from "@/lib/admin-api";
import { API_BASE_URL } from "@/lib/api-base";
import {
  decorateBlogContent,
  extractEmbeddedYoutubeIds,
  getYoutubeEmbedUrl,
  getYoutubeWatchUrl,
} from "@/lib/blog-content";

const API_URL = API_BASE_URL;

function resolveImageUrl(url: string | null): string {
  if (!url) return "";
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface BlogReviewPublic {
  id: string;
  blog_post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  hearted: boolean;
  comment: string | null;
  created_at: string;
}

interface BlogReviewsResponse {
  items: BlogReviewPublic[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  hearts_count: number;
}

interface BlogHeartUserPublic {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  hearted_at: string;
}

interface BlogCommentPublic {
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

interface BlogCommentReplyPublic {
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

interface BlogCommentsResponse {
  items: BlogCommentPublic[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface BlogRepliesResponse {
  items: BlogCommentReplyPublic[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface ToggleCommentLikeResult {
  comment_id: string;
  liked: boolean;
  likes_count: number;
}

interface MyLikedCommentIdsResponse {
  ids: string[];
}

interface BlogHeartsResponse {
  items: BlogHeartUserPublic[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

function mapReviewCommentsToCommentRows(reviews: BlogReviewPublic[]): BlogCommentPublic[] {
  return reviews
    .filter((item) => Boolean(item.comment && item.comment.trim()))
    .map((item) => ({
      id: item.id,
      blog_post_id: item.blog_post_id,
      user_id: item.user_id,
      user_name: item.user_name,
      user_avatar: item.user_avatar,
      comment: item.comment!.trim(),
      created_at: item.created_at,
      likes_count: 0,
      replies_count: 0,
    }));
}

function buildReplyNestingMap(replies: BlogCommentReplyPublic[]): Record<string, number> {
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  const memo = new Map<string, number>();

  const resolveLevel = (replyId: string, visited: Set<string>): number => {
    if (memo.has(replyId)) {
      return memo.get(replyId) ?? 0;
    }

    if (visited.has(replyId)) {
      return 0;
    }

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

function orderRepliesByThread(replies: BlogCommentReplyPublic[]): BlogCommentReplyPublic[] {
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  const childrenByParent = new Map<string, BlogCommentReplyPublic[]>();
  const roots: BlogCommentReplyPublic[] = [];

  for (const reply of replies) {
    const parentId = reply.reply_to_reply_id;
    if (parentId && byId.has(parentId)) {
      const children = childrenByParent.get(parentId) ?? [];
      children.push(reply);
      childrenByParent.set(parentId, children);
    } else {
      roots.push(reply);
    }
  }

  const sortByTime = (a: BlogCommentReplyPublic, b: BlogCommentReplyPublic) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  roots.sort(sortByTime);
  for (const children of childrenByParent.values()) {
    children.sort(sortByTime);
  }

  const ordered: BlogCommentReplyPublic[] = [];
  const visit = (reply: BlogCommentReplyPublic, stack: Set<string>) => {
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

export default function BlogDetail() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [post, setPost] = useState<BlogPostPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<BlogCommentPublic[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [heartsCount, setHeartsCount] = useState(0);
  const [heartUsers, setHeartUsers] = useState<BlogHeartUserPublic[]>([]);
  const [heartsLoading, setHeartsLoading] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [myHearted, setMyHearted] = useState(false);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [commentReplies, setCommentReplies] = useState<Record<string, BlogCommentReplyPublic[]>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, { replyId: string; userName: string } | null>>({});
  const [loadingReplyIds, setLoadingReplyIds] = useState<string[]>([]);
  const [submittingReplyIds, setSubmittingReplyIds] = useState<string[]>([]);
  const [likingCommentIds, setLikingCommentIds] = useState<string[]>([]);

  const loadComments = async (postId: string) => {
    const response = await fetch(`${API_URL}/api/blog/${postId}/comments?limit=50&page=1`);
    const payload = (await response.json()) as BlogCommentsResponse;
    if (!response.ok) {
      throw new Error("Không thể tải bình luận");
    }
    setComments(payload.items ?? []);
  };

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/blog/${slug}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as BlogPostPublic;
        if (payload.status !== "published") {
          setPost(null);
          return;
        }

        setPost(payload);
      } catch (nextError) {
        if ((nextError as Error).name !== "AbortError") {
          setError((nextError as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!post) return;

    const controller = new AbortController();
    setReviewsLoading(true);

    fetch(`${API_URL}/api/blog/${post.id}/reviews?limit=20`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Không thể tải tương tác bài viết");
        }

        return (await response.json()) as BlogReviewsResponse;
      })
      .then(async (payload) => {
        setHeartsCount(payload.hearts_count ?? 0);
        setHeartUsers([]);
        setShowHeartsModal(false);
        const fallbackComments = mapReviewCommentsToCommentRows(payload.items ?? []);

        try {
          await loadComments(post.id);
        } catch {
          // Backward compatibility: if /comments endpoint is not available yet,
          // still render comments from the classic /reviews payload.
          setComments(fallbackComments);
        }

        setCommentReplies({});
        setShowReplies({});
        setReplyDrafts({});
        setReplyTargets({});
      })
      .catch((nextError) => {
        if ((nextError as Error).name !== "AbortError") {
          toast.error("Không thể tải tim/bình luận của bài viết");
          setComments([]);
          setHeartsCount(0);
          setHeartUsers([]);
          setShowHeartsModal(false);
          setCommentReplies({});
          setShowReplies({});
          setReplyDrafts({});
          setReplyTargets({});
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setReviewsLoading(false);
        }
      });

    return () => controller.abort();
  }, [post?.id]);

  useEffect(() => {
    if (!post || !isAuthenticated) {
      setMyHearted(false);
      return;
    }

    const controller = new AbortController();
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch(`${API_URL}/api/blog/${post.id}/reviews/me`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json() as Promise<BlogReviewPublic | null>)
      .then((payload) => {
        if (!payload) {
          setMyHearted(false);
          return;
        }
        setMyHearted(Boolean(payload.hearted));
        setMyComment(payload.comment ?? "");
      })
      .catch(() => {
        setMyHearted(false);
      });

    return () => controller.abort();
  }, [post?.id, isAuthenticated]);

  useEffect(() => {
    if (!post || !isAuthenticated) {
      setLikedCommentIds([]);
      return;
    }

    const controller = new AbortController();
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch(`${API_URL}/api/blog/${post.id}/comments/likes/me`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json() as Promise<MyLikedCommentIdsResponse>)
      .then((payload) => setLikedCommentIds(payload.ids ?? []))
      .catch(() => setLikedCommentIds([]));

    return () => controller.abort();
  }, [post?.id, isAuthenticated]);

  const upsertMyReview = async (nextHearted: boolean, nextComment: string) => {
    if (!post) return;
    if (!isAuthenticated) {
      toast.error("Đăng nhập để thả tim hoặc bình luận");
      return;
    }

    setSubmittingReview(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/blog/${post.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hearted: nextHearted,
          comment: nextComment.trim() ? nextComment.trim() : null,
        }),
      });

      const payload = (await response.json()) as BlogReviewPublic | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Không thể lưu tương tác");
      }

      const item = payload as BlogReviewPublic;
      const previousHearted = myHearted;
      setMyHearted(Boolean(item.hearted));
      setHeartsCount((current) => {
        if (previousHearted === item.hearted) return current;
        return item.hearted ? current + 1 : Math.max(0, current - 1);
      });

      setHeartUsers((prev) => {
        if (item.hearted) {
          const exists = prev.some((user) => user.user_id === item.user_id);
          if (exists) return prev;
          return [
            {
              user_id: item.user_id,
              user_name: item.user_name,
              user_avatar: item.user_avatar,
              hearted_at: item.created_at,
            },
            ...prev,
          ];
        }
        return prev.filter((user) => user.user_id !== item.user_id);
      });

      await loadComments(post.id);
    } catch (nextError) {
      toast.error((nextError as Error).message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleToggleHeart = async () => {
    const next = !myHearted;
    await upsertMyReview(next, myComment);
  };

  const handleSubmitComment = async () => {
    await upsertMyReview(myHearted, myComment);
    toast.success("Đã gửi bình luận");
    setMyComment("");
  };

  const loadHeartUsers = async () => {
    if (!post) return;

    setHeartsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/blog/${post.id}/hearts?limit=200`);
      const payload = (await response.json()) as BlogHeartsResponse;
      if (!response.ok) {
        throw new Error("Không thể tải danh sách lượt tim");
      }
      setHeartUsers(payload.items ?? []);
    } catch {
      toast.error("Không thể tải danh sách lượt tim");
      setHeartUsers([]);
    } finally {
      setHeartsLoading(false);
    }
  };

  const handleOpenHeartsModal = async () => {
    setShowHeartsModal(true);
    await loadHeartUsers();
  };

  const loadReplies = async (commentId: string) => {
    setLoadingReplyIds((prev) => (prev.includes(commentId) ? prev : [...prev, commentId]));
    try {
      const response = await fetch(`${API_URL}/api/blog/comments/${commentId}/replies?limit=50&page=1`);
      const payload = (await response.json()) as BlogRepliesResponse;
      if (!response.ok) {
        throw new Error("Không thể tải phản hồi");
      }
      setCommentReplies((prev) => ({ ...prev, [commentId]: payload.items ?? [] }));
    } catch {
      toast.error("Không thể tải phản hồi");
    } finally {
      setLoadingReplyIds((prev) => prev.filter((id) => id !== commentId));
    }
  };

  const handleToggleReplies = async (commentId: string) => {
    const isVisible = Boolean(showReplies[commentId]);
    if (isVisible) {
      setShowReplies((prev) => ({ ...prev, [commentId]: false }));
      return;
    }

    setShowReplies((prev) => ({ ...prev, [commentId]: true }));
    if (!commentReplies[commentId]) {
      await loadReplies(commentId);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.error("Đăng nhập để tim bình luận");
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      toast.error("Phiên đăng nhập không hợp lệ");
      return;
    }

    setLikingCommentIds((prev) => (prev.includes(commentId) ? prev : [...prev, commentId]));
    try {
      const response = await fetch(`${API_URL}/api/blog/comments/${commentId}/likes/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as ToggleCommentLikeResult | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Không thể tim bình luận");
      }

      const result = payload as ToggleCommentLikeResult;
      setComments((prev) =>
        prev.map((item) =>
          item.id === result.comment_id
            ? { ...item, likes_count: result.likes_count }
            : item,
        ),
      );

      setLikedCommentIds((prev) => {
        const exists = prev.includes(commentId);
        if (result.liked && !exists) return [...prev, commentId];
        if (!result.liked && exists) return prev.filter((id) => id !== commentId);
        return prev;
      });
    } catch (nextError) {
      toast.error((nextError as Error).message);
    } finally {
      setLikingCommentIds((prev) => prev.filter((id) => id !== commentId));
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.error("Đăng nhập để phản hồi bình luận");
      return;
    }

    const content = (replyDrafts[commentId] ?? "").trim();
    if (!content) {
      toast.error("Nhập nội dung phản hồi trước khi gửi");
      return;
    }

    const replyTarget = replyTargets[commentId];

    const token = localStorage.getItem("auth_token");
    if (!token) {
      toast.error("Phiên đăng nhập không hợp lệ");
      return;
    }

    setSubmittingReplyIds((prev) => (prev.includes(commentId) ? prev : [...prev, commentId]));
    try {
      const response = await fetch(`${API_URL}/api/blog/comments/${commentId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          reply_to_reply_id: replyTarget?.replyId ?? null,
        }),
      });
      const payload = (await response.json()) as BlogCommentReplyPublic | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Không thể gửi phản hồi");
      }

      const rawReply = payload as BlogCommentReplyPublic;
      const reply: BlogCommentReplyPublic = {
        ...rawReply,
        reply_to_reply_id: rawReply.reply_to_reply_id ?? replyTarget?.replyId ?? null,
        reply_to_user_name: rawReply.reply_to_user_name ?? replyTarget?.userName ?? null,
      };
      setCommentReplies((prev) => ({ ...prev, [commentId]: [...(prev[commentId] ?? []), reply] }));
      setShowReplies((prev) => ({ ...prev, [commentId]: true }));
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      setReplyTargets((prev) => ({ ...prev, [commentId]: null }));
      setComments((prev) =>
        prev.map((item) =>
          item.id === commentId ? { ...item, replies_count: item.replies_count + 1 } : item,
        ),
      );
    } catch (nextError) {
      toast.error((nextError as Error).message);
    } finally {
      setSubmittingReplyIds((prev) => prev.filter((id) => id !== commentId));
    }
  };

  const safeHtml = useMemo(() => {
    const rawHtml = post?.content_html ?? "";
    const enrichedHtml = decorateBlogContent(rawHtml, post?.external_link_previews ?? []);

    return DOMPurify.sanitize(enrichedHtml, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["iframe"],
      ADD_ATTR: [
        "allow",
        "allowfullscreen",
        "alt",
        "class",
        "decoding",
        "loading",
        "referrerpolicy",
        "rel",
        "src",
        "target",
        "title",
      ],
    });
  }, [post?.content_html, post?.external_link_previews]);

  const fallbackYoutubeUrls = useMemo(() => {
    if (!post) return [];

    const embeddedIds = extractEmbeddedYoutubeIds(post.content_html ?? "");

    return post.youtube_urls.filter((url) => {
      const embedUrl = getYoutubeEmbedUrl(url);
      if (!embedUrl) return true;

      const videoId = new URL(embedUrl).pathname.split("/").filter(Boolean).pop();
      return !videoId || !embeddedIds.has(videoId);
    });
  }, [post]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <div className="container mx-auto flex-1 px-4 py-20 pt-24 text-center text-muted-foreground">
          Đang tải bài viết...
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <div className="container mx-auto flex-1 px-4 py-20 pt-24 text-center">
          <p className="text-muted-foreground">Không tìm thấy bài viết.</p>
          <Link to="/blog" className="mt-4 inline-flex items-center gap-2 text-sm underline">
            <ChevronLeft className="h-4 w-4" />
            Quay lại blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="flex-1 pb-16 pt-24">
        <section className="container mx-auto max-w-4xl px-4">
          <Link
            to="/blog"
            className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Blog
          </Link>

          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(post.published_at)}
            </p>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                    className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="text-base text-muted-foreground">{post.excerpt}</p>}
          </div>

          <article
            className="prose prose-neutral mt-10 max-w-none prose-headings:font-semibold prose-a:text-rose-600"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          <section className="mt-10 border-t border-border pt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Tim & bình luận</h3>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleToggleHeart}
                  disabled={submittingReview}
                  className={`inline-flex items-center gap-1 text-sm transition-opacity disabled:opacity-50 ${
                    myHearted ? "text-rose-600" : "text-muted-foreground hover:text-rose-600"
                  }`}
                  aria-label={myHearted ? "Bỏ tim bài viết" : "Tim bài viết"}
                  title={myHearted ? "Bỏ tim bài viết" : "Tim bài viết"}
                >
                  <Heart
                    className={`h-4 w-4 ${myHearted ? "fill-rose-500 text-rose-500" : "fill-transparent text-current"}`}
                  />
                  <span>{heartsCount}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenHeartsModal}
                  className="mt-1 block text-xs text-rose-600 underline underline-offset-4 hover:text-rose-700"
                >
                  Xem ai đã tim
                </button>
              </div>
            </div>

            {isAuthenticated ? (
              <div className="mb-6 rounded-xl border border-border p-4">
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-foreground/20"
                  placeholder="Chia sẻ cảm nhận của bạn về bài viết..."
                  value={myComment}
                  onChange={(event) => setMyComment(event.target.value)}
                />

                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={submittingReview}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submittingReview ? "Đang gửi..." : "Gửi bình luận"}
                </button>
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">
                <Link to="/login" className="text-foreground underline underline-offset-2">Đăng nhập</Link> để tim và bình luận bài viết.
              </div>
            )}

            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-lg bg-foreground/5" />
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Chưa có bình luận nào.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const repliesForComment = commentReplies[comment.id] ?? [];
                  const sortedReplies = orderRepliesByThread(repliesForComment);
                  const replyNestingMap = buildReplyNestingMap(sortedReplies);

                  return (
                  <div key={comment.id} className="flex gap-3">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-foreground/10">
                      {comment.user_avatar ? (
                        <img src={comment.user_avatar} alt={comment.user_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-foreground/50">
                          {comment.user_name[0]}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{comment.user_name}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{comment.comment}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        <button
                          type="button"
                          disabled={likingCommentIds.includes(comment.id)}
                          onClick={() => handleToggleCommentLike(comment.id)}
                          className={`inline-flex items-center gap-1 transition-colors ${
                            likedCommentIds.includes(comment.id)
                              ? "text-rose-600"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              likedCommentIds.includes(comment.id)
                                ? "fill-rose-500 text-rose-500"
                                : "fill-transparent text-current"
                            }`}
                          />
                          {comment.likes_count}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleReplies(comment.id)}
                          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          {Boolean(showReplies[comment.id]) ? "Ẩn phản hồi" : `Phản hồi (${comment.replies_count})`}
                        </button>
                      </div>

                      {Boolean(showReplies[comment.id]) && (
                        <div className="mt-3 space-y-3 rounded-lg border border-border/60 bg-foreground/[0.02] p-3">
                          {loadingReplyIds.includes(comment.id) ? (
                            <p className="text-xs text-muted-foreground">Đang tải phản hồi...</p>
                          ) : repliesForComment.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Chưa có phản hồi nào.</p>
                          ) : (
                            <div className="space-y-3">
                              {sortedReplies.map((reply) => {
                                const nestingLevel = replyNestingMap[reply.id] ?? 0;
                                return (
                                <div
                                  key={reply.id}
                                  className={`flex gap-2.5 ${nestingLevel > 0 ? "border-l border-border/70 pl-3" : ""}`}
                                  style={nestingLevel > 0 ? { marginLeft: `${nestingLevel * 18}px` } : undefined}
                                >
                                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-foreground/10">
                                    {reply.user_avatar ? (
                                      <img src={reply.user_avatar} alt={reply.user_name} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-foreground/50">
                                        {reply.user_name[0]}
                                      </span>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-foreground">{reply.user_name}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(reply.created_at).toLocaleDateString("vi-VN")}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {reply.reply_to_user_name && (
                                        <span className="mr-1 text-sky-600">@{reply.reply_to_user_name}</span>
                                      )}
                                      {reply.content}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplyTargets((prev) => ({
                                          ...prev,
                                          [comment.id]: {
                                            replyId: reply.id,
                                            userName: reply.user_name,
                                          },
                                        }));
                                      }}
                                      className="mt-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                                    >
                                      Phản hồi
                                    </button>
                                  </div>
                                </div>
                              );})}
                            </div>
                          )}

                          {isAuthenticated ? (
                            <div className="space-y-2">
                              {replyTargets[comment.id] && (
                                <div className="flex items-center justify-between rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] text-sky-700">
                                  <span>
                                    Đang phản hồi <span className="font-medium">@{replyTargets[comment.id]?.userName}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyTargets((prev) => ({
                                        ...prev,
                                        [comment.id]: null,
                                      }))
                                    }
                                    className="underline underline-offset-2"
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
                                className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground/20"
                                placeholder={replyTargets[comment.id]
                                  ? `Phản hồi @${replyTargets[comment.id]?.userName}...`
                                  : "Viết phản hồi..."}
                              />
                              <button
                                type="button"
                                disabled={submittingReplyIds.includes(comment.id)}
                                onClick={() => handleSubmitReply(comment.id)}
                                className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background disabled:opacity-60"
                              >
                                <Send className="h-3 w-3" />
                                {submittingReplyIds.includes(comment.id) ? "Đang gửi..." : "Gửi phản hồi"}
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Đăng nhập để phản hồi bình luận.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );})}
              </div>
            )}

            {showHeartsModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
                <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-semibold text-foreground">Những người đã tim bài viết</h4>
                    <button
                      type="button"
                      onClick={() => setShowHeartsModal(false)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Đóng
                    </button>
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground">Tổng cộng {heartsCount} lượt tim</p>

                  {heartsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 animate-pulse rounded-md bg-foreground/5" />
                      ))}
                    </div>
                  ) : heartUsers.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">Chưa có lượt tim nào.</p>
                  ) : (
                    <div className="max-h-80 space-y-3 overflow-auto pr-1">
                      {heartUsers.map((user) => (
                        <div key={user.user_id} className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-foreground/10">
                            {user.user_avatar ? (
                              <img src={user.user_avatar} alt={user.user_name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-foreground/50">
                                {user.user_name[0]}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{user.user_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(user.hearted_at).toLocaleDateString("vi-VN")}
                            </p>
                          </div>

                          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {fallbackYoutubeUrls.length > 0 && (
            <div className="mt-10 border-t border-border pt-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Video YouTube</h3>
              <div className="grid gap-4">
                {fallbackYoutubeUrls.map((url) => (
                  <div key={url} className="overflow-hidden rounded-3xl border border-border bg-foreground/[0.03]">
                    <div className="aspect-video bg-black">
                      {getYoutubeEmbedUrl(url) ? (
                        <iframe
                          src={getYoutubeEmbedUrl(url) ?? undefined}
                          title={post.title}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
                          Không thể nhúng video này.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 p-4">
                      <p className="truncate text-sm text-muted-foreground">{getYoutubeWatchUrl(url)}</p>
                      <a
                        href={getYoutubeWatchUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 text-sm text-rose-600 underline underline-offset-4"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Mở YouTube
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {post.recommended_posts.length > 0 && (
            <div className="mt-14 border-t border-border pt-8">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Gợi ý bài viết</p>
                  <h2 className="text-2xl font-semibold text-foreground">
                    4 bài viết mới nhất
                    {post.primary_tag ? ` thuộc tag ${post.primary_tag.name}` : ""}
                  </h2>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {post.recommended_posts.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    to={`/blog/${item.slug}`}
                    className="group overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg"
                  >
                    <div className="relative h-48 bg-gray-100">
                      {item.cover_image_url ? (
                        <img
                          src={resolveImageUrl(item.cover_image_url)}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                          Chưa có ảnh cover
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {formatDate(item.published_at)}
                      </p>
                      <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{item.title}</h3>
                      {item.excerpt && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>
                      )}
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground">
                        Xem bài viết <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
