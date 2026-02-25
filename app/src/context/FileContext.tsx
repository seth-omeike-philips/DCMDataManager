import { createContext, useContext } from "react";
import { FileContextType } from "../types/FileContextType";

export const FileContext = createContext<FileContextType | null>(null);

export const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error("useFileContext must be used inside FileContext.Provider");
  }
  return context;
};