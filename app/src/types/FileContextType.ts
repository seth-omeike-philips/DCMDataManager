export type FileContextType = {
  filePaths: string[] | null;
  setFilePaths: React.Dispatch<React.SetStateAction<string[]| null>>;
  uploadRoot: string | null;
  setUploadRoot: React.Dispatch<React.SetStateAction<string | null>>;
};