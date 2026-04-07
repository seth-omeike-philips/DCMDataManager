export {}
import { TagAction } from "@/policy/PolicyLogic"
declare global {
  interface Window {
    api: { 
      readDicom: (filePaths: string[]) => Promise<Record<string, BaseDicomMetadata>>
      writeDicom: (metadata: Record<string, Record<keyof BaseDicomMetadata, TagAction>>,dataSet: Record<string, BaseDicomMetadata>,uploadRoot:string|null) => Promise<ExportResult>
      selectExportFolder: ()=>Promise<ExportFolderResult>
      readRawAndExtractDicom: (rawPath: string) => Promise<ReturnType<typeof import('@/electron/RAW/RawReader').readRawAndExtractDicom>>
    }
    electronAPI: {
      readMultipleFiles: (filePaths: string[]) => Promise<ArrayBuffer[]>
    }
  }
}
