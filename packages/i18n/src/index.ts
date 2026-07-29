import type { UiLocale } from '@writemelo/contracts';

const messages = {
  en: {
    documents: 'Documents', issues: 'Issues', outline: 'Outline', assistant: 'AI',
    newDocument: 'New document', untitled: 'Untitled', saved: 'Saved locally',
    saving: 'Saving...', words: 'words', noIssues: 'No local issues found',
    localOnly: 'Local only', aiOff: 'AI off', aiTitle: 'Optional AI assistant',
    aiDescription: 'AI off means no API calls or provider charges. Local tools stay available.',
    enableAi: 'Enable AI', cancel: 'Cancel', fullDocument: 'Attach the current full document to every question until disabled',
    askAi: 'Ask AI', selectIssue: 'Select an issue to see its explanation.',
    checklist: 'Submission checklist', settings: 'Writing settings', variant: 'English variant',
    format: 'Format', level: 'Level', deleteDocument: 'Delete document',
    revisionHistory: 'Revision history', restore: 'Restore',
  },
  'zh-CN': {
    documents: '文档', issues: '问题', outline: '大纲', assistant: 'AI',
    newDocument: '新建文档', untitled: '未命名文档', saved: '已保存到本机',
    saving: '正在保存...', words: '词', noIssues: '未发现本地问题',
    localOnly: '仅本地', aiOff: 'AI 已关闭', aiTitle: '可选 AI 助手',
    aiDescription: 'AI 关闭时不调用 API，不产生 AI 供应商费用；本地工具照常可用。',
    enableAi: '启用 AI', cancel: '取消', fullDocument: '附带当前全文：关闭前，每次提问都会发送当前文档',
    askAi: '询问 AI', selectIssue: '选择一个问题查看说明。',
    checklist: '提交检查', settings: '写作设置', variant: '英语变体',
    format: '文体', level: '难度', deleteDocument: '删除文档',
    revisionHistory: '版本历史', restore: '恢复',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
export function t(locale: UiLocale, key: MessageKey): string {
  return messages[locale][key];
}
