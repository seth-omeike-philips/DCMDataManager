import React, { useState } from "react"
import EditTagsModal from "./EditTagsModal"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"
import { useFileContext} from "../context/FileContext"
import { useModal } from "@/context/ModalContext"
import { Loader2 } from "lucide-react"
import { Transformation } from "@/policy/PolicyLogic"


interface NavbarProps {
  dataSet: Record<string, BaseDicomMetadata>
  isAllFilesAvailable: boolean
  setIsAllFilesAvailable:React.Dispatch<React.SetStateAction<boolean>>
  setIsFileUploaded: React.Dispatch<React.SetStateAction<boolean>>

}


const Navbar: React.FC<NavbarProps> = ({ dataSet, isAllFilesAvailable,setIsAllFilesAvailable,setIsFileUploaded }) => {
  const [showModal, setShowModal] = useState(false)
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const {uploadRoot} = useFileContext();
  const { openModal } = useModal();
  const [modifiedDataSet, setModifiedDataSet] = useState<Record<string, Record<keyof BaseDicomMetadata, Transformation>>>({});
  const handleEditTags = () => {
    if (!dataSet) return
    setShowModal(true)
  }

  const handleBack = () => {
    setIsFileUploaded(false);
    setIsAllFilesAvailable(false);
  }


  const handleExport = async () => {
    try {
      if (!modifiedDataSet ||  Object.keys(modifiedDataSet).length === 0) {
        throw new Error("No Policy Applied");
      }

      setExportStatus("loading")

      // Export
      const result = await window.api.writeDicom(modifiedDataSet,dataSet, uploadRoot)
      console.log(result)
      if (result.success && result.exportPath) {
        setExportStatus("success")
        openModal({
          type: "success",
          title: "Export Successful",
          message: `Files exported to:\n${result.exportPath}`
        })

        setTimeout(() => {
          setExportStatus("idle")
        }, 2000)

      } else {
        throw new Error(result?.error || "Export failed")
      }

    } catch (err) {
      setExportStatus("error")
      openModal({
          type: "error",
          title: "Export Failed",
          message: `${err}`
      })
      setTimeout(() => {
          setExportStatus("idle")
        }, 2000)
    }
  }

  return (
    <>
      <div className="w-full h-14 bg-slate-800 text-white flex items-center justify-between px-6 shadow-md">
        <div className="text-lg font-semibold">DICOM Viewer</div>

        <div className="flex gap-3">

          <button
            onClick={handleEditTags}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Edit Tags
          </button>

          {exportStatus === "idle" && (
            <button
              onClick={handleExport}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              disabled= {!isAllFilesAvailable}
            >
              {isAllFilesAvailable ?
               ("Export") :
                (<Loader2 className="h-5 w-5 animate-spin text-white" />)
              }
            </button>
          )}

          {exportStatus === "loading" && (
            <button
              disabled
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              <Loader2 className="h-10 w-10 animate-spin text-white" />
            </button>
          )}

          {exportStatus === "success" && (
            <button
              disabled
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              ✔ Exported
            </button>
            
          )}

          {exportStatus === "error" && (
            <button
              disabled
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              ✖ Failed
            </button>
          )}

          <button
            onClick={() => handleBack()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
          >
            Back
          </button>

          {/**
           * 
           
          <button
            onClick={() => {
                openModal({
                type: "info",
                title: "Export Successful",
                message:"Alr bo who even believes this"
              })
            }}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
          >
            Test Modal
          </button>
          */}
        </div>
      </div>

      {showModal && dataSet && (
        <EditTagsModal
          dataSet={dataSet}
          onClose={() => setShowModal(false)}
          isAllFilesAvailable={isAllFilesAvailable}
          setModifiedDataSet={setModifiedDataSet}
        />
      )}
    </>
  )
}

export default Navbar;