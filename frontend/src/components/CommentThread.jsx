import RichText from "./RichText.jsx";

function CommentItem({
  comment,
  onLike,
  onReplyStart,
  onReplySubmit,
  onReplyCancel,
  replyTargetId,
  replyDraft,
  onReplyDraftChange,
  isReplySubmitting,
  onUserClick,
  onMentionClick,
  depth,
}) {
  const isReplying = replyTargetId === comment.id;

  const handleSubmit = (event) => {
    event.preventDefault();
    onReplySubmit?.(comment.id);
  };

  return (
    <div
      className="rounded-md border border-slate-800 bg-slate-950/40 p-3"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={() => onUserClick?.(comment.author)}
          className="text-emerald-300 hover:underline"
        >
          {comment.author.username}
        </button>
        <span>{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      <p className="mt-2 text-sm text-slate-200">
        <RichText text={comment.content} onMentionClick={onMentionClick} />
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span>{comment.like_count} likes</span>
        <button
          className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
          onClick={() => onLike(comment.id)}
        >
          Like
        </button>
        <button
          className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-200 hover:border-blue-400 hover:text-blue-200"
          onClick={() => {
            if (isReplying) {
              onReplyCancel?.();
            } else {
              onReplyStart?.(comment);
            }
          }}
        >
          {isReplying ? "Close" : "Reply"}
        </button>
      </div>
      {isReplying ? (
        <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
          <p className="text-xs text-slate-400">
            Replying to{" "}
            <span className="text-emerald-300">@{comment.author.username}</span>
          </p>
          <textarea
            value={replyDraft}
            onChange={(event) => onReplyDraftChange?.(event.target.value)}
            className="h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="Type here..."
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isReplySubmitting}
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReplySubmitting ? "Posting..." : "Reply"}
            </button>
            <button
              type="button"
              onClick={onReplyCancel}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {comment.replies && comment.replies.length > 0 ? (
        <div className="mt-3">
          <CommentThread
            comments={comment.replies}
            onLike={onLike}
            onReplyStart={onReplyStart}
            onReplySubmit={onReplySubmit}
            onReplyCancel={onReplyCancel}
            replyTargetId={replyTargetId}
            replyDraft={replyDraft}
            onReplyDraftChange={onReplyDraftChange}
            isReplySubmitting={isReplySubmitting}
            onUserClick={onUserClick}
            onMentionClick={onMentionClick}
            depth={depth + 1}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function CommentThread({
  comments,
  onLike,
  onReplyStart,
  onReplySubmit,
  onReplyCancel,
  replyTargetId,
  replyDraft,
  onReplyDraftChange,
  isReplySubmitting,
  onUserClick,
  onMentionClick,
  depth = 0,
}) {
  if (!comments || comments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onLike={onLike}
          onReplyStart={onReplyStart}
          onReplySubmit={onReplySubmit}
          onReplyCancel={onReplyCancel}
          replyTargetId={replyTargetId}
          replyDraft={replyDraft}
          onReplyDraftChange={onReplyDraftChange}
          isReplySubmitting={isReplySubmitting}
          onUserClick={onUserClick}
          onMentionClick={onMentionClick}
          depth={depth}
        />
      ))}
    </div>
  );
}
