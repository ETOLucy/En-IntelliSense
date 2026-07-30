const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');
import type {
  ByokChatRequest, ByokChatResult, ByokConfig, ByokConfigInput, OpenedDictionaryFile, OpenedTextFile,
  SavedTextFile, SaveTextFileInput,
} from '@writemelo/contracts';

contextBridge.exposeInMainWorld('writeMeloDesktop', Object.freeze({
  platform: process.platform,
  version: process.env.npm_package_version ?? '2.0.0-beta.1',
  files: Object.freeze({
    open: (): Promise<OpenedTextFile | null> => ipcRenderer.invoke('files:open'),
    openDictionary: (): Promise<OpenedDictionaryFile | null> => ipcRenderer.invoke('files:open-dictionary'),
    save: (input: SaveTextFileInput): Promise<SavedTextFile | null> => ipcRenderer.invoke('files:save', input),
  }),
  byok: Object.freeze({
    getConfig: (): Promise<ByokConfig | null> => ipcRenderer.invoke('byok:get-config'),
    saveConfig: (config: ByokConfigInput): Promise<ByokConfig> => ipcRenderer.invoke('byok:save-config', config),
    clearConfig: (): Promise<void> => ipcRenderer.invoke('byok:clear-config'),
    chat: (request: ByokChatRequest): Promise<ByokChatResult> => ipcRenderer.invoke('byok:chat', request),
  }),
}));
