// pages/DicomViewer.tsx
import React, { useEffect, useState } from "react"
import Navbar from "./NavBar"
import DicomStackViewer from "./DicomStackViewer"
import DicomSidebar from "../components/DicomSidebar"
import { useLocation } from "react-router-dom"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"
const DicomViewer: React.FC = () => {

  const [dataSet, setDataSet] = useState<Record<string, BaseDicomMetadata>>({})
  const location = useLocation();
  const [curSlice, setCurSlice] = useState<DicomSlice | undefined>(undefined);

  useEffect(() => {
    if (location.state && location.state.fileData) {
      setDataSet(location.state.fileData)
    }
  }, [location.state])

  return (
    <div className="flex flex-col max-w-full h-screen">
      
      <Navbar
        onSave={() => console.log("Save clicked")}
        onExport={() => console.log("Export clicked")}
        onBack={() => window.history.back()}
      />

      <div className="flex flex-1 overflow-hidden">
        
        <div className="flex-1">
          <DicomStackViewer setCurSlice={setCurSlice} />
        </div>

        <DicomSidebar dataSet={dataSet} position="right" curSlice={curSlice}/>
      </div>

    </div>
  )
}

export default DicomViewer