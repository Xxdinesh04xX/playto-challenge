import RichText from "./RichText.jsx";

export default function PostCard({
  post,
  onSelect,
  onLike,
  isSelected,
  onAuthorClick,
  onMentionClick,
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        isSelected
          ? "border-emerald-500/70 bg-slate-900"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Posted by{" "}
            <button
              type="button"
              onClick={() => onAuthorClick?.(post.author)}
              className="text-emerald-300 hover:underline"
            >
              {post.author.username}
            </button>
          </p>
          <p className="mt-2 text-base text-slate-100">
            <RichText text={post.content} onMentionClick={onMentionClick} />
          </p>
        </div>
        <button
          className="rounded-md border border-slate-700 px-3 py-1 text-sm hover:border-emerald-400 hover:text-emerald-300"
          onClick={() => onSelect(post.id)}
        >
          {isSelected ? "Viewing" : "View"}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
        <span>
          {post.like_count} likes · {post.comment_count} comments
        </span>
        <button
          className="rounded-md bg-emerald-500/20 px-3 py-1 text-emerald-200 hover:bg-emerald-500/30"
          onClick={() => onLike(post.id)}
        >
          Like
        </button>
      </div>
    </div>
  );
}
