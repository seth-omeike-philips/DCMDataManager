import React, { useState } from "react"
import EditTagsModal from "./EditTagsModal"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"

interface NavbarProps {
  dataSet: Record<string, BaseDicomMetadata>
}


const Navbar: React.FC<NavbarProps> = ({ dataSet }) => {
  const [showModal, setShowModal] = useState(false)

  const handleEditTags = () => {
    if (!dataSet) return
    setShowModal(true)
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

          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition">
            Export
          </button>

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