import type {
  ByokChatRequest, ByokChatResult, ByokConfig, ByokConfigInput, OpenedDictionaryFile, OpenedTextFile,
  SavedTextFile, SaveTextFileInput,
} from '@writemelo/contracts';

declare global {
  interface Window {
    writeMeloDesktop?: {
      platform: string;
      version: string;
      files: {
        open(): Promise<OpenedTextFile | null>;
        openDictionary(): Promise<OpenedDictionaryFile | null>;
        save(input: SaveTextFileInput): Promise<SavedTextFile | null>;
      };
      byok: {
        getConfig(): Promise<ByokConfig | null>;
        saveConfig(config: ByokConfigInput): Promise<ByokConfig>;
        clearConfig(): Promise<void>;
        chat(request: ByokChatRequest): Promise<ByokChatResult>;
      };
    };
  }
}

export {};
