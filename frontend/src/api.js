const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || "Request failed";
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function fetchPosts({ search = "", sort = "new", limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  if (sort) {
    params.set("sort", sort);
  }
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return request(`/posts/?${params.toString()}`);
}

export function fetchPostDetail(postId) {
  return request(`/posts/${postId}/`);
}

export function fetchPostComments(postId, { limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return request(`/posts/${postId}/comments/?${params.toString()}`);
}

export function signupUser({ username, password }) {
  return request("/auth/signup/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function loginUser({ username, password }) {
  return request("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function createPost({ authorId, content }) {
  return request("/posts/", {
    method: "POST",
    body: JSON.stringify({ author_id: authorId, content }),
  });
}

export function createComment({ postId, authorId, content, parentId }) {
  return request(`/posts/${postId}/comments/`, {
    method: "POST",
    body: JSON.stringify({
      author_id: authorId,
      content,
      parent_id: parentId || null,
    }),
  });
}

export function likePost({ postId, userId }) {
  return request(`/posts/${postId}/like/`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export function likeComment({ commentId, userId }) {
  return request(`/comments/${commentId}/like/`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export function fetchLeaderboard() {
  return request("/leaderboard/");
}

export function fetchUserProfile(userId) {
  return request(`/users/${userId}/profile/`);
}

export function lookupUser(username) {
  const params = new URLSearchParams();
  params.set("username", username);
  return request(`/users/lookup/?${params.toString()}`);
}

export function fetchNotifications({ userId, limit = 20, offset = 0, unreadOnly = false } = {}) {
  const params = new URLSearchParams();
  params.set("user_id", String(userId));
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (unreadOnly) {
    params.set("unread_only", "1");
  }
  return request(`/notifications/?${params.toString()}`);
}

export function markNotificationsRead({ userId, notificationId } = {}) {
  return request("/notifications/mark-read/", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      notification_id: notificationId || null,
    }),
  });
}
