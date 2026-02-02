import { useEffect, useMemo, useRef, useState } from "react";
import {
  createComment,
  createPost,
  fetchLeaderboard,
  fetchNotifications,
  fetchPostComments,
  fetchPostDetail,
  fetchPosts,
  fetchUserProfile,
  likeComment,
  likePost,
  loginUser,
  lookupUser,
  markNotificationsRead,
  signupUser,
} from "./api.js";
import CommentThread from "./components/CommentThread.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import NotificationsPanel from "./components/NotificationsPanel.jsx";
import PostCard from "./components/PostCard.jsx";
import RichText from "./components/RichText.jsx";
import UserProfileDrawer from "./components/UserProfileDrawer.jsx";

const storedUserId = localStorage.getItem("playto_user_id") || "";
const storedUsername = localStorage.getItem("playto_username") || "";
const BANNED_WORDS = [
  "asshole",
  "bastard",
  "bitch",
  "dick",
  "fuck",
  "pedophile",
  "rape",
  "rapist",
  "shit",
  "slut",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const bannedRegex = new RegExp(
  `\\b(${BANNED_WORDS.map(escapeRegExp).join("|")})\\b`,
  "gi"
);

export default function App() {
  const [posts, setPosts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [activeUserId, setActiveUserId] = useState(storedUserId);
  const [activeUsername, setActiveUsername] = useState(storedUsername);
  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [newPost, setNewPost] = useState("");
  const [newComment, setNewComment] = useState("");
  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("new");
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postOffset, setPostOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentOffset, setCommentOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState("");
  const [abuseWarning, setAbuseWarning] = useState("");
  const discussionRef = useRef(null);
  const postSentinelRef = useRef(null);
  const commentSentinelRef = useRef(null);
  const abuseTimerRef = useRef(null);

  const POSTS_PAGE_SIZE = 6;
  const COMMENTS_PAGE_SIZE = 5;

  const trimmedSearch = useMemo(() => searchTerm.trim(), [searchTerm]);

  const triggerAbuseWarning = (found) => {
    if (!found.length) {
      return;
    }
    const list = found.join(", ");
    setAbuseWarning(`Inappropriate words removed: ${list}.`);
    if (abuseTimerRef.current) {
      clearTimeout(abuseTimerRef.current);
    }
    abuseTimerRef.current = setTimeout(() => {
      setAbuseWarning("");
    }, 3000);
  };

  const sanitizeInput = (value) => {
    if (!value) {
      return { cleaned: value, found: [] };
    }
    const matches = value.match(bannedRegex);
    const found = matches
      ? Array.from(new Set(matches.map((word) => word.toLowerCase())))
      : [];
    const cleaned = value.replace(bannedRegex, "");
    return { cleaned, found };
  };

  const handlePostChange = (value) => {
    const { cleaned, found } = sanitizeInput(value);
    if (found.length) {
      triggerAbuseWarning(found);
    }
    setNewPost(cleaned);
  };

  const handleCommentChange = (value) => {
    const { cleaned, found } = sanitizeInput(value);
    if (found.length) {
      triggerAbuseWarning(found);
    }
    setNewComment(cleaned);
  };

  const handleReplyDraftChange = (value) => {
    const { cleaned, found } = sanitizeInput(value);
    if (found.length) {
      triggerAbuseWarning(found);
    }
    setReplyDraft(cleaned);
  };

  const loadLeaderboard = async () => {
    const data = await fetchLeaderboard();
    setLeaderboard(data);
  };

  const loadPosts = async ({ reset = false } = {}) => {
    if (isLoadingPosts) {
      return;
    }
    if (!hasMorePosts && !reset) {
      return;
    }
    setIsLoadingPosts(true);
    try {
      const nextOffset = reset ? 0 : postOffset;
      const data = await fetchPosts({
        search: trimmedSearch,
        sort: sortMode,
        limit: POSTS_PAGE_SIZE,
        offset: nextOffset,
      });
      setPosts((prev) => (reset ? data.results : [...prev, ...data.results]));
      setPostOffset(nextOffset + data.results.length);
      setHasMorePosts(data.has_more);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const loadPostDetail = async (postId) => {
    const data = await fetchPostDetail(postId);
    setSelectedPost(data);
  };

  const loadComments = async ({ reset = false } = {}) => {
    if (!selectedPost) {
      return;
    }
    if (isLoadingComments) {
      return;
    }
    if (!hasMoreComments && !reset) {
      return;
    }
    setIsLoadingComments(true);
    try {
      const nextOffset = reset ? 0 : commentOffset;
      const data = await fetchPostComments(selectedPost.id, {
        limit: COMMENTS_PAGE_SIZE,
        offset: nextOffset,
      });
      setComments((prev) => (reset ? data.results : [...prev, ...data.results]));
      setCommentOffset(nextOffset + data.results.length);
      setHasMoreComments(data.has_more);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const loadNotifications = async (userId = activeUserId) => {
    if (!userId) {
      return;
    }
    const data = await fetchNotifications({ userId, limit: 20 });
    setNotifications(data.results);
  };

  useEffect(() => {
    Promise.all([loadPosts({ reset: true }), loadLeaderboard()]).catch((err) => {
      setError(err.message);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (abuseTimerRef.current) {
        clearTimeout(abuseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadPosts({ reset: true }).catch((err) => setError(err.message));
    }, 300);
    return () => clearTimeout(handle);
  }, [trimmedSearch, sortMode]);

  useEffect(() => {
    if (selectedPost && discussionRef.current) {
      discussionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (selectedPost) {
      setComments([]);
      setCommentOffset(0);
      setHasMoreComments(true);
      setReplyTargetId(null);
      setReplyDraft("");
      loadComments({ reset: true }).catch((err) => setError(err.message));
    }
  }, [selectedPost]);

  useEffect(() => {
    if (!activeUserId) {
      setNotifications([]);
      return;
    }
    loadNotifications().catch((err) => setError(err.message));
    const interval = setInterval(() => {
      loadNotifications().catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [activeUserId]);

  useEffect(() => {
    if (!postSentinelRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadPosts().catch((err) => setError(err.message));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(postSentinelRef.current);
    return () => observer.disconnect();
  }, [postSentinelRef.current, trimmedSearch, sortMode, hasMorePosts, postOffset]);

  useEffect(() => {
    if (!commentSentinelRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadComments().catch((err) => setError(err.message));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(commentSentinelRef.current);
    return () => observer.disconnect();
  }, [commentSentinelRef.current, selectedPost, hasMoreComments, commentOffset]);


  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (authMode === "signup" && authPassword !== authConfirm) {
        setError("Passwords do not match.");
        return;
      }
      const user =
        authMode === "signup"
          ? await signupUser({ username: authUsername, password: authPassword })
          : await loginUser({ username: authUsername, password: authPassword });
      setActiveUserId(String(user.id));
      setActiveUsername(user.username);
      localStorage.setItem("playto_user_id", String(user.id));
      localStorage.setItem("playto_username", user.username);
      setAuthUsername("");
      setAuthPassword("");
      setAuthConfirm("");
      setError("");
      await Promise.all([
        loadLeaderboard(),
        loadPosts({ reset: true }),
        loadNotifications(user.id),
      ]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    setActiveUserId("");
    setActiveUsername("");
    localStorage.removeItem("playto_user_id");
    localStorage.removeItem("playto_username");
    setSelectedPost(null);
    setNotifications([]);
    setProfileData(null);
    setReplyTargetId(null);
    setReplyDraft("");
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    if (!activeUserId) {
      setError("Log in before posting.");
      return;
    }
    setError("");
    try {
      await createPost({ authorId: activeUserId, content: newPost });
      setNewPost("");
      await loadPosts({ reset: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectPost = async (postId) => {
    setError("");
    try {
      await loadPostDetail(postId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!activeUserId || !selectedPost) {
      setError("Select a post and log in.");
      return;
    }
    setError("");
    try {
      await createComment({
        postId: selectedPost.id,
        authorId: activeUserId,
        content: newComment,
      });
      setNewComment("");
      await loadPostDetail(selectedPost.id);
      await loadComments({ reset: true });
      await loadPosts({ reset: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReply = async (commentId, replyText) => {
    if (!activeUserId || !selectedPost) {
      setError("Log in before replying.");
      return false;
    }
    const trimmed = replyText?.trim();
    if (!trimmed) {
      return false;
    }
    setError("");
    try {
      await createComment({
        postId: selectedPost.id,
        authorId: activeUserId,
        content: trimmed,
        parentId: commentId,
      });
      await loadPostDetail(selectedPost.id);
      await loadComments({ reset: true });
      await loadPosts({ reset: true });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleLikePost = async (postId) => {
    if (!activeUserId) {
      setError("Log in before liking.");
      return;
    }
    setError("");
    try {
      await likePost({ postId, userId: activeUserId });
      await loadPosts({ reset: true });
      if (selectedPost && selectedPost.id === postId) {
        await loadPostDetail(postId);
      }
      await loadLeaderboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!activeUserId || !selectedPost) {
      setError("Log in before liking.");
      return;
    }
    setError("");
    try {
      await likeComment({ commentId, userId: activeUserId });
      await loadComments({ reset: true });
      await loadLeaderboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartReply = (comment) => {
    if (!comment) {
      return;
    }
    if (!activeUserId) {
      setError("Log in before replying.");
      return;
    }
    setReplyTargetId(comment.id);
    setReplyDraft("");
  };

  const handleSubmitReply = async (commentId) => {
    if (!commentId) {
      return;
    }
    setIsReplySubmitting(true);
    const success = await handleReply(commentId, replyDraft);
    setIsReplySubmitting(false);
    if (success) {
      setReplyDraft("");
      setReplyTargetId(null);
    }
  };

  const handleCancelReply = () => {
    setReplyDraft("");
    setReplyTargetId(null);
  };

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const openProfileByUser = async (user) => {
    if (!user?.id) {
      return;
    }
    try {
      const data = await fetchUserProfile(user.id);
      setProfileData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const openProfileByUsername = async (username) => {
    try {
      const lookup = await lookupUser(username);
      await openProfileByUser({ id: lookup.id });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenPost = async (postId) => {
    setShowNotifications(false);
    await handleSelectPost(postId);
  };

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState && activeUserId) {
      await markNotificationsRead({ userId: activeUserId });
      await loadNotifications();
    }
  };

  return (
    <div className="min-h-screen">
      {!activeUserId ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <h1 className="text-2xl font-semibold">Playto Community Feed</h1>
            <p className="mt-1 text-sm text-slate-400">
              {authMode === "signup"
                ? "Create your account to join the discussion."
                : "Log in to continue."}
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                }}
                className={`flex-1 rounded-full px-3 py-1 ${
                  authMode === "login"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-300"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setError("");
                }}
                className={`flex-1 rounded-full px-3 py-1 ${
                  authMode === "signup"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-300"
                }`}
              >
                Sign up
              </button>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleAuthSubmit}>
              <input
                value={authUsername}
                onChange={(event) => setAuthUsername(event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Username"
              />
              <input
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                type="password"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Password"
              />
              {authMode === "signup" ? (
                <input
                  value={authConfirm}
                  onChange={(event) => setAuthConfirm(event.target.value)}
                  type="password"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="Re-enter password"
                />
              ) : null}
              <button
                type="submit"
                className="w-full rounded-md bg-emerald-500 px-3 py-2 text-sm text-slate-950 hover:bg-emerald-400"
              >
                {authMode === "signup" ? "Create account" : "Login"}
              </button>
            </form>

            {error ? (
              <p className="mt-3 text-sm text-red-300">{error}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <header className="border-b border-slate-800 bg-slate-900/70">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <h1 className="text-xl font-semibold">Playto Community Feed</h1>
                <p className="text-sm text-slate-400">
                  Active user:{" "}
                  <button
                    type="button"
                    onClick={() => openProfileByUser({ id: Number(activeUserId) })}
                    className="text-emerald-300 hover:underline"
                  >
                    {activeUsername || "none"}
                  </button>
                </p>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className="relative rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
                >
                  Notifications
                  {unreadCount > 0 ? (
                    <span className="ml-2 rounded-full bg-emerald-400 px-2 py-0.5 text-xs text-slate-950">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
                {showNotifications ? (
                  <NotificationsPanel
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                    onOpenPost={handleOpenPost}
                    onOpenProfile={openProfileByUser}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => openProfileByUser({ id: Number(activeUserId) })}
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
                >
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-red-400 hover:text-red-300"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>
          {abuseWarning ? (
            <div className="mx-auto max-w-6xl px-6 pt-4 text-sm text-amber-300">
              {abuseWarning}
            </div>
          ) : null}

          <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-6">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-lg font-semibold">Create a post</h2>
                <form className="mt-3 space-y-3" onSubmit={handleCreatePost}>
                  <textarea
                    value={newPost}
                    onChange={(event) => handlePostChange(event.target.value)}
                    className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    placeholder="Share something with the community..."
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-400"
                  >
                    Post
                  </button>
                </form>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h2 className="text-lg font-semibold">Browse</h2>
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    placeholder="Search posts or authors..."
                  />
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="new">Newest</option>
                    <option value="top">Top liked</option>
                    <option value="discussed">Most discussed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => loadPosts({ reset: true })}
                    className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {posts.length === 0 ? (
                  <p className="text-sm text-slate-400">No posts yet.</p>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onSelect={handleSelectPost}
                      onLike={handleLikePost}
                      isSelected={selectedPost?.id === post.id}
                      onAuthorClick={openProfileByUser}
                      onMentionClick={openProfileByUsername}
                    />
                  ))
                )}
                <div ref={postSentinelRef} className="h-6" />
                {isLoadingPosts ? (
                  <p className="text-xs text-slate-400">Loading more posts...</p>
                ) : null}
                {!hasMorePosts && posts.length > 0 ? (
                  <p className="text-xs text-slate-500">You reached the end.</p>
                ) : null}
              </div>
            </section>

            <aside className="space-y-6">
              <Leaderboard entries={leaderboard} />

              <div
                className="rounded-lg border border-slate-800 bg-slate-900 p-4"
                ref={discussionRef}
              >
                <h2 className="text-lg font-semibold">Threaded Discussion</h2>
                {selectedPost ? (
                  <div className="mt-3 space-y-4">
                    <div>
                      <p className="text-sm text-slate-400">
                        <button
                          type="button"
                          onClick={() => openProfileByUser(selectedPost.author)}
                          className="text-emerald-300 hover:underline"
                        >
                          {selectedPost.author.username}
                        </button>
                      </p>
                      <p className="text-base">
                        <RichText
                          text={selectedPost.content}
                          onMentionClick={openProfileByUsername}
                        />
                      </p>
                    </div>
                    <form className="space-y-2" onSubmit={handleAddComment}>
                      <textarea
                        value={newComment}
                    onChange={(event) => handleCommentChange(event.target.value)}
                        className="h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        placeholder="Write a comment..."
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-500 px-3 py-2 text-sm text-slate-950 hover:bg-emerald-400"
                      >
                        Comment
                      </button>
                    </form>
                    <CommentThread
                      comments={comments}
                      onLike={handleLikeComment}
                      onReplyStart={handleStartReply}
                      onReplySubmit={handleSubmitReply}
                      onReplyCancel={handleCancelReply}
                      replyTargetId={replyTargetId}
                      replyDraft={replyDraft}
                      onReplyDraftChange={handleReplyDraftChange}
                      isReplySubmitting={isReplySubmitting}
                      onUserClick={openProfileByUser}
                      onMentionClick={openProfileByUsername}
                    />
                    {comments.length === 0 && !isLoadingComments ? (
                      <p className="text-sm text-slate-400">No comments yet.</p>
                    ) : null}
                    <div ref={commentSentinelRef} className="h-4" />
                    {isLoadingComments ? (
                      <p className="text-xs text-slate-400">Loading comments...</p>
                    ) : null}
                    {!hasMoreComments && comments.length > 0 ? (
                      <p className="text-xs text-slate-500">No more comments.</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Select a post to view its comment thread.
                  </p>
                )}
              </div>
            </aside>
          </main>

          {error ? (
            <div className="mx-auto max-w-6xl px-6 pb-6 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <UserProfileDrawer
            profile={profileData}
            onClose={() => setProfileData(null)}
          />
        </>
      )}
    </div>
  );
}
