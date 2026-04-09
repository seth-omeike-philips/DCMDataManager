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
import { TagAction } from '@/policy/PolicyLogic';

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


const mapper = (data:BaseDicomMetadata, path:(string|number)[]) => {
  const key = path[0] as keyof BaseDicomMetadata;
  if (key === "PatientName") {
    const value = data[key]
    if (!value) {
      console.warn(`Expected a value for mapping PatientName, but go. Skipping mapping.`)
      return ""
    }

    // PatientName
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

  // PatientID or OtherPatientIDs
  else if (key === "PatientID" || key === "OtherPatientIDs") {
    const value = data[key]
    if (typeof value !== "string") {
      console.warn(`Expected a string value for mapping PatientID, but got ${typeof value} for key ${key}, value: ${value}. Skipping mapping.`)
      return "";
    }
    return "Mapped_" + value;

  }

  // Study Date
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
  // PatientSex
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
  // PatientBirthDate
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
  originalValue: any,
  modifiedDataset: Record<string, TagAction>,
  path:  (string | number)[],
  vr: string
): any {
  const pathKey = path.join(".");
  const transformation = modifiedDataset[pathKey];

  if (!transformation) return undefined;


  if (!originalValue && originalValue !== 0) {
    return originalValue;
  }

  switch (transformation.type) {
    case "REMOVE":
      return null;

    case "KEEP":
      return originalValue;

    case "MAP":
      const mapped= mapper(data,path);
      if (typeof mapped === "string") {
        return enforceVR(path,mapped, vr);
      }
      return mapped;
    


    case "HASH": {
      if (typeof originalValue !== "string") {
        // Cannot hash
        throw new Error(`Cannot hash key: ${pathKey}. Can only hash strings`);
      }
      const hashed = crypto.createHash("sha256").update(originalValue).digest("hex");
      return enforceVR(path,cleanHash(hashed, vr),vr);
    }

    case "GENERATE_UID":
      return enforceVR(path,generateUID(), vr);
    case "CUSTOM":
      return enforceVR(path,transformation.value, vr);
    default:
      // Nothing to do. Perhaps throw an error as we don't expect this case to be reached?
      return originalValue
      ;
  }
}

function cleanHash(value: string, vr: string): string {
  if (value == null) return value;
  switch (vr) {
      case "CS":
        return value.toUpperCase().slice(0, 16);
        case "SH":
          return value.slice(0, 16);
        case "LO":
          return value.slice(0, 64);
        case "UI":
          return sanitizeUID(value); 
        default: return value;
      }
}

function enforceVR(key:(string | number)[], value: string, vr: string): string|string[] {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(v => enforceVR(key,v, vr)) as string[];
  }

  const trimmed = value.trim();

  switch (vr) {
    case "CS": { // Code String (max 16, uppercase, no leading/trailing spaces)
      const formatted = trimmed.toUpperCase();
      if (formatted.length > 16) {
        throw new Error(`Error on tag: ${key}\nCS exceeds max length of 16. Value Received: ${formatted} has length: ${trimmed.length}`);
      }
      return formatted;
    }

    case "SH": { // Short String (max 16)
      if (trimmed.length > 16) {
        throw new Error(`Error on tag: ${key}\nSH exceeds max length of 16. Value Received: ${trimmed} has length: ${trimmed.length}`);
      }
      return trimmed;
    }

    case "LO": { // Long String (max 64)
      if (trimmed.length > 64) {
        throw new Error(`Error on tag: ${key}\nLO exceeds max length of 64. Value Received: ${trimmed} has length: ${trimmed.length} `);
      }
      return trimmed;
    }

    case "UI": { // UID (numbers and dots only)
      if (!/^[0-9.]+$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nUI must contain only numbers and dots. Value Received: ${trimmed}`);
      }
      return sanitizeUID(trimmed);
    }

    case "DA": { // Date YYYYMMDD
      if (!/^\d{8}$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nDA must be in format YYYYMMDD. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "TM": { // Time HHMMSS.frac (DICOM allows partials)
      if (!/^\d{2,6}(\.\d+)?$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nTM must be in format HHMMSS or HHMMSS.frac. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "PN": { // Person Name (simplified)
      if (trimmed.length > 64) {
        throw new Error(`Error on tag: ${key}\nPN exceeds max length of 64. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "IS": { // Integer String
      if (!/^-?\d+$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nIS must be a valid integer. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "DS": { // Decimal String
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nDS must be a valid decimal number. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    default:
      // fallback: don’t block unknown VRs, just return trimmed
      return trimmed;
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

const keywordToTagCode = (keyword: string) => {
  const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap[keyword];
  if (!tagInfo) return null;
  return tagInfo.tag.replace(/[(),]/g, "");
};

const getElementAtPath = (dicom: any, path: (string | number)[]) => {
  let current = dicom.dict;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];

    // 🔹 ROOT
    if (i === 0) {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode) return null;

      current = current[tagCode];
    }

    // 🔹 DICOM element
    else if (current && typeof current === "object" && "Value" in current) {
      const value = current.Value;

      // Case: primitive array (ImageType)
      if (Array.isArray(value) && typeof key === "number") {
        const intKey = parseInt(String(key), 10);
        if (isNaN(intKey) || intKey < 0 || intKey >= value.length) {
          console.warn(`Invalid array index: ${key} at path: ${path.join(".")}. Cannot traverse.`);
          return null;
        }
        return value[intKey]; // 🔥 return primitive directly
      }

      // Case: sequence
      if (Array.isArray(value)) {
        current = value[key];
      } else {
        return null;
      }
    }

    // 🔹 Sequence item (object with tagCodes)
    else if (current && typeof current === "object") {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode) return null;

      current = current[tagCode];
    }

    else {
      return null;
    }

    if (current === undefined) return null;
  }

  return current;
};

const setValueAtPath = (dicom: any, path: (string | number)[],newValue: any) => {
  let current = dicom.dict;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];

    // 🔹 ROOT
    if (i === 0) {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode) {
        console.warn(`Invalid root tag keyword: ${key}. Cannot set value at path: ${path.join(".")}`);
        return;
      };

      current = current[tagCode];
      continue;
    }

    // 🔹 LAST STEP
    if (i === path.length - 1) {

      // ✅ CASE 1: current is DICOM element (primitive array case)
      if (current && typeof current === "object" && "Value" in current) {
        const value = current.Value;

        // ImageType[1] = "NEW"
        if (Array.isArray(value) && typeof key === "number") {
          value[key] = newValue;
          return;
        }

        // Direct overwrite
        current.Value = Array.isArray(newValue) ? newValue : [newValue];
        return;
      }

      // ✅ CASE 2: current is sequence item
      if (current && typeof current === "object") {
        const tagCode = keywordToTagCode(String(key));
        if (!tagCode) {
          console.warn(`Invalid tag keyword: ${key}. Cannot set value at path: ${path.join(".")}`);
          return;
        }

        const targetElement = current[tagCode];

        if (!targetElement) {
          console.warn(`Missing element for tagCode ${tagCode}`);
          return;
        }
        console.log(`Setting value at path: ${path.join(".")} with tagCode: ${tagCode} to newValue: ${newValue}`)
        targetElement.Value = Array.isArray(newValue)
          ? newValue
          : [newValue];

        return;
      }

      return;
    }

    // 🔹 TRAVERSAL

    // CASE: DICOM element
    if (current && typeof current === "object" && "Value" in current) {
      const value = current.Value;

      // Sequence traversal
      if (Array.isArray(value)) {
        const intKey = parseInt(String(key), 10);
        if (isNaN(intKey) || intKey < 0 || intKey >= value.length) {
          console.warn(`Invalid array index: ${key} at path: ${path.join(".")}. Cannot traverse.`);
          return;
        }
        current = value[intKey];
        continue;
      }

      return;
    }

    // CASE: sequence item
    if (current && typeof current === "object") {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode) return;

      current = current[tagCode];
      continue;
    }

    return;
  }
};

