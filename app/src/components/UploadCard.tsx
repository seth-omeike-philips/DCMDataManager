import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
interface Props {
    isDragging: boolean
    setIsDragging:React.Dispatch<React.SetStateAction<boolean>>
    handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
    handleDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void>

}
const UploadCard: React.FC<Props> = ({isDragging,setIsDragging,handleDrop, handleFileInput}) => {
  return (
    <Card className="w-full max-w-2xl shadow-2xl rounded-2xl">
        <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center">
                Upload DICOM Study
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
            </div>
        </CardContent>
    </Card>
  )
}

export default UploadCard