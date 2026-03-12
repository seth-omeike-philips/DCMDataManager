import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseDicomMetadata } from "../types/BaseDicomMetadata"
import { useFileContext} from "../context/FileContext"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"


type LoadingMessage = "Reading metadata and sorting slices" | "Finding DICOM Files"
interface ErrorMessage {
  errorStatus: boolean
  message: string
} 

const UploadPage: React.FC = () => {
  const { setFilePaths } = useFileContext()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<LoadingMessage>("Finding DICOM Files")
  const [errorMessage, setErrorMessage] = useState<ErrorMessage>()
  const {setUploadRoot} = useFileContext();

  const handleNavigation = (fileData: Record<string, BaseDicomMetadata>): void => {
    navigate("/viewer", { state: { fileData } })
  }

  const asyncPool = async<T,R>(limit:number, items:T[], iteratorFn:(item:T)=> Promise<R>):Promise<R[]> => {
    const ret: Promise<R>[] = []
    const executing:Promise<any>[] = []

    for (const item of items) {
      const p = Promise.resolve().then(()=> iteratorFn(item))
      ret.push(p)

      if (limit <= items.length) {
        const e:Promise<any> = p.then(() => executing.splice(executing.indexOf(e),1))
        executing.push(e)

        if (executing.length >=limit) {
          await Promise.race(executing)
        }
      }
    }

    return Promise.all(ret)
  }

  const collectEntries = async(entry: FileSystemEntry,depth: number,maxDepth: number,files: File[]): Promise<void> => {
    if (depth > maxDepth) return;

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;

      await new Promise<void>((resolve) => {
        fileEntry.file((file) => {
          files.push(file);
          resolve();
        });
      });
    }

    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();

      const readAllEntries = async (): Promise<FileSystemEntry[]> => {
        const all: FileSystemEntry[] = [];

        while (true) {
          const batch: FileSystemEntry[] = await new Promise((resolve) =>
            reader.readEntries(resolve)
          );

          if (!batch.length) break;

          all.push(...batch);
        }

        return all;
      };

      const entries = await readAllEntries();

      console.log("Total entries in directory:", entries.length);

      await Promise.all(
        entries.map((ent) => collectEntries(ent, depth + 1, maxDepth, files))
      );
    }
  };

  const filterDicomFiles = async (files: File[]):Promise<File[]> => {
    const results = await asyncPool(20, files, async (file) => {
      const valid = await isDicomFile(file)
      return valid ? file : null
    })

    return results.filter(Boolean) as File[]
  }


  const isDicomFile = async (file: File): Promise<boolean> => {
    if (file.size < 132) return false; // too small to be DICOM

    const buffer = await file.slice(0, 132).arrayBuffer(); // only read first 132 bytes
    const view = new DataView(buffer);

    // Check for "DICM" at byte offset 128
    const dicm =
      String.fromCharCode(
        view.getUint8(128),
        view.getUint8(129),
        view.getUint8(130),
        view.getUint8(131)
      ) === "DICM";

    return dicm;
  };

  const MAX_DEPTH = 2;

