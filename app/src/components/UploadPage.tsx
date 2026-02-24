import React from "react"
import { useNavigate } from "react-router-dom"
import { BaseDicomMetadata } from "../types/BaseDicomMetadata"


const UploadPage: React.FC = () => {
  
  const navigate = useNavigate()
  const handleNavigation = (data: BaseDicomMetadata[] | null):void => {
    navigate("/viewer", { state: { data } })
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>):Promise<void> => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const filePaths = Array.from(files).map(file => file.path)

    const results = await window.api.readDicom(filePaths)

    handleNavigation(results);
  }

  return (
    <div className="w-full max-w-lg bg-slate-800 rounded-2xl shadow-2xl p-10 border border-slate-700">
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Upload DICOM File</h2>
        <p className="text-slate-400 text-sm">
          Select a .dcm file to read metadata
        </p>
      </div>

      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center hover:border-blue-500 hover:bg-slate-700 transition">
          <p className="text-lg font-medium">
            Click to Upload
          </p>
          <p className="text-sm text-slate-400 mt-2">
            or drag & drop
          </p>
        </div>
        <input
          type="file"
          multiple
          accept=".dcm"
          className="hidden"
          onChange={handleFile}
        />
      </label>
    </div>
  )
}

export default UploadPage
