import type { ByokChatRequest, ByokChatResult, ByokConfig, ByokConfigInput } from '@writemelo/contracts';

declare global {
  interface Window {
    writeMeloDesktop?: {
      platform: string;
      version: string;
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
