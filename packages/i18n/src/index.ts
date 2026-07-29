import type { UiLocale } from '@writemelo/contracts';

const messages = {
  en: {
    documents: 'Documents', issues: 'Issues', outline: 'Outline', assistant: 'AI',
    newDocument: 'New document', untitled: 'Untitled', saved: 'Saved locally',
    saving: 'Saving...', words: 'words', noIssues: 'No local issues found',
    localOnly: 'Local only', aiOff: 'AI off', aiTitle: 'Optional AI assistant',
    aiDescription: 'Local writing tools work without an account or AI.',
    enableAi: 'Enable AI', cancel: 'Cancel', fullDocument: 'Allow sending the full document',
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
    aiDescription: '本地写作工具无需账号，也无需 AI。',
    enableAi: '启用 AI', cancel: '取消', fullDocument: '允许发送整篇文档',
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
