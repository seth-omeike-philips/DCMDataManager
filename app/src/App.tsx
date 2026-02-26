import React, { useMemo, useState } from "react"
import DicomViewer from "./components/DicomViewer"
import { Routes, Route } from "react-router-dom"
import { FileContext } from "./context/FileContext"
import UploadPage from "./components/UploadPage"

export interface DicomData {
  [key: string]: any
}

const App: React.FC = () => {
  const [filePaths, setFilePaths] = useState<string[]|null>(null);

  const value = useMemo(
  () => ({ filePaths, setFilePaths }),
  [filePaths]
);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col">
      
      <header className="w-full px-8 py-4 border-b border-slate-700">
        <h1 className="text-xl font-semibold tracking-wide">
          DICOM Data Manager
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <FileContext.Provider value={value}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/viewer" element={<DicomViewer />} />
          </Routes>
        </FileContext.Provider>
      </main>
    </div>
  )
}

export default App