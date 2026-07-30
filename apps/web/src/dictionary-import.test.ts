import { describe, expect, it } from 'vitest';
import { mergePersonalWords, parseDictionary } from './dictionary-import';

describe('personal dictionary import', () => {
  it('parses plain text and Hunspell entries without importing flags', () => {
    expect(parseDictionary('4\nWriteMelo/S\nProTerm\nwell-being\ninvalid_word').words)
      .toEqual(['WriteMelo', 'ProTerm', 'well-being']);
    expect(parseDictionary('4\nWriteMelo/S\ninvalid_word').rejected).toBe(1);
  });

  it('merges case-insensitively without replacing existing spelling', () => {
    expect(mergePersonalWords(['WriteMelo'], ['writemelo', 'ProTerm']))
      .toEqual(['ProTerm', 'WriteMelo']);
  });
});
