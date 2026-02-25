// components/DicomSidebar.tsx
import React from "react"

interface DicomSidebarProps {
  dataSet: any
  position?: "left" | "right"
}

const DicomSidebar: React.FC<DicomSidebarProps> = ({
  dataSet,
  position = "right"
}) => {

  if (!dataSet) {
    return (
      <div className="w-80 bg-slate-100 p-4 overflow-y-auto">
        No metadata available
      </div>
    )
  }

  const tags = Object.keys(dataSet.elements)

  return (
    <div
      className={`w-80 bg-slate-100 p-4 overflow-y-auto border-l ${
        position === "left" ? "order-first border-r" : ""
      }`}
    >
      <h2 className="text-lg font-semibold mb-4">
        DICOM Tags
      </h2>

      <div className="space-y-2 text-sm">
        {tags.map((tag) => {
          const element = dataSet.elements[tag]
          const value = dataSet.string(tag) || "Binary/Sequence"

          return (
            <div key={tag} className="border-b pb-2">
              <div className="font-mono text-xs text-gray-500">
                {tag}
              </div>
              <div className="text-gray-800 break-all">
                {value}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DicomSidebar