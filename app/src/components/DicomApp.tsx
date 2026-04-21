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
        setIsAllFilesAvailable(false);
    }
    


    /**
     * Executes a pool of asynchronous operations with a specified limit
     * @param limit Maximum number of concurrent operations
     * @param items Array of items to process
     * @param iteratorFn Function to apply to each item
     * @returns Promise resolving to an array of results
     * This is used to efficiently filter DICOM files by checking them in batches, preventing too many simultaneous file reads that could degrade performance.
     */
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

    /**
     * Determines if a DICOM file is a directory (DICOMDIR) based on its metadata.
     * @param meta  Metadata of the DICOM file to check
     * @returns True if the file is a DICOM directory, false otherwise
     * DICOMDIR files have a specific SOPClassUID and typically lack image-related tags. This function helps filter out DICOMDIR files from the dataset, ensuring that only actual image files are processed for viewing and editing.
     */
    const isDicomDir = (meta: BaseDicomMetadata) => {
        if (meta.SOPClassUID === "1.2.840.10008.1.3.10") {
            return true;
        }
        // DIRFILE typically won't have image indicators like InstanceNumber, AcquisitionNumber, or BitsAllocated
        const hasImageIndicators =
            meta.InstanceNumber !== undefined ||
            meta.AcquisitionNumber !== undefined ||
            meta.BitsAllocated !== undefined;

        return !hasImageIndicators;
    };

    /**
     * Processes an array of files, filtering for valid DICOM files and updating the application state.
     * @param file An array of File objects to process
     * @returns A promise resolving to void
     * This function checks each file in the array to determine if it is a valid DICOM file using the isDicomFile function. It then updates the application state with the filtered list of valid DICOM files and their metadata.
     */
    const processFilesFromArray = async (file:File[]) => {
        if (file.length ===0) {
            throw new Error("No DICOM files were found in the selected folder.")
        }

        let filePaths = file.map(file => file.path);
        const results = await window.api.readDicom(filePaths)

        // Filter out DICOMDIR results and log them
        for (const [path, meta] of Object.entries(results)) {
            if (isDicomDir(meta)) {
                console.warn(`DICOMDIR file detected and skipped: ${path}`);
                delete results[path];
            }
        }

        // Update filePaths to only include valid DICOM files
        filePaths = filePaths.filter(path => results[path]);

        console.log("Filtered DICOM files length:", Object.keys(results).length)
        console.log("Filtered DICOM files:", results)
        filePaths.sort((a, b) => {
        const metaA = results[a]
        const metaB = results[b]
        return (metaA.InstanceNumber ?? 0) - (metaB.InstanceNumber ?? 0)
        })
        setFilePaths(filePaths)
        setDataSet(results);
        

    }
    /**
     * Checks if a file is a valid DICOM file by examining its header.
     * @param file The file to check
     * @returns A promise resolving to true if the file is a DICOM file, false otherwise
     * DICOM files have a specific structure, including a 128-byte preamble followed by the characters "DICM". This function reads only the necessary portion of the file to verify its format, allowing for efficient filtering of valid DICOM files from a larger set of files.
     */
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
    
    /**
     * Retrieves all valid DICOM files from a given folder, recursively up to a specified depth.
     * @param fileList The list of files to process
     * @param maxDepth Maximum directory depth to search for DICOM files
     * @returns A promise resolving to an array of valid DICOM files
     * This function processes a list of files, checking their depth based on their webkitRelativePath and filtering them using the isDicomFile function. It ensures that only valid DICOM files within the specified directory depth are collected for further processing, which is crucial for efficiently handling large datasets without overwhelming the application with too many files at once.
     */
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

    /**
     * Determines the common path among a list of files.
     * @param files The list of files to analyze
     * @returns The common path as a string
     * This function takes a list of files and extracts their directory paths to find the longest common path segment. This is useful for setting the upload root in the application, allowing for easier management of file paths and ensuring that all related DICOM files are organized under a common directory structure.
     */
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
    /**
     * Handles the file input event, processing the selected files and updating the application state.
     * @param e The change event from the file input element
     * @returns A promise resolving to void
     * This function is called when the user selects a folder containing DICOM files. It processes the selected files, filters for valid DICOM files, and updates the application state with the results.
     */
    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
        if (!e.target.files || e.target.files.length === 0) {
            throw new Error("Empty Folder");
        }
        
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

    /**
     * Fetches the first valid DICOM file from a list of files.
     * @param fileList  The list of files to search through
     * @param maxDepth  The maximum directory depth to search
     * @returns A promise resolving to void
     * This function iterates through the provided list of files, checking each one to determine if it is a valid DICOM file using the isDicomFile function. It also considers the directory depth of each file based on its webkitRelativePath to ensure that only files within the specified depth are processed. Once a valid DICOM file is found, it updates the application state with its metadata and path, allowing for the initial display of the DICOM study while the rest of the files are being processed in the background.
     */
    const fetchFirstFile = async (fileList: FileList, maxDepth: number):Promise<void> => {  
        console.log("isLoading:",isLoading)
        for (const file of Array.from(fileList)) {
            // Calculate depth from webkitRelativePath
            const pathDepth = file.webkitRelativePath.split("/").length - 1; // -1 for file itself
            if (pathDepth > maxDepth) continue;
    
            if (await isDicomFile(file)) {
                const res =  await processFirstFile(file.path);
                if (res) return;
            };
        }
    
    }

    const processFirstFile = async (filePath:string):Promise<boolean> => {
        const results = await window.api.readDicom([filePath])

        for (const [path, meta] of Object.entries(results)) {
            if (isDicomDir(meta)) {
                console.warn(`DICOMDIR file detected and skipped: ${path}`);
                return false;
            }
        }
        setDataSet(results);
        
        setFilePaths([filePath])
        console.log(results);
        return true;
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
            const items = e.dataTransfer.items
            const files: File[] = []
        
            console.log(`File: ${Array.from(e.dataTransfer.items)}`)

            
        
            for (const item of items) {
                const file = item.getAsFile();
                if (file && file.name.toLowerCase().endsWith(".zip")) {
                    throw new Error("Zip files are not supported.");
                }
            }
                
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

            console.log(`Length of files collected: ${files.length}`)

            const dicomFiles = await filterDicomFiles(files)

            await processFilesFromArray(dicomFiles)




            

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