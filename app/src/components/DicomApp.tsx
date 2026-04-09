import React, { useState } from "react"

import { useFileContext } from "@/context/FileContext"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"

import { useModal } from "@/context/ModalContext"
import { Loader2 } from "lucide-react"
import MainApp from "./MainApp"
import UploadCard from "./UploadCard"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"


const DicomApp: React.FC = () => {
    const {openModal} = useModal();
    const { setFilePaths } = useFileContext()
    const {setUploadRoot} = useFileContext();


    const [isFileUploaded, setIsFileUploaded] = useState<boolean>(false);
    const [isAllFilesAvailable, setIsAllFilesAvailable] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const MAX_DEPTH = 2;

    const [dataSet, setDataSet] = useState<Record<string, BaseDicomMetadata>>({})
    const [curSlice, setCurSlice] = useState<DicomSlice | undefined>(undefined);

    const handleClose = () => {
        setDataSet({});
        setCurSlice(undefined);
        setIsFileUploaded(false);
        setIsDragging(false);
        setIsLoading(false);
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


    const processFilesFromArray = async (file:File[]) => {
        if (file.length ===0) {
        throw new Error("No DICOM files were found in the selected folder.")
        }

        const filePaths = file.map(file => file.path);
        const results = await window.api.readDicom(filePaths)
        console.log(results)
        filePaths.sort((a, b) => {
        const metaA = results[a]
        const metaB = results[b]
        return (metaA.InstanceNumber ?? 0) - (metaB.InstanceNumber ?? 0)
        })
        setFilePaths(filePaths)
        setDataSet(results);
        

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
    
    
    const getDicomFilesFromFolder = async (fileList: FileList, maxDepth = MAX_DEPTH):Promise<File[]> => {
        const dicomFiles: File[] = [];
    
        for (const file of Array.from(fileList)) {
            // Calculate depth from webkitRelativePath
            const pathDepth = file.webkitRelativePath.split("/").length - 1; // -1 for file itself
            if (pathDepth > maxDepth) continue;
    
            if (await isDicomFile(file)) {
            dicomFiles.push(file);
            
            };
        }
    
        return dicomFiles;
    }
    const processFiles = async (fileList: FileList) => {
        const dicomFiles = await getDicomFilesFromFolder(fileList, MAX_DEPTH);
        await processFilesFromArray(dicomFiles);
        setIsAllFilesAvailable(true);
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
        try {
        if (!e.target.files || e.target.files.length === 0) {
            throw new Error("Empty Folder");
        }

        const raw_path = "C:\\Users\\320308966\\Documents\\1.3.46.670589.61.128.7.2026020311233319822097493910003.rawmdu";
        const result = await window.api.readRawAndExtractDicom(raw_path);
        console.log(`Result: ${result}`)
        
        
        setIsLoading(true);
        await new Promise(requestAnimationFrame);

        await fetchFirstFile(e.target.files, MAX_DEPTH);

        
        setIsFileUploaded(true);
        setIsLoading(false);
        
        const start =new Date();
        await processFiles(e.target.files)
        const end = new Date();
        const elapsedMs = (end.getTime() - start.getTime()) 
        console.log(`Elapsed seconds: ${elapsedMs/1000}`)

        const root = getCommonPath(e.target.files)
        setUploadRoot(root)
        console.log("Root path:",root)

        } catch (error) {
            console.log("error caught")
            openModal({
                    type: "error",
                    title: String(error),
                    message: `Unable to read folder`
                })
        }
    }

    const fetchFirstFile = async (fileList: FileList, maxDepth: number):Promise<void> => {  
        console.log("isLoading:",isLoading)
        for (const file of Array.from(fileList)) {
            // Calculate depth from webkitRelativePath
            const pathDepth = file.webkitRelativePath.split("/").length - 1; // -1 for file itself
            if (pathDepth > maxDepth) continue;
    
            if (await isDicomFile(file)) {
                return await processFirstFile(file.path);
            };
        }
    
    }

    const processFirstFile = async (filePath:string):Promise<void> => {
        const results = await window.api.readDicom([filePath])
        setDataSet(results);
        
        setFilePaths([filePath])
        console.log(results);
    }

    const filterDicomFiles = async (files: File[]):Promise<File[]> => {
        const results = await asyncPool(20, files, async (file) => {
            const valid = await isDicomFile(file)
            return valid ? file : null
        })
        return results.filter(Boolean) as File[]
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
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    
        try {  
                    
            const start =new Date();
        
            const items = e.dataTransfer.items
            const files: File[] = []
        
            console.log(`File: ${Array.from(e.dataTransfer.items)}`)

            
        
            for (const item of items) {
                const file = item.getAsFile();
                if (file && file.name.toLowerCase().endsWith(".zip")) {
                    throw new Error("Zip files are not supported.");
                }
            }
                
            const start1 = new Date();
            await Promise.all(
            Array.from(items).map(async (item) => {
                const entry = item.webkitGetAsEntry()
                if (entry) {
                await collectEntries(entry, 0, MAX_DEPTH, files)
                }
            })
            )
            const dataTransfer = new DataTransfer();
            files.forEach(file => dataTransfer.items.add(file));

            
            setIsLoading(true);
            await new Promise(requestAnimationFrame);

            await fetchFirstFile(dataTransfer.files, MAX_DEPTH);

            
            setIsFileUploaded(true);
            setIsLoading(false);


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



            

            const root = getCommonPath(dataTransfer.files)
            setUploadRoot(root)
            console.log("Root path:",root)
            setIsAllFilesAvailable(true);

            
    
        } catch (error:any) {
            console.log(error)
            openModal({
                type: "error",
                title: String(error),
                message: `Unable to read folder`
            })
        }
    }

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-muted/30 flex items-center justify-center">
                <Card className="w-full max-w-md shadow-2xl rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-semibold text-center">
                            Upload DICOM Study
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />

                        <div className="text-center space-y-1">
                            <p className="text-base font-medium">
                                Grabbing First File
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Preparing your study preview...
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-muted/30 flex items-center justify-center">
        {
        !isFileUploaded ? (
            <UploadCard
                isDragging={isDragging}
                handleFileInput={handleFileInput}
                setIsDragging={setIsDragging}    
                handleDrop={handleDrop}
            />
            ) : 
            (
            <MainApp
                dataSet={dataSet}
                curSlice={curSlice}
                setCurSlice={setCurSlice}
                isAllFilesAvailable={isAllFilesAvailable}
                handleClose={handleClose}
            />
            )}
            
        </div>
    )
}
export default DicomApp