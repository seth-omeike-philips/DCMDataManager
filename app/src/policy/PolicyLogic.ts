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



export const policyLogicFunction = (tagActions: Partial<Record<PathKey, TagAction>>): Record<PathKey,TagAction> => {

  const modifiedDataSet:Record<PathKey,TagAction> = {};


    for (const key of Object.keys(tagActions) as PathKey[]) {
      const action = tagActions[key];

      if (NonEditableTags.has(key)) continue;

      switch (action?.type) {
        case "HASH":
          modifiedDataSet[key] = { type: "HASH" };
          break;

        case "GENERATE_UID":
          modifiedDataSet[key] = { type: "GENERATE_UID" };
          break;

        case "KEEP":
          modifiedDataSet[key] = { type: "KEEP" };
          break;

        case "MAP":
          modifiedDataSet[key] = {type: "MAP"};
          break;

        case "REMOVE":
          modifiedDataSet[key] = { type: "REMOVE" };
          break;
        
        case "CUSTOM":
          modifiedDataSet[key] = {type:"CUSTOM", value:action.value};
          break;
        default:
          //
      }
    }

  return modifiedDataSet;
};

