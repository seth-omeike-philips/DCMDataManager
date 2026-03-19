import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { ipcMain } from "electron";
import { registerPhilipsDictionary } from '../src/types/PhilipsDictionary';
import { BaseDicomMetadata } from "../src/types/BaseDicomMetadata";
import { dialog } from "electron"
import { Menu } from "electron"
import crypto from "crypto";


import fs from "fs";
import dcmjs from "dcmjs";
import path from 'node:path'
import { dicomStore } from '../src/storage/DicomStore';
import { Transformation } from '@/policy/PolicyLogic';

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


const mapper = (data:BaseDicomMetadata, key:keyof BaseDicomMetadata) => {
  if (key === "PatientName") {
    const value = data[key]
    if (!value) {
      console.warn(`Expected a value for mapping PatientName, but go. Skipping mapping.`)
      return ""
    }

    if (Array.isArray(value) && value.every(v => typeof v === "object" && "Alphabetic" in v)) {
      const mappedValue = value.map(v => {
          if (typeof v.Alphabetic !== "string") {
            return v // or return a safe fallback
          }

          return {
            ...v,
            Alphabetic: crypto.createHash("sha256").update(String(v.Alphabetic ?? "")).digest("hex").slice(0, 64)
          }
        })
      return mappedValue

    } else {
      console.warn(`Expected an array of objects with an Alphabetic property for mapping PatientName, but got ${JSON.stringify(value)}. Skipping mapping.`)
      return value; 
    }
  }

  else if (key === "PatientID" || key === "OtherPatientIDs") {
    const value = data[key]
    if (typeof value !== "string") {
      console.warn(`Expected a string value for mapping PatientID, but got ${typeof value} for key ${key}, value: ${value}. Skipping mapping.`)
      return "";
    }
    return "Mapped_" + value;

  }

  else if (key === "StudyDate") {
    const rawDate = data[key]
    if (typeof rawDate !== "string") {
      console.warn(`Expected a string rawDate for mapping StudyDate, but got ${typeof rawDate} for key ${key}, rawDate: ${rawDate}. Skipping mapping.`)
      return "";
    }
    // Example: Shift the date by a fixed number of days (e.g., 30 days)
    // Note that rawDate is expected to be in the format "YYYY-MM-DD", so we need to parse it accordingly
    const newMonth = Math.floor(Math.random() * 12) + 1;
    const newDay = Math.floor(Math.random() * 28) + 1;
    const newYear = Math.floor(Math.random()*30) + 1990
    return `${String(newYear)}${String(newMonth).padStart(2, '0')}${String(newDay).padStart(2, '0')}`
  }
  else if (key === "PatientSex") {
    // Even Represents Male, Odd represents Female
    const value = data[key]
    if (value === undefined) {
      console.log(`No value to edit: Value: ${value}`)
      return "";
    }
    if ((value !== "M") && (value !== "F")) {
      console.warn(`Expected sex to either be M or F but got ${value}`)
      return value;
    }
    
    if (value == "M") {
      // Generate Even number in range [0,100]
      const randomNumber = Math.floor(Math.random()*51)*2
      return String(randomNumber)
    }
    else if (value == "F") {
      // Generate Odd number in range [0,100]
      const randomNumber = Math.floor(Math.random()*50)*2 + 1
      return String(randomNumber)
    }
    
    
  }
  else if (key === "PatientBirthDate") {
    const value = data[key]
    if (value === undefined || value === "") {
      console.log(`No value to edit: Value: ${value}`)
      return "";
    }
    // Not sure whether the PatientAge is a string integer or DOB
    const newMonth = String(2)
    const newDay = String(29)
    const plusOrMinusOne = Math.floor(Math.random() * 2) * 2 - 1
    const year = String( Number(value.substring(0,4)) + plusOrMinusOne )
    return `${year}${newMonth.padStart(2, '0')}${newDay.padStart(2, '0')}`
    
  }

  return "";
}

