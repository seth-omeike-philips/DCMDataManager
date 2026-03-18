import { BaseDicomMetadata } from "@/types/BaseDicomMetadata";
import { TagFunctions } from "@/types/TagFunctions";
import { NonEditableTags } from "./NonEditableTags";

// We will need functions for each of the tags 

const hashDeterministic = async (value:string):Promise<string> => {
  const hashedValue = await window.api.hash(value);
  return hashedValue.toString();

}

const tagFunctions: TagFunctions  = {
    REMOVE: (dataset,key):void => {
        dataset[key] = undefined;
    },
    HASH: async (dataset,key):Promise<void> =>{
        const value = dataset[key]
        if (!value) {
          return 
        }
        if (typeof value !== "string") {
            console.warn(`Expected a string value for hashing, but got ${typeof value} for key ${key}, value: ${value}. Skipping hashing.`)
            return
        }
        dataset[key] = await hashDeterministic(value)
    },
    GENERATE_UID:(dataset,key):void => {
        // Generate a UID (simplified example)
        dataset[key] = "1.2.840.113619.2.1.GENUID." + Math.floor(Math.random() * 1000000);
    },
    KEEP: ():void => {
        // Do nothing, keep the original value
    },
    // We will most likely need to pass in some additional parameters for the MAP function, 
    // such as a mapping dictionary or a callback function to determine the new value based
    //  on the old value. For now, we will just leave it as a placeholder.
    MAP: async (dataset,key):Promise<void> => {
        if (key === "PatientName") {
          const value = dataset[key]

          if (!value) {
            console.warn(`Expected a value for mapping PatientName, but got undefined. Skipping mapping.`)
            return
          }

          if (Array.isArray(value) && value.every(v => typeof v === "object" && "Alphabetic" in v)) {
            dataset[key] = await Promise.all(
                value.map(async v => {
                if (typeof v.Alphabetic !== "string") {
                  return v // or return a safe fallback
                }

                return {
                  ...v,
                  Alphabetic: await hashDeterministic(v.Alphabetic)
                }
              })
            )
          } else {
            console.warn(
              `Expected an array of objects with an Alphabetic property for mapping PatientName, but got ${JSON.stringify(value)}. Skipping mapping.`
            )
          }
        }

        else if (key === "PatientID" || key === "OtherPatientIDs") {
          const value = dataset[key]
          if (typeof value !== "string") {
            console.warn(`Expected a string value for mapping PatientID, but got ${typeof value} for key ${key}, value: ${value}. Skipping mapping.`)
            return
          }
          dataset["PatientID"] = "Mapped_" + dataset["PatientID"]
          dataset["OtherPatientIDs"] = "Mapped_" + dataset["OtherPatientIDs"]
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
        else if (key === "PatientSex") {
          // Even Represents Male, Odd represents Female
          const value = dataset[key]
          if (value === undefined) {
            console.log(`No value to edit: Value: ${value}`)
            return 
          }
          if ((value !== "M") && (value !== "F")) {
            console.warn(`Expected sex to either be M or F but got ${value}`)
            return
          }
          
          if (value == "M") {
            // Generate Even number in range [0,100]
            const randomNumber = Math.floor(Math.random()*51)*2
            dataset[key]= String(randomNumber)
          }
          else if (value == "F") {
            // Generate Odd number in range [0,100]
            const randomNumber = Math.floor(Math.random()*50)*2 + 1
            dataset[key]= String(randomNumber)
          }
          
        }
        else if (key === "PatientBirthDate") {
          const value = dataset[key]
          if (value === undefined || value === "") {
            console.log(`No value to edit: Value: ${value}`)
            return 
          }
          // Not sure whether the PatientAge is a string integer or DOB
          const newMonth = String(2)
          const newDay = String(29)
          const plusOrMinusOne = Math.floor(Math.random() * 2) * 2 - 1
          const year = String( Number(value.substring(0,4)) + plusOrMinusOne )
          dataset[key] = `${year}${newMonth.padStart(2, '0')}${newDay.padStart(2, '0')}`
          
        }


    },
}

export const policyLogicFunction = (
  profile: string,
  policyLogic:Record<string, Record<keyof BaseDicomMetadata, Tag>>,
   dataset: BaseDicomMetadata): void => {
    const tagActions = policyLogic[profile]
    for (const key in tagActions) {

      const dicomKey = key as keyof BaseDicomMetadata
      const action = tagActions[dicomKey]

      // If dicomKey is in our nonEditablePolicy, continue
      if (NonEditableTags.has(dicomKey)) continue


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
