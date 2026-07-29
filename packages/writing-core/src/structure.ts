import type { OutlineItem, WritingContext } from '@writemelo/contracts';

export function getOutline(context: WritingContext): OutlineItem[] {
  const items: OutlineItem[] = [];
  const paragraphs = context.text.split(/\n{2,}/);
  let offset = 0;
  paragraphs.forEach((paragraph, index) => {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      offset += paragraph.length + 2;
      return;
    }
    const start = context.text.indexOf(trimmed, offset);
    const end = start + trimmed.length;
    const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
    items.push({
      id: `paragraph:${index}`,
      start,
      end,
      level: 1,
      label: firstSentence.slice(0, 72),
      note: trimmed.split(/\s+/).length < 12 ? 'Short paragraph' : `${trimmed.split(/\s+/).length} words`,
    });
    offset = end + 2;
  });
  return items;
}

export function getChecklist(context: WritingContext) {
  const trimmed = context.text.trim();
  const words = trimmed.match(/\b[A-Za-z][A-Za-z'-]*\b/g) ?? [];
  const hasClosing = context.format !== 'letter'
    || /\b(?:regards|sincerely|best wishes|thank you)\b/i.test(trimmed);
  return [
    { id: 'has-content', label: 'The draft has meaningful content', passed: words.length >= 10 },
    { id: 'has-ending', label: 'The draft has a clear ending', passed: /[.!?]$/.test(trimmed) },
    { id: 'letter-closing', label: 'The letter has an appropriate closing', passed: hasClosing },
  ];
}
