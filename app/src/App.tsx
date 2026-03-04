import React, { useMemo, useState } from "react"
import DicomViewer from "./components/DicomViewer"
import { Routes, Route } from "react-router-dom"
import { FileContext } from "./context/FileContext"
import UploadPage from "./components/UploadPage"

const App: React.FC = () => {
  const [filePaths, setFilePaths] = useState<string[]|null>(null);

  const value = useMemo(
  () => ({ filePaths, setFilePaths }),
  [filePaths]
);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white ">
      
      <header className="w-full px-8 py-4 border-b border-slate-700">
        <h1 className="text-xl font-semibold tracking-wide">
          DICOM Data Manager
        </h1>
      </header>

      <main className="w-full flex-1 flex items-center justify-center p-8">
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