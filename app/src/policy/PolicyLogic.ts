import { BaseDicomMetadata } from "@/types/BaseDicomMetadata";
import { TagFunctions } from "@/types/TagFunctions";

function simpleDeterministicHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0
  }

  return Math.abs(hash).toString()
}

// We will need functions for each of the tags 

const tagFunctions: TagFunctions  = {
    REMOVE: (dataset,key):void => {
        delete dataset[key];
    },
    REPLACE_WITH_UNDEFINED: (dataset,key):void => {
        dataset[key] = undefined;
    },
    HASH: (dataset,key):void =>{
        const value = dataset[key]
        if (typeof value !== "string") {
            console.warn(`Expected a string value for hashing, but got ${typeof value} for key ${key}, value: ${value}. Skipping hashing.`)
            return
        }
        dataset[key] = simpleDeterministicHash(value)
    },
    GENERATE_UID:(dataset,key):void => {
        // Generate a UID (simplified example)
        dataset[key] = "1.2.840.113619.2.1.GENUID." + Math.floor(Math.random() * 1000000);
    },
    KEEP: (dataset,key):void => {
        // Do nothing, keep the original value
        console.log(`Keeping original value for key ${key}: ${dataset[key]}`)
    },
    // We will most likely need to pass in some additional parameters for the MAP function, 
    // such as a mapping dictionary or a callback function to determine the new value based
    //  on the old value. For now, we will just leave it as a placeholder.
    MAP: (dataset,key):void => {
        if (key === "PatientName") {
          const value = dataset[key]

          if (!value) {
            console.warn(`Expected a value for mapping PatientName, but got undefined. Skipping mapping.`)
            return
          }

          if (Array.isArray(value) && value.every(v => typeof v === "object" && "Alphabetic" in v)) {
            dataset[key] = value.map(v => {
              if (typeof v.Alphabetic !== "string") {
                return v // or return a safe fallback
              }

              return {
                ...v,
                Alphabetic: simpleDeterministicHash(v.Alphabetic)
              }
            })
          } else {
            console.warn(
              `Expected an array of objects with an Alphabetic property for mapping PatientName, but got ${JSON.stringify(value)}. Skipping mapping.`
            )
          }
        }

        else if (key === "PatientID") {
          const value = dataset[key]
          if (typeof value !== "string") {
            console.warn(`Expected a string value for mapping PatientID, but got ${typeof value} for key ${key}, value: ${value}. Skipping mapping.`)
            return
          }
          dataset[key] = "Mapped_" + value
        }

        else if (key === "StudyDate") {
          const rawDate = dataset[key]
          if (typeof rawDate !== "string") {
            console.warn(`Expected a string rawDate for mapping StudyDate, but got ${typeof rawDate} for key ${key}, rawDate: ${rawDate}. Skipping mapping.`)
            return
          }
          // Example: Shift the date by a fixed number of days (e.g., 30 days)
          // Note that rawDate is expected to be in the format "YYYY-MM-DD", so we need to parse it accordingly
          const newMonth = Math.floor(Math.random()*13)
          const newDay = Math.floor(Math.random()*29)
          const newYear = Math.floor(Math.random()*30) + 1990
          dataset[key] = `${newYear}${String(newMonth).padStart(2, '0')}${String(newDay).padStart(2, '0')}`
        }
    },
}

export const policyLogicFunction = (
  profile: Profile,
  policyLogic:Record<Profile, Record<keyof BaseDicomMetadata, Tag>>,
   dataset: BaseDicomMetadata): void => {
    const tagActions = policyLogic[profile]
    for (const key in tagActions) {

      const dicomKey = key as keyof BaseDicomMetadata
      const action = tagActions[dicomKey]

      // This ensures type safety for the tag functions, since each function expects a specific 
      // subset of keys. For example, HASH and GENERATE_UID only work on string keys, 
      // so we need to ensure that the key we pass in is of the correct type.
      switch (action) {

        case "HASH":
          tagFunctions.HASH(
            dataset,
            dicomKey as StringKeys<BaseDicomMetadata>
          )
          break

        case "GENERATE_UID":
          tagFunctions.GENERATE_UID(
            dataset,
            dicomKey as StringKeys<BaseDicomMetadata>
          )
          break
        
        default:
          tagFunctions[action](dataset, dicomKey)
      }
    }
}
