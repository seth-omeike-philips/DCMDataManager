export type FileContextType = {
  filePaths: string[] | null;
  setFilePaths: React.Dispatch<React.SetStateAction<string[]| null>>;
};