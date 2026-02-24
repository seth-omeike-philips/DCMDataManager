import PhilipsTagsRaw from "../scripts/PhilipsTags.json"
import dcmjs from "dcmjs";
import { PhilipsDictionaryEntry } from "./PhilipsDictionaryEntry";

// Example of a private dictionary for Philips-specific tags
// NOTE: vm not given so initalized to 1 

export const PhilipsDictionaryItems: Record<string, PhilipsDictionaryEntry>  =
  PhilipsTagsRaw as Record<string, PhilipsDictionaryEntry>

  export function registerPhilipsDictionary() {
  Object.assign(
    dcmjs.data.DicomMetaDictionary.dictionary,
    PhilipsDictionaryItems
  )
}
