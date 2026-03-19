export {}

declare global {
  interface Window {
    api: { 
      readDicom: (filePaths: string[]) => Promise<Record<string, BaseDicomMetadata>>
      writeDicom: (metadata: Record<string, Record<keyof BaseDicomMetadata, Transformation>>,dataSet: Record<string, BaseDicomMetadata>,uploadRoot:string|null) => Promise<ExportResult>
      selectExportFolder: ()=>Promise<ExportFolderResult>
      hash: (value:string) => Promise<String>
    }
    electronAPI: {
      readMultipleFiles: (filePaths: string[]) => Promise<ArrayBuffer[]>
    }
  }
}
