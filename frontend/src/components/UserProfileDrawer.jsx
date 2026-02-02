export default function UserProfileDrawer({ profile, onClose }) {
  if (!profile) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-950/70">
      <div className="h-full w-full max-w-md border-l border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-400">Profile</p>
            <h3 className="text-xl font-semibold">{profile.username}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Posts</p>
            <p className="text-lg font-semibold">{profile.stats.posts}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Comments</p>
            <p className="text-lg font-semibold">{profile.stats.comments}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Post Likes</p>
            <p className="text-lg font-semibold">{profile.stats.post_likes}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Comment Likes</p>
            <p className="text-lg font-semibold">{profile.stats.comment_likes}</p>
          </div>
          <div className="col-span-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
            <p className="text-xs text-emerald-200">Karma (24h)</p>
            <p className="text-lg font-semibold text-emerald-200">
              {profile.stats.karma_last_24h}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold">Recent Posts</h4>
          <div className="mt-2 space-y-2 text-sm text-slate-300">
            {profile.recent_posts.length === 0 ? (
              <p className="text-slate-500">No posts yet.</p>
            ) : (
              profile.recent_posts.map((post) => (
                <div key={post.id} className="rounded-md border border-slate-800 bg-slate-950 p-2">
                  <p className="text-xs text-slate-500">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                  <p>{post.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold">Recent Comments</h4>
          <div className="mt-2 space-y-2 text-sm text-slate-300">
            {profile.recent_comments.length === 0 ? (
              <p className="text-slate-500">No comments yet.</p>
            ) : (
              profile.recent_comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-slate-800 bg-slate-950 p-2">
                  <p className="text-xs text-slate-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                  <p>{comment.content}</p>
                  <p className="text-xs text-slate-500">Post #{comment.post_id}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
