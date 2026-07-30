import type { RevisionComparison } from '@writemelo/revision-core';

interface RevisionPreviewProps {
  comparison: RevisionComparison;
  locale: 'zh-CN' | 'en';
}

export function RevisionPreview({ comparison, locale }: RevisionPreviewProps) {
  const { stats } = comparison;

  return <section className="revision-preview" aria-label={locale === 'en' ? 'Revision changes' : '版本变更'}>
    <div className="revision-stats">
      <span className="modified">{stats.modified} {locale === 'en' ? 'modified' : '处修改'}</span>
      <span className="added">+{stats.added} {locale === 'en' ? 'added' : '处新增'}</span>
      <span className="removed">-{stats.removed} {locale === 'en' ? 'removed' : '处删除'}</span>
    </div>
    <div className="revision-diff">
      {comparison.changed
        ? comparison.segments.map((segment, index) =>
          <span className={`diff-${segment.operation}`} key={`${index}:${segment.operation}`}>
            {segment.value}
          </span>)
        : <p className="no-diff">{locale === 'en' ? 'No changes from the current document.' : '与当前文档没有差异。'}</p>}
    </div>
  </section>;
}
