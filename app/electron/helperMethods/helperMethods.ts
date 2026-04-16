import { TagAction } from "@/policy/PolicyLogic";
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata";
import crypto from "crypto";
import dcmjs from "dcmjs";

/**
 * Maps DICOM metadata values based on their keys
 * @param data The DICOM metadata object
 * @param path The path to the value to map
 * @returns The mapped value
 * Currently supports mapping for:
- PatientName: Hashes the Alphabetic component of the PatientName using SHA-256 and truncates to 64 characters. If PatientName is not in expected format, it logs a warning and returns the original value.
- PatientID and OtherPatientIDs: Prefixes the original value with "Mapped_". If the value is not a string, it logs a warning and returns an empty string.
- StudyDate: Shifts the date by a random number of years (between 1990 and 2020) and random month/day. If the original date is not a string, it logs a warning and returns an empty string
- PatientSex: If value is "M", it generates a random even number between 0 and 100. If value is "F", it generates a random odd number between 1 and 99. If the value is not "M" or "F", it logs a warning and returns the original value.
- PatientBirthDate: Shifts the year by plus or minus 1, and sets month to 02 and day to 29. If the original value is not a string, it logs a warning and returns an empty string.

 */
export const mapper = (data:BaseDicomMetadata, path:(string|number)[]) => {
  const key = path[0] as keyof BaseDicomMetadata;
  if (key === "PatientName") {
    const value = data[key]
    if (!value) {
      console.warn(`Expected a value for mapping PatientName, but go. Skipping mapping.`)
      return ""
    }

    
    // PatientName
    if (Array.isArray(value) && value.every(v => typeof v === "object" && "Alphabetic" in v)) {
      const mappedValue = value.map(v => {
          if (typeof v.Alphabetic !== "string") {
            return v // or return a safe fallback
          }

          return crypto.createHash("sha256").update(String(v.Alphabetic ?? "")).digest("hex").slice(0, 64)
        })
      return mappedValue

    } else {
      console.warn(`Expected an array of objects with an Alphabetic property for mapping PatientName, but got ${JSON.stringify(value)}. Skipping mapping.`)
      return value; 
    }
  }

  // PatientID or OtherPatientIDs
  else if (key === "PatientID" || key === "OtherPatientIDs") {
    const value = data[key]
    if (typeof value !== "string") {
      console.warn(`Expected a string value for mapping PatientID, but got ${typeof value} for key ${key}, value: ${value}. Skipping mapping.`)
      return "";
    }
    return "Mapped_" + value;

  }

  // Study Date
  else if (key === "StudyDate") {
    const rawDate = data[key]
    if (typeof rawDate !== "string") {
      console.warn(`Expected a string rawDate for mapping StudyDate, but got ${typeof rawDate} for key ${key}, rawDate: ${rawDate}. Skipping mapping.`)
      return "";
    }
    // Example: Shift the date by a fixed number of days (e.g., 30 days)
    // Note that rawDate is expected to be in the format "YYYY-MM-DD", so we need to parse it accordingly
    const newMonth = Math.floor(Math.random() * 12) + 1;
    const newDay = Math.floor(Math.random() * 28) + 1;
    const newYear = Math.floor(Math.random()*30) + 1990
    return `${String(newYear)}${String(newMonth).padStart(2, '0')}${String(newDay).padStart(2, '0')}`
  }
  // PatientSex
  else if (key === "PatientSex") {
    // Even Represents Male, Odd represents Female
    const value = data[key]
    if (value === undefined) {
      console.log(`No value to edit: Value: ${value}`)
      return "";
    }
    if ((value !== "M") && (value !== "F")) {
      console.warn(`Expected sex to either be M or F but got ${value}`)
      return value;
    }
    
    if (value == "M") {
      // Generate Even number in range [0,100]
      const randomNumber = Math.floor(Math.random()*51)*2
      return String(randomNumber)
    }
    else if (value == "F") {
      // Generate Odd number in range [0,100]
      const randomNumber = Math.floor(Math.random()*50)*2 + 1
      return String(randomNumber)
    }
    
    
  }
  // PatientBirthDate
  else if (key === "PatientBirthDate") {
    const value = data[key]
    if (value === undefined || value === "") {
      console.log(`No value to edit: Value: ${value}`)
      return "";
    }
    // Not sure whether the PatientAge is a string integer or DOB
    const newMonth = String(2)
    const newDay = String(29)
    const plusOrMinusOne = Math.floor(Math.random() * 2) * 2 - 1
    const year = String( Number(value.substring(0,4)) + plusOrMinusOne )
    return `${year}${newMonth.padStart(2, '0')}${newDay.padStart(2, '0')}`
    
  }

  return "";
}