const removeValueAtPath = (dicom: any, path: (string | number)[]) => {
  let current = dicom.dict;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];

    // 🔹 ROOT
    if (i === 0) {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode) return;

      current = current[tagCode];
    }

    // 🔹 LAST STEP (DELETE)
    else if (i === path.length - 1) {
      // Case: DICOM element
      if (current && typeof current === "object" && "Value" in current) {
        const value = current.Value;

        // primitive array (ImageType)
        if (Array.isArray(value) && typeof key === "number") {
          value.splice(key, 1);
          return;
        }

        // delete entire element value
        current.Value = [];
        return;
      }

      // Case: sequence item
      if (current && typeof current === "object") {
        const tagCode = keywordToTagCode(String(key));
        if (!tagCode) return;

        delete current[tagCode];
        return;
      }
    }

    // 🔹 TRAVERSAL
    else if (current && typeof current === "object" && "Value" in current) {
      const value = current.Value;

      if (Array.isArray(value)) {
        const intKey = parseInt(String(key), 10);
        if (isNaN(intKey) || intKey < 0 || intKey >= value.length) {
          console.warn(`Invalid array index: ${key} at path: ${path.join(".")}. Cannot traverse.`);
          return;
        }
        current = value[intKey];
      } else {
        return;
      }
    }

    else if (current && typeof current === "object") {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode) return;

      current = current[tagCode];
    }

    else {
      return;
    }
  }
};

