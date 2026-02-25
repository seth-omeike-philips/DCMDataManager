// pages/DicomViewer.tsx
import React, { useState } from "react"
import Navbar from "./NavBar"
import DicomStackViewer from "./DicomStackViewer"
import DicomSidebar from "../components/DicomSidebar"
import { useFileContext } from "../context/FileContext"

const DicomViewer: React.FC = () => {

  const {filePaths} = useFileContext(); 
  const [dataSet, setDataSet] = useState<any>(null)


  return (
    <div className="flex flex-col h-screen">
      
      <Navbar
        onSave={() => console.log("Save clicked")}
        onExport={() => console.log("Export clicked")}
        onBack={() => window.history.back()}
      />

      <div className="flex flex-1 overflow-hidden">
        
        <div className="flex-1">
          <DicomStackViewer />
        </div>

        <DicomSidebar dataSet={dataSet} position="right" />
      </div>

    </div>
  )
}

export default DicomViewer