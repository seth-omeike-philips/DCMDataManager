export {}
import { TagAction } from "@/policy/PolicyLogic"
declare global {
  interface Window {
    api: { 
      readDicom: (filePaths: string[]) => Promise<Record<string, BaseDicomMetadata>>
      writeDicom: (metadata: Record<string, Record<keyof BaseDicomMetadata, TagAction>>,dataSet: Record<string, BaseDicomMetadata>,uploadRoot:string|null) => Promise<ExportResult>
      selectExportFolder: ()=>Promise<ExportFolderResult>
    }
    electronAPI: {
      readMultipleFiles: (filePaths: string[]) => Promise<ArrayBuffer[]>
    }
  }
}
