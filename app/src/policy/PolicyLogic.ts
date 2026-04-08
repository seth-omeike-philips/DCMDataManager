import { BaseDicomMetadata } from "@/types/BaseDicomMetadata";
import { NonEditableTags } from "./NonEditableTags";
import { PathKey } from "./BasePolicyLogic";

// We will need functions for each of the tags 


export type TagAction =   
  | { type: "REMOVE" }
  | { type: "HASH"}
  | { type: "GENERATE_UID" }
  | { type: "MAP"}
  | { type: "KEEP" }
  | {type: "CUSTOM", value: string}



export const policyLogicFunction = (tagActions: Partial<Record<PathKey, TagAction>>,dataSet: Record<string, BaseDicomMetadata>
): Record<string, Record<PathKey, TagAction>> => {

  const modifiedDataSet: Record<string,Record<PathKey, TagAction>> = {};
  for (const [filePath, _] of Object.entries(dataSet)) {

    modifiedDataSet[filePath] = {} as Record<PathKey,TagAction>;

    for (const key of Object.keys(tagActions) as PathKey[]) {
      const action = tagActions[key];

      if (NonEditableTags.has(key)) continue;

      switch (action?.type) {
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
          modifiedDataSet[filePath][key] = {type: "MAP"};
          break;

        case "REMOVE":
          modifiedDataSet[filePath][key] = { type: "REMOVE" };
          break;
        
        case "CUSTOM":
          modifiedDataSet[filePath][key] = {type:"CUSTOM", value:action.value};
          break;
        default:
          //
      }
    }
  }

  return modifiedDataSet;
};

