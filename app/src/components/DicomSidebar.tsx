import React, { useState } from "react"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight } from "lucide-react"

interface DicomSidebarProps {
  dataSet: Record<string, BaseDicomMetadata>
  curSlice: DicomSlice | undefined
}

/**
 * Strict Pick:
 * Only render keys that exist in BaseDicomMetadata.
 * This prevents unexpected runtime tags from appearing.
 */
const ALLOWED_KEYS: (keyof BaseDicomMetadata)[] = [
  "PatientName",
  "SeriesNumber",
  "PixelSpacing",
  "Exposure",
  "ExposureTime",
  "RevolutionTime",
  "SpiralPitchFactor",
  "AccessionNumber",
  "AcquisitionDate",
  "AcquisitionNumber",
  "AcquisitionTime",
  "AcquisitionType",
  "BitsAllocated",
  "BitsStored",
  "BodyPartExamined",
  "CTDIPhantomTypeCodeSequence",
  "CTDIvol",
  "Columns",
  "ContentDate",
  "ContentTime",
  "ContrastBolusAgent",
  "ContrastBolusIngredientConcentration",
  "ContrastBolusRoute",
  "ContrastBolusTotalDose",
  "ContrastBolusVolume",
  "ContrastFlowDuration",
  "ContrastFlowRate",
  "ConversionType",
  "ConvolutionKernel",
  "DataCollectionDiameter",
  "DeidentificationMethod",
  "DeviceSerialNumber",
  "DistanceSourceToDetector",
  "DistanceSourceToPatient",
  "EstimatedDoseSaving",
  "ExposureModulationType",
  "FilterType",
  "FluoroscopyFlag",
  "FrameOfReferenceUID",
  "GantryDetectorTilt",
  "HighBit",
  "ImageComments",
  "ImageOrientationPatient",
  "ImagePositionPatient",
  "ImageType",
  "InstanceNumber",
  "InstitutionalDepartmentName",
  "IrradiationEventUID",
  "KVP",
  "LossyImageCompression",
  "Manufacturer",
  "ManufacturerModelName",
  "Modality",
  "PatientID",
  "PatientPosition",
  "PatientSex", // "M" | "F" 
  "PhotometricInterpretation",
  "PixelRepresentation",
  "PositionReferenceIndicator",
  "ProtocolName",
  "ReconstructionDiameter",
  "ReferencedPerformedProcedureStepSequence",
  "RequestAttributesSequence",
  "RequestingPhysician",
  "RescaleIntercept",
  "RescaleSlope",
  "RescaleType",
  "Rows",
  "SOPClassUID",
  "SOPInstanceUID",
  "SamplesPerPixel",
  "ScanOptions",
  "SeriesDate",
  "SeriesDescription",
  "SeriesInstanceUID",
  "SeriesTime",
  "SingleCollimationWidth",
  "SliceThickness",
  "SoftwareVersions",
  "SpacingBetweenSlices",
  "SpecificCharacterSet",
  "StationName",
  "StudyDate",
  "StudyDescription",
  "StudyID",
  "StudyInstanceUID",
  "StudyTime",
  "TableFeedPerRotation",
  "TableSpeed",
  "TotalCollimationWidth",
  "WindowCenter",
  "WindowWidth",
  "XFocusCenter",
  "XRayTubeCurrent",
  "YFocusCenter"
]
ALLOWED_KEYS.sort() // Sort keys alphabetically for better UX

const formatPrimitive = (value: unknown): string => {
  if (value === null || value === undefined) return "-"
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

const NestedField: React.FC<{ label: string; value: any }> = ({
  label,
  value,
}) => {
  const [open, setOpen] = useState(false)

  if (value === null || value === undefined) return null

  // Primitive
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <div className="text-xs">
        <div className="font-mono text-muted-foreground">{label}</div>
        <div className="break-all text-foreground">
          {String(value)}
        </div>
      </div>
    )
  }

  // Array handling
  if (Array.isArray(value)) {
    // If array of primitives → render inline
    const isPrimitiveArray = value.every(
      (v) =>
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
    )

    if (isPrimitiveArray) {
      return (
        <div className="text-xs">
          <div className="font-mono text-muted-foreground">{label}</div>
          <div className="break-all text-foreground">
             {`[${value.join(", ")}]`}
          </div>
        </div>
      )
    }

    // Otherwise → array of objects (DICOM sequence)
    return (
      <div className="text-xs">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground transition"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          {label}
        </button>

        {open && (
          <div className="pl-4 mt-2 space-y-3 border-l">
            {value.map((item: any, index: number) => (
              <div key={index} className="space-y-1">

                {Object.entries(item).map(([k, v]) => {
                  if (k === "_vrMap") return null

                  return (
                    <div key={k}>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {k}
                      </div>
                      <div className="break-all text-foreground">
                        {String(v)}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Plain object (non-array)
  if (typeof value === "object") {
    return (
      <div className="text-xs">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground transition"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          {label}
        </button>

        {open && (
          <div className="pl-4 mt-2 space-y-2 border-l">
            {Object.entries(value).map(([k, v]) => {
              if (k === "_vrMap") return null

              return (
                <div key={k}>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {k}
                  </div>
                  <div className="break-all text-foreground">
                    {String(v)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}

const DicomSidebar: React.FC<DicomSidebarProps> = ({
  dataSet,
  curSlice,
}) => {
  if (!curSlice) {
    return (
      <div className="w-80 border-l p-4 text-sm text-muted-foreground">
        No slice selected
      </div>
    )
  }
  const [displayAdvancedTags, setDisplayAdvancedTags] = useState(false);
  const tags = dataSet[curSlice.filePath]

  console.log("Rendering sidebar for slice:", curSlice.fileName, "with tags:", tags)

  if (!tags) {
    return (
      <div className="w-80 border-l p-4 text-sm text-muted-foreground">
        No metadata available
      </div>
    )
  }

  return (
    <div
      className={`w-80 border-l bg-background flex flex-col p-4 space-y-4 pb-32`}
    >
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">DICOM Metadata</h2>
        <div className="flex flex-row items-center justify-between">        
          <p className="text-xs text-muted-foreground">
            Slice #{tags.InstanceNumber ?? "-"}
          </p>
          <button className="mt-2 text-xs text-muted-foreground hover:text-foreground transition bg-blue-300" onClick={() => setDisplayAdvancedTags(!displayAdvancedTags)}>
            {displayAdvancedTags ? "Show All Tags" : "Show Common Tags"}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {displayAdvancedTags ? 
              
              ALLOWED_KEYS.map((key) => {
                const value = tags[key]
                if (value === undefined) return null

                return (
                  <NestedField
                    key={String(key)}
                    label={String(key)}
                    value={value}
                  />
                )
              })
              :
              Object.entries(tags).sort().map(([key, value]) => {
                if (value === undefined) return null

                return (
                  <NestedField
                    key={key}
                    label={key}
                    value={value}
                  />
                )
              })
            }
          </div>
        
          

          
        
      </ScrollArea>
    </div>
  )
}

export default DicomSidebar