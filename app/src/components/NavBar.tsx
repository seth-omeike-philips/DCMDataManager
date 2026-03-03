// components/Navbar.tsx
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"
import React from "react"
import { policyLogicFunction } from "@/policy/PolicyLogic"

interface NavbarProps {
  dataSet?: Record<string, BaseDicomMetadata>
}


const Navbar: React.FC<NavbarProps> = ({ dataSet }) => {
  const handleSave = () => {
    console.log("Save clicked")
  }
  const handleExport = () => {
    console.log("Export clicked")
  }
  const handleEditTags = () => {
    console.log("Edit Tags clicked")
    if (dataSet) {
      console.log(policyLogicFunction)
    }
  }
  return (
    <div className="w-full h-14 bg-slate-800 text-white flex items-center justify-between px-6 shadow-md">
      
      <div className="text-lg font-semibold">
        DICOM Viewer
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleEditTags}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          Edit Tags
        </button>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
        >
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
  )
}

export default Navbar