/**
 * Resolves the new value for a given path based on its transformation rules
 * @param data the DICOM dataset containing the original metadata values, used for MAP transformations that require access to the dataset to compute the new value. It is the caller's responsibility to ensure this dataset is correctly retrieved and compliant with the expected structure for the mapping functions.
 * @param originalValue the original value of the tag before transformation, used for MAP and HASH transformations. It is the caller's responsibility to ensure this value is correctly retrieved from the DICOM dataset based on the path, and is compliant with the expected type for the transformations (e.g. string for HASH).
 * @param modifiedDataset the modified dataset containing the transformation rules for each path
 * @param path `string | number`[] path to the value being transformed, used for logging and to determine which mapping rules to apply in case of "MAP" transformation type
 * @param vr the VR of the DICOM tag being transformed, used to enforce VR compliance on the new value before returning
 * @returns the vr compliant new value after applying the transformation specified in modifiedDataset for the given path. If no transformation is specified, returns the originalValue.
 * Transformation rules:
 * - REMOVE: returns null, which signals the caller to remove this tag
 * - KEEP: returns the originalValue without any changes
 * - MAP: applies the mapping function defined in helperMethods.ts based on the tag (e.g. PatientName, StudyDate, etc.). If the mapping function returns a string, it enforces VR compliance on that string before returning. If the mapping function returns a non-string (e.g. an array for PatientName), it returns the mapped value as is and relies on the caller to enforce VR if needed.
 * - HASH: applies a deterministic hash to the originalValue. Only supports string values, and will throw an error if originalValue is not a string. After hashing, it enforces VR compliance on the hashed value before returning.
 * - GENERATE_UID: generates a new UID value. The generated UID is compliant with DICOM VR requirements. It is created by generating a random UUID, converting it to a big integer, and prefixing it with "2.25." to ensure it starts with a valid root for UIDs.
 * - CUSTOM: uses the custom value specified in the transformation. It enforces VR compliance on the custom value before returning.
 * 
 */
export function resolveNewValue(data: BaseDicomMetadata,originalValue: any,modifiedDataset: Record<string, TagAction>,path:(string | number)[],vr: string): any {

  const pathKey = path.join(".");
  const transformation = modifiedDataset[pathKey];
  console.log(`Applying transformation for path: ${pathKey} with originalValue: ${originalValue} and VR: ${vr}. Transformation: ${JSON.stringify(transformation)}`)
  if (!transformation) {
    console.warn(`No transformation found for path: ${pathKey}. Returning original value.`)
    return originalValue;
  };


  switch (transformation.type) {
    case "REMOVE":
      return null;

    case "KEEP":
      return originalValue;

    case "MAP":
      const mappedValue= mapper(data,path);
      if (typeof mappedValue === "string") {
        return enforceVR(path,mappedValue, vr);
      }
      return mappedValue;
    


    case "HASH": {
      if (typeof originalValue !== "string") {
        // Cannot hash
        throw new Error(`Cannot hash key: ${pathKey}. Can only hash strings`);
      }
      const hashed = crypto.createHash("sha256").update(originalValue).digest("hex");
      return enforceVR(path,cleanHash(hashed, vr),vr);
    }

    case "GENERATE_UID":
      return enforceVR(path,generateUID(), vr);
    case "CUSTOM":
      console.log(`Applying custom transformation for key: ${pathKey} with original value: ${originalValue} and VR: ${vr}. NewValue: ${transformation}`)
      return enforceVR(path,transformation.value, vr);
    default:
      // Nothing to do. Perhaps throw an error as we don't expect this case to be reached?
      return originalValue
      ;
  }
}

