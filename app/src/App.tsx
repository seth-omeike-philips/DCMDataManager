import React, { useMemo, useState } from "react"
import { FileContext } from "./context/FileContext"
import { ModalProvider } from "./context/ModalContext"
import DicomApp from "./components/DicomApp"

const App: React.FC = () => {
  const [filePaths, setFilePaths] = useState<string[]|null>(null);
  const [uploadRoot, setUploadRoot] = useState<string | null>(null);
  
  const value = useMemo(
  () => ({
    filePaths,
    setFilePaths,
    uploadRoot,
    setUploadRoot
  }),
  [filePaths, uploadRoot]
)

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white ">
      
      <header className="w-full px-8 py-4 border-b border-slate-700">
        <h1 className="text-xl font-semibold tracking-wide">
          DICOM Data Manager
        </h1>
      </header>

      <main className="w-full flex-1 flex items-center justify-center p-8">
        <ModalProvider>
          <FileContext.Provider value={value}>
            <DicomApp/>
          </FileContext.Provider>
        </ModalProvider>
      </main>
    </div>
  )
}

export default App