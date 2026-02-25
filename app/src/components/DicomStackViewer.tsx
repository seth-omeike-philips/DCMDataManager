import React, { useEffect, useRef, useState } from "react";
import dicomParser from "dicom-parser";
import { useFileContext } from "../context/FileContext";

type DicomSlice = {
  rows: number;
  cols: number;
  pixelData: Uint16Array;
  instanceNumber: number;
  fileName: string;
};

const DicomStackViewer: React.FC = () => {
  const { filePaths } = useFileContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [slices, setSlices] = useState<DicomSlice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔹 Load & Parse DICOM Files
  useEffect(() => {
    const loadDicoms = async () => {
      if (!filePaths || filePaths.length === 0) return;

      const buffers = await window.electronAPI.readMultipleFiles(filePaths);

      const parsedSlices: DicomSlice[] = [];

      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        const fileName = filePaths[i].split(/[/\\]/).pop() || `Slice ${i}`;

        const byteArray = new Uint8Array(buffer);
        const dataSet = dicomParser.parseDicom(byteArray);

        const rows = dataSet.uint16("x00280010")?.valueOf() || 0;
        const cols = dataSet.uint16("x00280011")?.valueOf() || 0;
        const instanceNumber = dataSet.intString("x00200013") || 0;

        const pixelElement = dataSet.elements.x7fe00010;

        const pixelData = new Uint16Array(
          dataSet.byteArray.buffer,
          pixelElement.dataOffset,
          pixelElement.length / 2
        );

        parsedSlices.push({
          rows,
          cols,
          pixelData,
          instanceNumber,
          fileName
        });
      }

      // Sort slices by InstanceNumber
      parsedSlices.sort((a, b) => a.instanceNumber - b.instanceNumber);

      setSlices(parsedSlices);
      setCurrentIndex(0);
    };

    loadDicoms();
  }, [filePaths]);

  // 🔹 Render Current Slice
  useEffect(() => {
    if (!slices.length) return;

    const slice = slices[currentIndex];
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
    <div className="flex flex-col items-center justify-center bg-black h-full" onWheel={handleWheel}>
        {slices.length > 0 && (
        <div className="text-white mb-2 text-sm">
            Slice {currentIndex + 1} / {slices.length}
            <br />
            File: {slices[currentIndex]?.fileName}
        </div>
        )}

        <canvas
        ref={canvasRef}
        style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
    </div>
    );
};

export default DicomStackViewer;