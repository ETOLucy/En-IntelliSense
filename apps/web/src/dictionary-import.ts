export interface ParsedDictionary {
  words: string[];
  rejected: number;
}

const maximumPersonalWords = 50_000;
const validWord = /^[A-Za-z][A-Za-z'-]{1,63}$/;

export function parseDictionary(content: string): ParsedDictionary {
  const words: string[] = [];
  const seen = new Set<string>();
  let rejected = 0;

  for (const rawLine of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || /^\d+$/.test(line)) continue;
    const word = (line.split(/\s+/)[0] ?? '').split('/')[0] ?? '';
    if (!validWord.test(word)) {
      rejected += 1;
      continue;
    }
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(word);
    if (words.length >= maximumPersonalWords) break;
  }

  return { words, rejected };
}

export function mergePersonalWords(
  current: readonly string[],
  imported: readonly string[],
): string[] {
  const merged = new Map<string, string>();
  for (const word of [...current, ...imported]) {
    const key = word.toLowerCase();
    if (!merged.has(key)) merged.set(key, word);
    if (merged.size >= maximumPersonalWords) break;
  }
  return [...merged.values()].sort((left, right) => left.localeCompare(right));
}
