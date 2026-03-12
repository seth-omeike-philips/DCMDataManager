type DicomSlice = {
  rows: number;
  cols: number;
  pixelData: Uint16Array | Uint8Array;
  instanceNumber: number;
  filePath: string;
  fileName: string;
};