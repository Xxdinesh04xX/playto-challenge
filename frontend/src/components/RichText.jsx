export default function RichText({ text, onMentionClick }) {
  if (!text) {
    return null;
  }

  const parts = [];
  const regex = /@([A-Za-z0-9_]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ type: "mention", value: match[1] });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return (
    <span>
      {parts.map((part, index) => {
        if (part.type === "mention") {
          return (
            <button
              key={`${part.value}-${index}`}
              type="button"
              onClick={() => onMentionClick?.(part.value)}
              className="font-semibold text-emerald-300 hover:underline"
            >
              @{part.value}
            </button>
          );
        }
        return <span key={`${part.value}-${index}`}>{part.value}</span>;
      })}
    </span>
  );
}