/**
 * Cleans a hashed value according to the specified VR. This is used to ensure that hashed values comply with VR requirements, such as length limits and character restrictions. For example, for a CS VR, it converts the value to uppercase and truncates it to 16 characters. For a UI VR, it sanitizes the value to contain only numbers and dots, and truncates to 64 characters if necessary. If the value is null or undefined, it returns it as is without modification.
 * @param value the hashed value to be cleaned according to VR requirements
 * @param vr the Value Representation (VR) to which the value should be formatted
 * @returns the cleaned value according to the specified VR
 * VR-specific cleaning rules:
 * - CS: Converts to uppercase and truncates to 16 characters
 * - SH: Truncates to 16 characters
 * - LO: Truncates to 64 characters
 * - UI: Sanitizes to contain only numbers and dots, and truncates to 64 characters if necessary
 * - For other VRs, returns the value as is without modification
 * If the input value is null or undefined, it returns it as is without modification.
 */
function cleanHash(value: string, vr: string): string {
  if (value == null) return value;
  switch (vr) {
      case "CS":
        return value.toUpperCase().slice(0, 16);
        case "SH":
          return value.slice(0, 16);
        case "LO":
          return value.slice(0, 64);
        case "UI":
          return sanitizeUID(value); 
        default: return value;
      }
}

/**
 * Enforces the specified Value Representation (VR) on a given value.
 * @param key the path to the DICOM element
 * @param value the value to be enforced
 * @param vr the Value Representation (VR) to which the value should be formatted
 * @returns the value formatted according to the specified VR
 * VR-specific enforcement rules:
 * - CS: Trims whitespace, converts to uppercase, and checks max length of 16 characters
 * - SH: Trims whitespace and checks max length of 16 characters
 * - LO: Trims whitespace and checks max length of 64 characters
 * - UI: Trims whitespace, checks that it contains only numbers and dots, and sanitizes to ensure it is a valid UID
 * - DA: Checks that it is in the format YYYYMMDD
 * - TM: Checks that it is in the format HHMMSS or HHMMSS.frac
 * - PN: Trims whitespace and checks max length of 64 characters
 * - IS: Checks that it is a valid integer string
 * - DS: Checks that it is a valid decimal string
 * For other VRs, it returns the trimmed value without additional checks.
 * If the input value is null or undefined, it returns it as is without modification.
 */
