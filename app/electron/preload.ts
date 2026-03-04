import { BaseDicomMetadata } from '@/types/BaseDicomMetadata';
import { ipcRenderer, contextBridge } from 'electron'
console.log("Preload loaded");

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// --------- Expose Custom API ---------
contextBridge.exposeInMainWorld("api", {
  readDicom: (filePaths: string[]):Promise<Record<string, BaseDicomMetadata>> =>
    ipcRenderer.invoke("read-dicom", filePaths),
  writeDicom: (outputPath: string, metadata: Record<string, BaseDicomMetadata>):Promise<ExportResult> =>
    ipcRenderer.invoke("write-dicom", outputPath, metadata),
  selectExportFolder: ():Promise<ExportFolderResult> =>
    ipcRenderer.invoke("select-export-folder"),
})


contextBridge.exposeInMainWorld("electronAPI", {
  readMultipleFiles: (filePaths: string[]) =>
    ipcRenderer.invoke("read-multiple-files", filePaths),
})