export {}

declare global {
  interface Window {
    api: { 
      readDicom: (filePath: string[]) => Promise<Record<string, BaseDicomMetadata>>
    }
    electronAPI: {
      readMultipleFiles: (filePaths: string[]) => Promise<ArrayBuffer[]>
    }
  }
}