function enforceVR(key:(string | number)[], value: string, vr: string): string|string[] {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(v => enforceVR(key,v, vr)) as string[];
  }

  const trimmed = value.trim();

  switch (vr) {
    case "CS": { // Code String (max 16, uppercase, no leading/trailing spaces)
      const formatted = trimmed.toUpperCase();
      if (formatted.length > 16) {
        throw new Error(`Error on tag: ${key}\nCS exceeds max length of 16. Value Received: ${formatted} has length: ${trimmed.length}`);
      }
      return formatted;
    }

    case "SH": { // Short String (max 16)
      if (trimmed.length > 16) {
        throw new Error(`Error on tag: ${key}\nSH exceeds max length of 16. Value Received: ${trimmed} has length: ${trimmed.length}`);
      }
      return trimmed;
    }

    case "LO": { // Long String (max 64)
      if (trimmed.length > 64) {
        throw new Error(`Error on tag: ${key}\nLO exceeds max length of 64. Value Received: ${trimmed} has length: ${trimmed.length} `);
      }
      return trimmed;
    }

    case "UI": { // UID (numbers and dots only)
      if (!/^[0-9.]+$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nUI must contain only numbers and dots. Value Received: ${trimmed}`);
      }
      return sanitizeUID(trimmed);
    }

    case "DA": { // Date YYYYMMDD
      if (!/^\d{8}$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nDA must be in format YYYYMMDD. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "TM": { // Time HHMMSS.frac (DICOM allows partials)
      if (!/^\d{2,6}(\.\d+)?$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nTM must be in format HHMMSS or HHMMSS.frac. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "PN": { // Person Name (simplified)
      if (trimmed.length > 64) {
        throw new Error(`Error on tag: ${key}\nPN exceeds max length of 64. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "IS": { // Integer String
      if (!/^-?\d+$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nIS must be a valid integer. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    case "DS": { // Decimal String
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        throw new Error(`Error on tag: ${key}\nDS must be a valid decimal number. Value Received: ${trimmed}`);
      }
      return trimmed;
    }

    default:
      // fallback: don’t block unknown VRs, just return trimmed
      return trimmed;
  }
}

/**
 * Sanitizes a UID by removing invalid characters and ensuring it meets the required format.
 * @param value the UID value to be sanitized
 * @returns  the sanitized UID value
 * The function performs the following sanitization steps:
 * 1. Removes any characters that are not digits or dots.
 * 2. Enforces a maximum length of 64 characters, truncating if necessary.
 * If the resulting cleaned value is empty after removing invalid characters, it generates a new UID using the generateUID function to ensure a valid UID is returned. This is important because UIDs cannot be empty and must follow specific formatting rules in DICOM.
 */
function sanitizeUID(value: string): string {
  // remove invalid chars
  let cleaned = value.replace(/[^0-9.]/g, "");

  // enforce max length
  if (cleaned.length > 64) {
    cleaned = cleaned.slice(0, 64);
  }

  return cleaned || generateUID();
}

/**
 * Generates a new UID.
 * @returns  the generated UID value
 */
function generateUID(): string {
  return "2.25." + BigInt("0x" + crypto.randomUUID().replace(/-/g, "")).toString();
}


/**
 * Converts a DICOM keyword to its corresponding tag code.
 * @param keyword The DICOM keyword to convert
 * @returns The corresponding tag code or null if not found
 * This function looks up the provided DICOM keyword in the dcmjs DicomMetaDictionary to find the associated tag information. If the keyword is found, it extracts the tag code, which is typically in the format "(gggg,eeee)". The function then removes any parentheses and commas from the tag code to return a clean string representation of the tag code (e.g., "ggggeeee"). If the keyword is not found in the dictionary, it returns null. This utility is essential for mapping human-readable DICOM keywords to their corresponding tag codes used in DICOM datasets.
 * 
 */
export const keywordToTagCode = (keyword: string) => {
  const tagInfo = dcmjs.data.DicomMetaDictionary.nameMap[keyword];
  if (!tagInfo) return null;
  return tagInfo.tag.replace(/[(),]/g, "");
};

/**
 * Retrieves an element from a DICOM dataset at the specified path.
 * @param dicom The DICOM dataset
 * @param path The path to the element
 * @returns The element at the specified path or null if not found
 * The function traverses the DICOM dataset based on the provided path, which can include both tag keywords and array indices. It handles different cases such as root tags, DICOM elements with "Value", sequence items, and PN (Person Name) objects. The function includes detailed logging to help trace the traversal process and identify any issues with finding the specified element.
 */
export const getElementAtPath = (dicom: any, path: (string | number)[]) => {    
  let current = dicom.dict;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];

    if (i !== 0) {
      console.log(`Traversing to key: ${key} at path: ${path.slice(0, i + 1).join(".")}. Current element:`, current);
    }
    // 🔹 ROOT
    if (i === 0) {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode) {
        console.error(`❌ Unknown DICOM keyword: ${key}`);
        return null;
      }

      if (!current[tagCode]) {
        console.warn(`TagCode ${tagCode}, path ${path.join(".")} not found in DICOM`);
        return;
      }

      current = current[tagCode];
    }
    
    // 🔹 DICOM element
    else if (current && typeof current === "object" && "Value" in current) {
      const value = current.Value;

      if (!Array.isArray(value)) return null;

      const intKey = parseInt(String(key), 10);
      if (isNaN(intKey) || intKey < 0 || intKey >= value.length) {
        console.warn(`Invalid array index: ${key} at path: ${path.join(".")}`);
        return null;
      }

      current = value[intKey]; // ✅ CONTINUE traversal instead of returning
    }

    // 🔹 Sequence item (object with tagCodes)
    else if (current && typeof current === "object") {

      // PN case: Alphabetic, etc.
      if (key in current) {
        current = current[key];
        continue;
      }
      const tagCode = keywordToTagCode(String(key));

      if (!tagCode || !current[tagCode]) {
        console.warn(`TagCode ${tagCode}, path ${path.join(".")} not found in current sequence item. current: `, current);
        return null;
      }
      current = current[tagCode];
    }

    else {
      return null;
    }

    if (current === undefined) return null;
  }

  return current;
};


/**
 * Sets the value of an element in a DICOM dataset at the specified path.
 * @param dicom The DICOM dataset
 * @param path The path to the element
 * @param vr The Value Representation of the element
 * @param newValue The new value to set
 * @returns null
 * The function traverses the DICOM dataset to locate the target element based on the provided path. It handles different cases such as root tags, DICOM elements with "Value", sequence items, and PN (Person Name) objects. Depending on the VR (Value Representation) and the structure of the target element, it updates the value accordingly. The function includes checks to prevent invalid operations, such as directly setting a sequence (SQ) or modifying unsupported VRs. Detailed logging is included to trace the process and identify any issues during traversal or value setting.
 */
