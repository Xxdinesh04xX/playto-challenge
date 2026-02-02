const VERB_LABELS = {
  like_post: "liked your post",
  like_comment: "liked your comment",
  reply: "replied to your comment",
  comment: "commented on your post",
  mention_post: "mentioned you in a post",
  mention_comment: "mentioned you in a comment",
};

export default function NotificationsPanel({
  notifications,
  onClose,
  onOpenPost,
  onOpenProfile,
}) {
  return (
    <div className="absolute right-0 top-12 z-30 w-80 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          Close
        </button>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        {notifications.length === 0 ? (
          <p className="text-slate-400">No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-md border px-3 py-2 ${
                notification.is_read
                  ? "border-slate-800 bg-slate-950/50"
                  : "border-emerald-500/50 bg-emerald-500/10"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenProfile(notification.actor)}
                className="font-semibold text-emerald-300 hover:underline"
              >
                {notification.actor.username}
              </button>{" "}
              {VERB_LABELS[notification.verb] || "sent an update"}
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(notification.created_at).toLocaleString()}</span>
                {notification.post_id ? (
                  <button
                    type="button"
                    onClick={() => onOpenPost(notification.post_id)}
                    className="text-emerald-300 hover:underline"
                  >
                    View
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
