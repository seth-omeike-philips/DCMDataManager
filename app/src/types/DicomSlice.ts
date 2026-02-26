type DicomSlice = {
  rows: number;
  cols: number;
  pixelData: Uint16Array;
  instanceNumber: number;
  filePath: string;
  fileName: string;
};