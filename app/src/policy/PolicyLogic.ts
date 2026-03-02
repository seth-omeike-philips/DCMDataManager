import { BaseDicomMetadata } from "@/types/BaseDicomMetadata";

type Profile = "ANONYMIZE" | "DEIDENTIFY";
type Tag = "REMOVE_TAG"|"REPLACE_WITH_UNDEFINED"|"HASH"|"GENERATE_UID"|"KEEP"|"MAP";

// We will need functions for each of the tags 

const tagFunctions: Record<Tag, (dataset: BaseDicomMetadata,key: keyof BaseDicomMetadata) => void> = {
    "REMOVE_TAG": (dataset: BaseDicomMetadata,key: keyof BaseDicomMetadata):void => {
        delete dataset[key];
    },
    "REPLACE_WITH_UNDEFINED": (dataset: BaseDicomMetadata,key: keyof BaseDicomMetadata):void => {
        dataset[key] = undefined;
    },
    "HASH": (dataset: BaseDicomMetadata,key: keyof BaseDicomMetadata):void => {
        // Simple hash function for demonstration (not cryptographically secure)
        ;
    },
    "GENERATE_UID": () => {
        // Generate a UID (simplified example)
        return "1.2.840.113619.2.1." + Math.floor(Math.random() * 1000000);
    },
    "KEEP": ():void => {},
    "MAP": (dataset: BaseDicomMetadata,key: keyof BaseDicomMetadata):void => {
        ;
    },
}

export const policyLogic: Record<Profile, Record<string, Tag>> = {
    /**
     * DEIDENTIFY: Replace all personally identifiable information with "N/A" or a similar placeholder.
     * ANONYMIZE: Hash personally identifiable information to create a consistent but non-reversible identifier, while keeping non-identifiable information intact.
     */

    // total TC where n = len(files), k = number of tags, m = number of profiles:)
  ANONYMIZE: {
    "00100010": "REMOVE_TAG", // Patient's Name
    "00100020": "REMOVE_TAG", // Patient ID
    "00100030": "REMOVE_TAG", // Patient's Birth Date
    "00100040": "REMOVE_TAG", // Patient's Sex
  },
    DEIDENTIFY: {
    "00100010": "HASH", // Patient's Name
    "00100020": "HASH", // Patient ID
    "00100030": "HASH", // Patient's Birth Date
    "00100040": "KEEP", // Patient's Sex
    },
}