function applyTransformation(
  data: BaseDicomMetadata,
  modifiedDataset: Record<keyof BaseDicomMetadata, Transformation>,
  key: keyof BaseDicomMetadata,
  vr: string
): any {
  const transformation = modifiedDataset[key];
  const originalValue = data[key];

  switch (transformation.type) {
    case "REMOVE":
      return null;

    case "KEEP":
      return enforceVR(String(originalValue ?? ""), vr);

    case "MAP":
      const mapped= mapper(data,key);
      if (typeof mapped === "string") {
        return enforceVR(mapped, vr);
      }
      return mapped;

    case "HASH": {
      const hashed = crypto.createHash("sha256").update(String(originalValue ?? "")).digest("hex");
      return enforceVR(hashed, vr);
    }

    case "GENERATE_UID":
      return generateUID();
  }
}

function enforceVR(value: string, vr: string): string {
  if (value == null) return value;

  switch (vr) {
    case "CS":
      return value.toUpperCase().slice(0, 16);

    case "SH":
      return value.slice(0, 16);

    case "LO":
      return value.slice(0, 64);

    case "UI":
      return sanitizeUID(value); // you NEED this

    default:
      return value;
  }
}

function sanitizeUID(value: string): string {
  // remove invalid chars
  let cleaned = value.replace(/[^0-9.]/g, "");

  // enforce max length
  if (cleaned.length > 64) {
    cleaned = cleaned.slice(0, 64);
  }

  return cleaned || generateUID();
}

function generateUID(): string {
  return "2.25." + BigInt("0x" + crypto.randomUUID().replace(/-/g, "")).toString();
}

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
ipcMain.handle("write-dicom",async (
  _event,
  modifiedDatasets: Record<string, Record<keyof BaseDicomMetadata, Transformation>>,
  dataSet: Record<string, BaseDicomMetadata>,
  uploadRoot:string|null
  ):Promise<ExportResult> => {

    if (!uploadRoot) {
      return { success: false, error:"need upload root" }
    }

    const exportFolder = uploadRoot + "_DelD"
    
    console.log("ExportFolder:", exportFolder)

    await fs.promises.mkdir(exportFolder, { recursive: true })

    const writePromises = Object.entries(modifiedDatasets).map(
      async ([filePath, modifiedDataset]) => {
        try {
          const fileName = path.basename(filePath)
          if (fileName === undefined) return Promise.resolve()

          const originalDicom = dicomStore[filePath]
          const dicomCopy = dcmjs.data.DicomMessage.readFile(originalDicom.write())
          

          for (const key of Object.keys(modifiedDataset) as (keyof BaseDicomMetadata)[]) {

            const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap[key]
            if (!tagInfo) continue

            const tagCode = tagInfo.tag.replace(/[(),]/g, "")
            const element = dicomCopy.dict[tagCode]

            
            if (!element) continue
            if (["OB","OW","OF","UN","SQ"].includes(element.vr)) continue;
            const vr = element.vr;

            const newValue = applyTransformation(dataSet[filePath],modifiedDataset,key,vr);
            if (newValue == null) {
              delete dicomCopy.dict[tagCode];
              continue;
            }
            element.Value = Array.isArray(newValue) ? newValue : [newValue];
          }

          const buffer = dicomCopy.write()

          const relativePath = path.relative(uploadRoot, filePath)
          const curOutputPath = path.join(exportFolder, relativePath)
          
          await fs.promises.mkdir(path.dirname(curOutputPath), { recursive: true })

          await fs.promises.writeFile(curOutputPath, Buffer.from(buffer))

        } catch (err) {
          console.error("Failed writing:", filePath, err)
          throw new Error(`Failed writing ${filePath}: ${err}`);
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

ipcMain.handle("hash-deterministic", async (_events, value:string):Promise<String> => {
  return crypto.createHash("sha256").update(value).digest("hex");
})
// Account for VR_Limits