const getDicomFilesFromFolder = async (fileList: FileList, maxDepth = MAX_DEPTH):Promise<File[]> => {
  const dicomFiles: File[] = [];

  for (const file of Array.from(fileList)) {
    // Calculate depth from webkitRelativePath
    const pathDepth = file.webkitRelativePath.split("/").length - 1; // -1 for file itself
    if (pathDepth > maxDepth) continue;

    if (await isDicomFile(file)) {
      dicomFiles.push(file);
      setFileCount((prev) => prev+1);
    };
  }

  return dicomFiles;
}
  
  const processFilesFromArray = async (file:File[]) => {
    if (file.length ===0) {
      setLoading(false)
      throw new Error("No DCM Files Found")
    }

    const filePaths = file.map(file => file.path);
    setLoadingMessage("Reading metadata and sorting slices")
    const results = await window.api.readDicom(filePaths)
    console.log(results)
    filePaths.sort((a, b) => {
      const metaA = results[a]
      const metaB = results[b]
      return (metaA.InstanceNumber ?? 0) - (metaB.InstanceNumber ?? 0)
    })
    setLoading(false)
    setFilePaths(filePaths)
    handleNavigation(results)

  }
  const processFiles = async (fileList: FileList) => {
    setLoading(true)
    const dicomFiles = await getDicomFilesFromFolder(fileList, MAX_DEPTH);
    processFilesFromArray(dicomFiles)
  }

  const getCommonPath = (files: FileList): string => {
    if (files.length === 0) return ""

    const pathArrays: string[][] = []

    // Convert each path into an array of directories
    for (let i = 0; i < files.length; i++) {
      const fullPath = (files.item(i) as any).path as string

      // remove filename
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf("\\"))

      pathArrays.push(dirPath.split("\\"))
    }

    const firstPath = pathArrays[0]
    const commonParts: string[] = []

    for (let i = 0; i < firstPath.length; i++) {
      const segment = firstPath[i]

      const allMatch = pathArrays.every(parts => parts[i] === segment)

      if (!allMatch) break

      commonParts.push(segment)
    }

    return commonParts.join("\\")
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    try {
      const firstFile = e.target.files[0]
      const root = getCommonPath(e.target.files)
      setUploadRoot(root)
      console.log("Root path:",root)

      
      setLoadingMessage("Finding DICOM Files")
      const start =new Date();
      await processFiles(e.target.files)
      const end = new Date();
      const elapsedMs = (end.getTime() - start.getTime()) 
      console.log(`Elapsed seconds: ${elapsedMs/1000}`)

    } catch (error:any) {
        setLoading(false)
        setErrorMessage({errorStatus: true,message: String(error)})
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    setLoading(true)
    setLoadingMessage("Finding DICOM Files")

    try {

    
    const start =new Date();

    const items = e.dataTransfer.items
    const files: File[] = []

    console.log(`File: ${Array.from(e.dataTransfer.items)}`)

    const zipFile = Array.from(e.dataTransfer.items).find(file =>
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      file.getAsString.name.toLowerCase().endsWith(".zip")
    )
    if (zipFile) throw new Error("Zip files are not supported. Please upload a folder or DICOM files directly.")


    const start1 = new Date();
    await Promise.all(
      Array.from(items).map(async (item) => {
        const entry = item.webkitGetAsEntry()
        if (entry) {
          await collectEntries(entry, 0, MAX_DEPTH, files)
        }
      })
    )
    const end1 = new Date()
    console.log(`Length of files collected: ${files.length}`)
    const elapsedMs1 = (end1.getTime() - start1.getTime()) 
    console.log(`Elapsed seconds: ${elapsedMs1/1000}`)


    const start2 = new Date()
    const dicomFiles = await filterDicomFiles(files)
    console.log(`Length of files filtered: ${dicomFiles.length}`)
    const end2 = new Date()
    const elapsedMs2 = (end2.getTime() - start2.getTime()) 
    console.log(`Elapsed seconds: ${elapsedMs2/1000}`)


    const start3 = new Date()
    await processFilesFromArray(dicomFiles)
    const end3 = new Date()
    const elapsedMs3 = (end3.getTime() - start3.getTime()) 
    console.log(`Elapsed seconds: ${elapsedMs3/1000}`)

    const end = new Date();
    const elapsedMs = (end.getTime() - start.getTime()) 
    console.log(`Elapsed seconds: ${elapsedMs/1000}`)

    } catch (error:any) {
      setLoading(false)
      setErrorMessage({errorStatus: true,message: String(error)})
    }
  }

  return (
    <div className="h-screen w-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-center">
            Upload DICOM Study
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {!loading ? (
            <>
              <div className="text-center text-muted-foreground text-sm">
                Upload one or more folders
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer
                  ${isDragging ? "border-primary bg-muted/50" : "hover:bg-muted/40"}
                `}
                onClick={() =>
                  document.getElementById("fileInput")?.click()
                }
                onDragOver={(e) => {
                  e.preventDefault()
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                }}
                onDrop={handleDrop}
              >
                <p className="text-lg font-medium">
                  Drag & Drop Files Here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  or click to browse
                </p>
                {/**@ts-ignore */}
                <input id="fileInput" type="file" webkitdirectory="" directory=""  multiple className="hidden" onChange={handleFileInput}
                />

                {errorMessage?.errorStatus && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="text-sm text-muted-foreground text-red-500">
                      Error {errorMessage.message}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-sm text-muted-foreground">
                  Processing {fileCount} file
                  {fileCount > 1 && "s"}...
                </div>
                <Alert>
                  {loadingMessage}
                </Alert>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default UploadPage