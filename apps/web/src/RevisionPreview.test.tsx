import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { compareRevisions } from '@writemelo/revision-core';
import { RevisionPreview } from './RevisionPreview';

describe('RevisionPreview', () => {
  it('renders inserted and removed text from a supplied comparison', () => {
    const comparison = compareRevisions('Old opening.', 'Clear opening.', 'words');
    const html = renderToStaticMarkup(
      <RevisionPreview comparison={comparison} locale="en" />,
    );

    expect(html).toContain('diff-delete');
    expect(html).toContain('Old');
    expect(html).toContain('diff-insert');
    expect(html).toContain('Clear');
    expect(html).toContain('1 modified');
  });
});
