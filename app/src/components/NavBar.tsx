// components/Navbar.tsx
import React from "react"

interface NavbarProps {
  onSave?: () => void
  onExport?: () => void
  onBack?: () => void
}

const Navbar: React.FC<NavbarProps> = ({
  onSave,
  onExport,
  onBack
}) => {
  return (
    <div className="w-full h-14 bg-slate-800 text-white flex items-center justify-between px-6 shadow-md">
      
      <div className="text-lg font-semibold">
        DICOM Viewer
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          Save
        </button>

        <button
          onClick={onExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
        >
          Export
        </button>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
        >
          Back
        </button>
      </div>
    </div>
  )
}

export default Navbar