export const setValueAtPath = (dicom: any,  path: (string | number)[],  vr: string, newValue: any) => {
  let current = dicom.dict;

  // 🔹 Traverse to parent of target
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    // ROOT
    if (i === 0) {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode || !current[tagCode]) {
        console.warn(`Invalid root tag: ${key}`);
        return;
      }
      current = current[tagCode];
      continue;
    }

    // DICOM element → go into Value
    if (current && typeof current === "object" && "Value" in current) {
      const value = current.Value;

      if (!Array.isArray(value)) {
        console.warn(`Invalid Value at ${path.join(".")}`);
        return;
      }

      const index = parseInt(String(key), 10);
      if (isNaN(index) || index < 0 || index >= value.length) {
        console.warn(`Invalid index ${key} at ${path.join(".")}`);
        return;
      }

      current = value[index];
      continue;
    }

    // Sequence item → lookup tag
    else if (current && typeof current === "object") {

      // PN object case → STOP traversal here if next is final
      if (key in current && !("Value" in current)) {
        if (i === path.length - 1) {
          // let FINAL STEP handle it
          break;
        }

        current = current[key];
        continue;
      }

      // ✅ Sequence item case (real DICOM tags)
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode || !current[tagCode]) {
        console.warn(`Missing tag ${key} at ${path.join(".")}`);
        return null;
      }

      current = current[tagCode];
      continue;
    }

    console.warn(`Traversal failed at ${path.join(".")}`);
    return;
  }

  // 🔹 FINAL STEP
  const lastKey = path[path.length - 1];

  

  // CASE 1: current is a DICOM element
  if (current && typeof current === "object" && "Value" in current) {
    const element = current;

    // ❌ Do not directly set SQ
    if (vr === "SQ") {
      console.warn(`Cannot directly set SQ at ${path.join(".")}`);
      return;
    }

    // ✅ PN (Person Name)
    if (vr === "PN") {
      if (!Array.isArray(element.Value) || !element.Value[0]) {
        console.warn(`Invalid PN structure at ${path.join(".")}`);
        return;
      }

      const pnObject = element.Value[0];

      if (typeof lastKey !== "string" || !(lastKey in pnObject)) {
        console.warn(`Invalid PN field: ${lastKey}`);
        return;
      }

      pnObject[lastKey] = String(newValue);
      return;
    }

    // ✅ Primitive VRs (LO, SH, CS, FD, etc.)
    if (Array.isArray(element.Value)) {
      const index = parseInt(String(lastKey), 10);

      // Indexed update (e.g., ImageType[1])
      if (!isNaN(index)) {
        if (index < 0 || index >= element.Value.length) {
          console.warn(`Invalid index at ${path.join(".")}`);
          return;
        }

        element.Value[index] = newValue;
        return;
      }
    }

    // Direct overwrite
    element.Value = Array.isArray(newValue)
      ? newValue
      : [newValue];

    return;
  }

  // CASE 2: current is a sequence item → set tag inside it
  if (current && typeof current === "object") {
    const tagCode = keywordToTagCode(String(lastKey));

    if (tagCode && current[tagCode]) {
      const targetElement = current[tagCode];

      if (!targetElement || !("Value" in targetElement)) {
        console.warn(`Invalid target element at ${path.join(".")}`);
        return;
      }

      targetElement.Value = Array.isArray(newValue)
        ? newValue
        : [String(newValue)];

      return;
    }
  }

  const isPNObject =  current &&  typeof current === "object" &&  !("vr" in current) &&  !("Value" in current);

  if (isPNObject) {
    if (!(lastKey in current)) {
      console.warn(`Invalid PN field: ${lastKey}`);
      return;
    }

    current[lastKey] = String(newValue);
    return;
  }

  console.warn(`Invalid final target at ${path.join(".")}`);
};

/**
 * Removes a value from a DICOM dataset at the specified path.
 * @param dicom The DICOM dataset
 * @param path The path to the element
 * @param vr The Value Representation of the element
 * @returns null
 * The function traverses the DICOM dataset to locate the target element based on the provided path. It handles different cases such as root tags, DICOM elements with "Value", sequence items, and PN (Person Name) objects. Depending on the VR (Value Representation) and the structure of the target element, it removes the value accordingly. For DICOM elements, it can either remove a specific index from the "Value" array or clear the entire value. For sequence items, it deletes the entire tag. For PN objects, it clears the value of the specified field. The function includes checks to prevent invalid operations, such as directly removing a sequence (SQ) or modifying unsupported VRs. Detailed logging is included to trace the process and identify any issues during traversal or value removal.
 */
