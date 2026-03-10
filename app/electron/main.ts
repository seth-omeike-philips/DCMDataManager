import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { ipcMain } from "electron";
import { registerPhilipsDictionary } from '../src/types/PhilipsDictionary';
import { BaseDicomMetadata } from "../src/types/BaseDicomMetadata";
import { dialog } from "electron"

import fs from "fs";
import dcmjs from "dcmjs";
import path from 'node:path'
import { dicomStore } from '../src/storage/DicomStore';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
console.log("APP_ROOT:", process.env.APP_ROOT)
console.log("Renderer path:", path.join(RENDERER_DIST, "index.html"))
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'philips-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
registerPhilipsDictionary()
// IPC handler to read DICOM file and return metadata
ipcMain.handle("read-dicom", async (_event, filePaths: string[]):Promise<Record<string, BaseDicomMetadata>> => {
  const fileDataset: Record<string, BaseDicomMetadata> = {}
  // Add Philips private tags to the dictionary before naturalizing
  
  await Promise.all(
    filePaths.map(async (filePath) => {
      const nodeBuffer = await fs.promises.readFile(filePath)

      const arrayBuffer = nodeBuffer.buffer.slice(
        nodeBuffer.byteOffset,
        nodeBuffer.byteOffset + nodeBuffer.byteLength
      )

      const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer, {
        ignoreErrors: true,
      })
      dicomStore[filePath] = dicomData

      if (
        dicomData.dict["00080005"] &&
        dicomData.dict["00080005"].Value
      ) {
        dicomData.dict["00080005"].Value = ["ISO_IR 192"]
      }

      

      const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
          dicomData.dict
        ) as BaseDicomMetadata

      fileDataset[filePath] = JSON.parse(JSON.stringify(dataset))
    })
  )
  return fileDataset
})
// IPC handler to read file as ArrayBuffer for CornerstoneJS
ipcMain.handle(
  "read-multiple-files",
  async (_event, filePaths: string[]): Promise<ArrayBuffer[]> => {
    return Promise.all(
      filePaths.map(async (filePath) => {
        const buffer = await fs.promises.readFile(filePath)

        return buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        )
      })
    )
  }
)


// IPC handler to encode changed DCM file into ArrayBuffer for saving
ipcMain.handle(
  "write-dicom",
  async (_event, outputPath: string, modifiedDatasets: Record<string, BaseDicomMetadata>):Promise<ExportResult> => {
     
    try {
      const writePromises = Object.entries(modifiedDatasets).map(
        async ([filePath, modifiedDataset]) => {

          const fileName = filePath.split("\\").pop()
          // Figure out a better way to prevent this 
          if (fileName === undefined) {
            return 
          }
          const curOutputPath = path.join(outputPath, fileName)
          const originalDicom = dicomStore[filePath]
          
          for (const key of Object.keys(modifiedDataset) as (keyof BaseDicomMetadata)[]) {
            const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap[key]
            if (!tagInfo) continue

            const tagCode = tagInfo.tag.replace(/[(),]/g, "")
            const element = originalDicom.dict[tagCode]
            if (!element) continue
            if (["OB","OW","OF","UN","SQ"].includes(element.vr)) continue
            
            const value = modifiedDataset[key]
            if (value === undefined || value === null) continue

            element.Value = Array.isArray(value) ? value : [value]
          }

          const buffer = originalDicom.write()

          await fs.promises.writeFile(curOutputPath, Buffer.from(buffer))
        }
      )

      await Promise.all(writePromises)

      return { success: true }

    } catch (error) {
      console.error("Export failed:", error)
      return { success: false, error: String(error) }
    }
  }
)


ipcMain.handle("select-export-folder", async ():Promise<ExportFolderResult> => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  return {
    canceled: false,
    folderPath: result.filePaths[0]
  }
})