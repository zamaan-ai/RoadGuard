// Renders "text **bold** text" strings with the bold segments wrapped in <b>
export default function RichText({ text }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>
      )}
    </>
  );
}
