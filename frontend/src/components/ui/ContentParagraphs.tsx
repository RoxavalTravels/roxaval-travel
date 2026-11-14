// Preserve editorial paragraph breaks. Long legacy blocks are grouped into
// readable paragraphs without changing words or accepting arbitrary HTML.
export function ContentParagraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\r?\n+/).flatMap(block => {
    const clean = block.trim();
    if (!clean) return [];
    if (clean.length < 400) return [clean];
    const sentences = clean.split(/(?<=[.!?])\s+(?=[\p{Lu}„“«"0-9])/u);
    const groups: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) groups.push(sentences.slice(i, i + 2).join(' '));
    return groups;
  });
  return <div className="mt-3 space-y-4 leading-relaxed text-forest/70">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>;
}
