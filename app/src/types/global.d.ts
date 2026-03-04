export {}

declare global {
  interface Window {
    api: { 
      readDicom: (filePaths: string[]) => Promise<Record<string, BaseDicomMetadata>>
      writeDicom: (outputPath: string, metadata: Record<string, BaseDicomMetadata>) => Promise<ExportResult>
      selectExportFolder: ()=>Promise<ExportFolderResult>
    }
    electronAPI: {
      readMultipleFiles: (filePaths: string[]) => Promise<ArrayBuffer[]>
    }
  }
}
