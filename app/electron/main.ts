import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { ipcMain } from "electron";
import { registerPhilipsDictionary } from '../src/types/PhilipsDictionary';
import { BaseDicomMetadata } from "../src/types/BaseDicomMetadata";
import { dialog } from "electron"
import { Menu } from "electron"

import fs from "fs";
import dcmjs from "dcmjs";
import path from 'node:path'
import { dicomStore } from '../src/storage/DicomStore';
import { TagAction } from '@/policy/PolicyLogic';
import { resolveNewValue, getValueFromElement,setValueAtPath,removeValueAtPath,getElementAtPath } from './helperMethods/helperMethods';

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
const iconPath = path.join(process.resourcesPath, "philips-icon.ico")


let win: BrowserWindow | null = null
let splash: BrowserWindow | null = null

function createSplash() {
  splash = new BrowserWindow({
    width: 1093,
    height: 348,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    //icon: path.join(process.env.VITE_PUBLIC, 'philips-icon.png'),
    skipTaskbar: true
  })
  console.log(path.join(process.cwd(), "public", "splash.html"))
  //splash.loadFile(path.join(process.cwd(), "public", "splash.html"))
  splash.loadFile(path.join(RENDERER_DIST, "splash.html"))
  splash.webContents.on("did-fail-load", (_, code, desc) => {
    console.error("Splash failed:", code, desc)
  })
}

function createWindow() {
  win = new BrowserWindow({
    show: false, // important
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    win?.webContents.setZoomFactor(.8);
  })

  // Show main window once ready
  win.once("ready-to-show", () => {
    splash?.destroy()
    win?.show()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
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

if (process.platform === "win32") {
  app.setAppUserModelId("com.philips.dcmreader")
}

app.whenReady().then(() => {
  registerPhilipsDictionary()
  Menu.setApplicationMenu(null)

  createSplash()
  createWindow()

})







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

ipcMain.handle("read-multiple-files",
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
ipcMain.handle("write-dicom",async (
  _event,
  modifiedDatasets: Record<string, Record<string, TagAction>>,
  dataSet: Record<string, BaseDicomMetadata>,
  uploadRoot:string|null
  ):Promise<ExportResult> => {

    if (!uploadRoot) {
      return { success: false, error:"need upload root" }
    }

    const exportFolder = uploadRoot + "_DelD"
    
    console.log("ExportFolder:", exportFolder)

    

    const writePromises = Object.entries(modifiedDatasets).map(
      async ([filePath, modifiedDataset]) => {
        try {
          const fileName = path.basename(filePath)
          if (fileName === undefined) return Promise.resolve()

          const originalDicom = dicomStore[filePath]
          const dicomCopy = dcmjs.data.DicomMessage.readFile(originalDicom.write())
          
          for (const key of Object.keys(modifiedDataset)) {
            const path = key.split(".");
            const rootTag = path[0];
            // Checking whether this is a root tag or nested tag
            const isRoot = path.length === 1;

            const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap[rootTag]
            if (!tagInfo) {
              console.warn(`No tag info found for key: ${rootTag}. Skipping this tag.`)
              continue;
            }

            const tagCode = tagInfo.tag.replace(/[(),]/g, "")
            const element = getElementAtPath(dicomCopy, path)
            console.log(`Processing tag: ${key} with tag code: ${tagCode}. Element found at path: ${path.join(".")}:`, element)
            if (!element) {
              console.warn(`No element found in DICOM for key: ${key} with tag code: ${tagCode}. Skipping this tag.`)
              continue;
            }
            if (isRoot &&   ["OB","OW","OF","UN"].includes(element.vr)) {
              console.warn(`Tag: ${key} with tag code: ${tagCode} has VR of ${element.vr}, which is not supported for editing. Skipping this tag.`)
              continue;
            };
            const vr = element.vr;
            const originalValue = getValueFromElement(element); // Not getting the originalValue 
            if (originalValue === undefined) {
              console.warn(`Skipping ${path.join(".")} — originalValue undefined`);
              continue;
            }

            const newValue = resolveNewValue(dataSet[filePath],originalValue, modifiedDataset,path,vr);
            if (newValue === originalValue) continue;
            if (newValue === undefined) {
              console.warn(`Value for key: ${key} with tag code: ${tagCode} is undefined. Skipping this tag.`)
            }

            if (newValue === null) {
              removeValueAtPath(dicomCopy, path,vr);
              console.warn(`Value for key: ${key} with tag code: ${tagCode} is null. Removing this tag.`)
              continue;
            }
            
            //element.Value = Array.isArray(newValue) ? newValue : [newValue];
            setValueAtPath(dicomCopy, path, vr, newValue)
            //console.log(dicomCopy.dict[tagCode])
          }

          const buffer = dicomCopy.write()

          const relativePath = path.relative(uploadRoot, filePath)
          const curOutputPath = path.join(exportFolder, relativePath)
          
          await fs.promises.mkdir(exportFolder, { recursive: true })
          await fs.promises.mkdir(path.dirname(curOutputPath), { recursive: true })
          await fs.promises.writeFile(curOutputPath, Buffer.from(buffer))

        } catch (err) {
          throw err;
        }
      }
    )

    await Promise.all(writePromises)
    
    return { success: true, exportPath: exportFolder }
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


