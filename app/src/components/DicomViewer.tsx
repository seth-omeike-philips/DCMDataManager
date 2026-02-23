import React from "react"
import { data, useLocation, useNavigate } from "react-router-dom"

interface Props {
  dataset: Record<string, any> | null
}

const DicomViewer: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const dataset: any[] = location.state?.data // Need to know type of data being passed here

  console.log("Received dataset:", dataset)
  console.log("Dataset type:", typeof dataset)
  console.log(dataset);
  if (!dataset) {
    return (
      <div className="p-6 text-gray-500 text-center">
        No DICOM loaded
      </div>
    )
  }
  const formatValue = (value: any): string => {
    if (value == null) return ""

    if (typeof value === "string") return value

    if (typeof value === "number") return String(value)

    if (Array.isArray(value)) {
      return value.map(formatValue).join(", ")
    }

    if (typeof value === "object") {
      // Handle Person Name
      if ("Alphabetic" in value) {
        return value.Alphabetic
      }

      return JSON.stringify(value)
    }

    return String(value)
  }


  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">
        DICOM Metadata
      </h2>

      <div className="space-y-2">
        {Object.entries(dataset).sort(([a], [b]) =>
  a.localeCompare(b)
).map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-2 gap-4 bg-white p-3 rounded shadow-sm border border-gray-100"
          >
            <div className="font-medium text-gray-700 break-words">
              {key}
            </div>

            <div className="text-gray-600 break-words">
              {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DicomViewer
