import React, { useState } from "react"
import EditTagsModal from "./EditTagsModal"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"

interface NavbarProps {
  dataSet: Record<string, BaseDicomMetadata>
}


const Navbar: React.FC<NavbarProps> = ({ dataSet }) => {
  const [showModal, setShowModal] = useState(false)
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleEditTags = () => {
    if (!dataSet) return
    setShowModal(true)
  }

  const handleExport = async () => {
    try {
      if (!dataSet || Object.keys(dataSet).length === 0) {
        alert("No datasets to export.")
        return
      }

      // Get Folder
      const folderResult = await window.api.selectExportFolder()

      if (folderResult.canceled) return

      const outputPath = folderResult.folderPath
      if (outputPath === undefined) return

      setExportStatus("loading")

      // Export
      console.log(outputPath)
      const result = await window.api.writeDicom(outputPath, dataSet)

      if (result?.success) {
        setExportStatus("success")

        setTimeout(() => {
          setExportStatus("idle")
        }, 2000)

      } else {
        throw new Error(result?.error || "Export failed")
      }

    } catch (err) {
      console.error(err)
      setExportStatus("error")
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
            >
              Export
            </button>
          )}

          {exportStatus === "loading" && (
            <button
              disabled
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Exporting...
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
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
          >
            Back
          </button>
        </div>
      </div>

      {showModal && dataSet && (
        <EditTagsModal
          dataSet={dataSet}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

export default Navbar;