const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');
import type { ByokChatRequest, ByokChatResult, ByokConfig, ByokConfigInput } from '@writemelo/contracts';

contextBridge.exposeInMainWorld('writeMeloDesktop', Object.freeze({
  platform: process.platform,
  version: process.env.npm_package_version ?? '2.0.0-beta.1',
  byok: Object.freeze({
    getConfig: (): Promise<ByokConfig | null> => ipcRenderer.invoke('byok:get-config'),
    saveConfig: (config: ByokConfigInput): Promise<ByokConfig> => ipcRenderer.invoke('byok:save-config', config),
    clearConfig: (): Promise<void> => ipcRenderer.invoke('byok:clear-config'),
    chat: (request: ByokChatRequest): Promise<ByokChatResult> => ipcRenderer.invoke('byok:chat', request),
  }),
}));
