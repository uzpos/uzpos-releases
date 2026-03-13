export interface IElectronAPI {
  checkForUpdates: () => void;
  onUpdateStatus: (callback: (status: string) => void) => void;
  getConnectivityInfo: () => Promise<{ ip: string; port: string }>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
