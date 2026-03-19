import { BaseDicomMetadata } from "@/types/BaseDicomMetadata";
import { NonEditableTags } from "./NonEditableTags";

// We will need functions for each of the tags 


export type Transformation =   
  | { type: "REMOVE" }
  | { type: "HASH"}
  | { type: "GENERATE_UID" }
  | { type: "MAP"; value: any }
  | { type: "KEEP" };



export const policyLogicFunction = (tagActions: Record<keyof BaseDicomMetadata, Tag>,dataSet: Record<string, BaseDicomMetadata>
): Record<string, Record<keyof BaseDicomMetadata, Transformation>> => {

  const modifiedDataSet: Record<string,Record<keyof BaseDicomMetadata, Transformation>> = {};
  for (const [filePath, filePathValue] of Object.entries(dataSet)) {

    modifiedDataSet[filePath] = {} as Record<keyof BaseDicomMetadata,Transformation>;

    for (const key of Object.keys(tagActions) as (keyof BaseDicomMetadata)[]) {
      const action = tagActions[key];

      if (NonEditableTags.has(key)) continue;

      switch (action) {
        case "HASH":
          modifiedDataSet[filePath][key] = { type: "HASH" };
          break;

        case "GENERATE_UID":
          modifiedDataSet[filePath][key] = { type: "GENERATE_UID" };
          break;

        case "KEEP":
          modifiedDataSet[filePath][key] = { type: "KEEP" };
          break;

        case "MAP":
          modifiedDataSet[filePath][key] = {
            type: "MAP",
            value: filePathValue[key],
          };
          break;

        case "REMOVE":
          modifiedDataSet[filePath][key] = { type: "REMOVE" };
          break;
      }
    }
  }

  return modifiedDataSet;
};

