export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI; // ✅ Make sure this is `electronAPI`
  }
}

export {};
