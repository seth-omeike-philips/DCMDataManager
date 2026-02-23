import React, { useState } from "react"
import UploadPage from "./components/UploadPage"
import DicomViewer from "./components/DicomViewer"
import { Routes, Route } from "react-router-dom"

export interface DicomData {
  [key: string]: any
}

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col">
      
      <header className="px-8 py-4 border-b border-slate-700">
        <h1 className="text-xl font-semibold tracking-wide">
          DICOM Data Manager
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/viewer" element={<DicomViewer />} />
        </Routes>
      </main>
    </div>
  )
}

export default App