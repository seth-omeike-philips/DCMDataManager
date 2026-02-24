export {}

declare global {
  interface Window {
    api: { 
      readDicom: (filePath: string[]) => Promise<Promise<BaseDicomMetadata[]>>
    }
  }
}