export const removeValueAtPath = (  dicom: any,  path: (string | number)[],  vr: string) => {
  let current = dicom.dict;

  // 🔹 Traverse to parent of target
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    // ROOT
    if (i === 0) {
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode || !current[tagCode]) {
        console.warn(`Invalid root tag: ${key}`);
        return;
      }
      current = current[tagCode];
      continue;
    }

    // DICOM element → go into Value
    if (current && typeof current === "object" && "Value" in current) {
      const value = current.Value;

      if (!Array.isArray(value)) {
        console.warn(`Invalid Value at ${path.join(".")}`);
        return;
      }

      const index = parseInt(String(key), 10);
      if (isNaN(index) || index < 0 || index >= value.length) {
        console.warn(`Invalid index ${key} at ${path.join(".")}`);
        return;
      }

      current = value[index];
      continue;
    }

    // PN object or plain object
    if (current && typeof current === "object") {
      // ✅ PN object case → STOP before final field
      if (key in current && !("Value" in current)) {
        if (i === path.length - 1) break;

        current = current[key];
        continue;
      }

      // ✅ Sequence item (tag lookup)
      const tagCode = keywordToTagCode(String(key));
      if (!tagCode || !current[tagCode]) {
        console.warn(`Missing tag ${key} at ${path.join(".")}`);
        return;
      }

      current = current[tagCode];
      continue;
    }

    console.warn(`Traversal failed at ${path.join(".")}`);
    return;
  }

  // 🔹 FINAL STEP
  const lastKey = path[path.length - 1];

  // ✅ CASE 1: DICOM element
  if (current && typeof current === "object" && "Value" in current) {
    const element = current;

    if (vr === "SQ") {
      console.warn(`Cannot directly remove SQ at ${path.join(".")}`);
      return;
    }

    if (!Array.isArray(element.Value)) {
      console.warn(`Invalid Value at ${path.join(".")}`);
      return;
    }

    const index = parseInt(String(lastKey), 10);

    // Remove specific index
    if (!isNaN(index)) {
      if (index < 0 || index >= element.Value.length) {
        console.warn(`Invalid index at ${path.join(".")}`);
        return;
      }

      element.Value.splice(index, 1);
      return;
    }

    // Remove entire value
    element.Value = [];
    return;
  }

  // ✅ CASE 2: sequence item (THIS is your failing case)
  if (current && typeof current === "object") {
    const tagCode = keywordToTagCode(String(lastKey));

    if (tagCode && current[tagCode]) {
      delete current[tagCode];
      return;
    }
  }

  // ✅ CASE 3: PN object (LAST)
  const isPNObject =
    current &&
    typeof current === "object" &&
    !("vr" in current) &&
    !("Value" in current) &&
    Object.keys(current).some(k =>
      ["Alphabetic", "Ideographic", "Phonetic"].includes(k)
    );

  if (isPNObject) {
    if (!(lastKey in current)) {
      console.warn(`Invalid PN field: ${lastKey}`);
      return;
    }

    //delete current[lastKey];
    current[lastKey].Value = [];
    return;
  }

  console.warn(`Invalid final target at ${path.join(".")}`);
};


/**
 * Extracts the value from a DICOM element.
 * @param element The DICOM element
 * @returns The extracted value or undefined if the element is invalid
 * The function checks the structure of the provided DICOM element and extracts its value accordingly. It handles different cases such as null or undefined elements, primitive values, sequence items (SQ), and regular DICOM elements with "Value". For sequence items, it returns the entire "Value" array or an empty array if "Value" is not present. For regular DICOM elements, it simplifies the value by returning a single item if the "Value" array has only one element, or the entire array if it has multiple elements. If the element does not conform to expected structures, the function returns undefined.
 */
export const getValueFromElement = (element: any) => {
  
  if (element === null || element === undefined) return undefined;
  if (typeof element !== "object") {
    return element; // already a primitive like "ORIGINAL"
  }

  if (!("Value" in element)) return undefined;

  if (element.vr === "SQ") return element.Value ?? [];

  const value = element.Value;

  if (!Array.isArray(value)) return value;

  if (value.length === 0) return [];

  if (value.length === 1) return value[0];

  return value;
};