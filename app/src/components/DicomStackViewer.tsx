import React, { useEffect, useRef, useState } from "react";
import dicomParser from "dicom-parser";
import { useFileContext } from "../context/FileContext";
import { Loader2 } from "lucide-react"

interface DicomStackViewerProps {
  setCurSlice: React.Dispatch<React.SetStateAction<DicomSlice | undefined>>
  isAllFilesAvailable: boolean
}

const DicomStackViewer: React.FC<DicomStackViewerProps> = ({ setCurSlice,isAllFilesAvailable }) => {
  const { filePaths } = useFileContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [slices, setSlices] = useState<DicomSlice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔹 Load & Parse DICOM Files
  useEffect(() => {
    const loadDicoms = async () => {
      try {

       
        if (!filePaths || filePaths.length === 0) return;
        const buffers = await window.electronAPI.readMultipleFiles(filePaths);
        const parsedSlices: DicomSlice[] = [];

        for (let i = 0; i < buffers.length; i++) {
          const buffer = buffers[i];
          const fileName = filePaths[i].split(/[/\\]/).pop() || `Slice ${i}`;

          const byteArray = new Uint8Array(buffer);

          const dataSet = dicomParser.parseDicom(byteArray);
          

          const rows = dataSet.uint16("x00280010")?.valueOf()
          const cols = dataSet.uint16("x00280011")?.valueOf()
          const instanceNumber = dataSet.intString("x00200013") || 0;

          if (!rows || !cols) {
            console.warn("Skipping invalid image:", fileName)
            continue
          }
          const pixelElement = dataSet.elements.x7fe00010;

          if (!pixelElement) {
            console.warn("Skipping non-image DICOM:", fileName)
            continue
          }
          const bitsAllocated = dataSet.uint16("x00280100") || 16
          let pixelData;

          if (bitsAllocated === 16) {
            pixelData = new Uint16Array(
              dataSet.byteArray.buffer,
              pixelElement.dataOffset,
              pixelElement.length / 2
            )
          } else {
            pixelData = new Uint8Array(
              dataSet.byteArray.buffer,
              pixelElement.dataOffset,
              pixelElement.length
            )
}

          parsedSlices.push({
            rows,
            cols,
            pixelData,
            instanceNumber,
            filePath: filePaths[i],
            fileName
          });
        }

        // Sort slices by InstanceNumber
        parsedSlices.sort((a, b) => a.instanceNumber - b.instanceNumber);

        setSlices(parsedSlices);
        setCurrentIndex(0);
      } catch (err) {
        console.log("Stack error:",err)
      }
    };

    loadDicoms();
  }, [filePaths]);

  // 🔹 Render Current Slice
  useEffect(() => {
    if (!slices.length) return;

    // This slice should be passed to the sidebar for metadata display
    const slice = slices[currentIndex];
    setCurSlice(slice);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    canvas.width = slice.cols;
    canvas.height = slice.rows;

    const imageData = ctx.createImageData(slice.cols, slice.rows);

    const { pixelData } = slice;

    // Basic normalization (simple windowing)
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < pixelData.length; i++) {
    const val = pixelData[i];
    if (val < min) min = val;
    if (val > max) max = val;
    }

    for (let i = 0; i < pixelData.length; i++) {
      const value = ((pixelData[i] - min) / (max - min)) * 255;

      imageData.data[i * 4 + 0] = value;
      imageData.data[i * 4 + 1] = value;
      imageData.data[i * 4 + 2] = value;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [slices, currentIndex]);

  // 🔹 Scroll to Change Slice
  const handleWheel = (event: React.WheelEvent) => {
    if (!slices.length) return;

    if (event.deltaY > 0) {
      setCurrentIndex((prev) => Math.min(prev + 1, slices.length - 1));
    } else {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  };

    return (
    <div className="flex flex-col items-center justify-center bg-black h-full overflow-hidden" style={{ overscrollBehavior: "contain" }} onWheel={handleWheel}>
        {slices.length > 0 && (
        <div className="text-white mb-2 text-sm">
            
            {!isAllFilesAvailable && (
              <div className="flex items-center justify-between flex-col">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
                <h2 className="text-blue-400">Loading remaining DICOM Files...</h2>
              </div>
              
            )}
            <p className="">Slice {currentIndex + 1} / {slices.length}</p>
            <br />
            <p className="">File: {slices[currentIndex]?.fileName}</p>
            
        </div>
        )}

        <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
    </div>
    );
};

export default DicomStackViewer;