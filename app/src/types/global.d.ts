export {}

declare global {
  interface Window {
    api: { 
      readDicom: (filePath: string[]) => Promise<Record<string, BaseDicomMetadata>>
      writeDicom: (outputPath: string, metadata: Record<string, BaseDicomMetadata>) => Promise<void>
    }
    electronAPI: {
      readMultipleFiles: (filePaths: string[]) => Promise<ArrayBuffer[]>
    }
  }
}