const getValueFromElement = (element: any) => {
  
  if (element === null || element === undefined) return undefined;
  if (typeof element !== "object") {
    return element; // already a primitive like "ORIGINAL"
  }

  if (!("Value" in element)) return undefined;

  if (element.vr === "SQ") return element.Value;

  const value = element.Value;

  if (!Array.isArray(value)) return value;

  if (value.length === 0) return undefined;

  if (value.length === 1) return value[0];

  return value;
};

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

            console.log(`Applying transformation for key: ${key} with rootTag: ${rootTag} and isRoot: ${isRoot}`)
            const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap[rootTag]
            if (!tagInfo) {
              console.warn(`No tag info found for key: ${rootTag}. Skipping this tag.`)
              continue;
            }

            const tagCode = tagInfo.tag.replace(/[(),]/g, "")
            const element = getElementAtPath(dicomCopy, path)

            
            if (!element) {
              console.warn(`No element found in DICOM for key: ${key} with tag code: ${tagCode}. Skipping this tag.`)
              continue;
            }
            if (isRoot &&   ["OB","OW","OF","UN","SQ"].includes(element.vr)) {
              console.warn(`Tag: ${key} with tag code: ${tagCode} has VR of ${element.vr}, which is not supported for editing. Skipping this tag.`)
              continue;
            };
            const vr = element.vr;
            const originalValue = getValueFromElement(element);
            console.log(`Data for appliedTransformation for key: ${key}, tag code: ${tagCode}, VR: ${vr}, Original Value: ${originalValue}`)
            const newValue = applyTransformation(dataSet[filePath],originalValue, modifiedDataset,path,vr);
            if (newValue === undefined) continue;

            if (newValue === null) {
              removeValueAtPath(dicomCopy, path);
              console.warn(`Value for key: ${key} with tag code: ${tagCode} is null. Removing this tag.`)
              continue;
            
            }
            console.log(`------------------\n${element.tag} (${key})\nOriginal Value: ${element.Value}\nNew Value: ${newValue}\n------------------`)
            //element.Value = Array.isArray(newValue) ? newValue : [newValue];
            setValueAtPath(dicomCopy, path, newValue)
          }

          const buffer = dicomCopy.write()

          const relativePath = path.relative(uploadRoot, filePath)
          const curOutputPath = path.join(exportFolder, relativePath)
          
          await fs.promises.mkdir(exportFolder, { recursive: true })
          await fs.promises.mkdir(path.dirname(curOutputPath), { recursive: true })
          await fs.promises.writeFile(curOutputPath, Buffer.from(buffer))

        } catch (err) {
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

