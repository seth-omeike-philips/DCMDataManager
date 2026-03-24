type DicomSlice = {
  rows: number;
  cols: number;
  pixelData: Uint16Array | Uint8Array | undefined;
  instanceNumber: number;
  filePath: string;
  fileName: string;
};