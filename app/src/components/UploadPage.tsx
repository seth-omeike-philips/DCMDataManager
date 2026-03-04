import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseDicomMetadata } from "../types/BaseDicomMetadata"
import { useFileContext } from "../context/FileContext"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

const UploadPage: React.FC = () => {
  const { setFilePaths } = useFileContext()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleNavigation = (fileData: Record<string, BaseDicomMetadata>): void => {
    navigate("/viewer", { state: { fileData } })
  }

  const processFiles = async (fileList: FileList) => {
    setLoading(true)
    setFileCount(fileList.length)

    const filePaths = Array.from(fileList).map(file => file.path)
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

  const handleFileInput = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return
    await processFiles(e.target.files)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return
    await processFiles(e.dataTransfer.files)
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
                Select one or more <span className="font-medium">.dcm</span> files
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

                <input
                  id="fileInput"
                  type="file"
                  multiple
                  accept=".dcm"
                  className="hidden"
                  onChange={handleFileInput}
                />
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
                Reading metadata and sorting slices
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default UploadPage