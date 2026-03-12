export {}

declare global {
  interface Window {
    api: { 
      readDicom: (filePaths: string[]) => Promise<Record<string, BaseDicomMetadata>>
      writeDicom: (metadata: Record<string, BaseDicomMetadata>,uploadRoot:string|null) => Promise<ExportResult>
      selectExportFolder: ()=>Promise<ExportFolderResult>
    }
    electronAPI: {
      readMultipleFiles: (filePaths: string[]) => Promise<ArrayBuffer[]>
    }
  }
}
