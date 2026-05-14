// setValueAtPath.test.ts

import { describe, it, expect } from "vitest";
import { setValueAtPath,keywordToTagCode } from "../../electron/helperMethods/helperMethods";
import * as dcmjs from "dcmjs";
import fs from "fs";

const filePath = "C:\\Users\\320308966\\Documents\\I10";
const nodeBuffer = await fs.promises.readFile(filePath);

const arrayBuffer = nodeBuffer.buffer.slice(
  nodeBuffer.byteOffset,
  nodeBuffer.byteOffset + nodeBuffer.byteLength
)

const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer, {
  ignoreErrors: true,
});
// NOTE: The test cases below assume that the DICOM file at the specified path contains the relevant tags and structure. 
// Adjust the test cases as needed based on the actual content of your DICOM file.
// If, for example, PatientName is not present or blank, the first test case will fail. 
// You may want to add a setup step to ensure the DICOM data has the expected structure before running the tests.
describe("setValueAtPath", () => {

  it("sets a root level primitive value", () => {

    const dicomCopy = dcmjs.data.DicomMessage.readFile(dicomData.write())
    setValueAtPath(dicomCopy,["PatientName"],"PN", "Jane Doe");
    expect(dicomCopy.dict[keywordToTagCode("PatientName")].Value[0]).toBe("Jane Doe");
  });

  it("sets a new value in an array", () => {

    const newValue = "PRIMARY_MODIFIED"
    const dicomCopy = dcmjs.data.DicomMessage.readFile(dicomData.write())
    setValueAtPath(dicomCopy,["ImageType",1],"CS", newValue);
    console.log(dicomCopy.dict[keywordToTagCode("ImageType")])
    expect(dicomCopy.dict[keywordToTagCode("ImageType")].Value[1]).toBe(newValue);
  });

  it("sets a nested sequence value", () => {

    const dicomCopy = dcmjs.data.DicomMessage.readFile(dicomData.write())
    setValueAtPath(dicomCopy,["RequestAttributesSequence",0,  "RequestedProcedureID"],"LO","NEW_VALUE");
    expect(dicomCopy.dict[keywordToTagCode("RequestAttributesSequence")].Value[0][keywordToTagCode("RequestedProcedureID")].Value[0]).toBe("NEW_VALUE");
  });

  it("creates a missing primitive field", () => {

    const dicomCopy = dcmjs.data.DicomMessage.readFile(dicomData.write())

    setValueAtPath(dicomCopy,["PatientID"], "LO", "12345");
    console.log(dicomCopy.dict[keywordToTagCode("PatientID")])
    // We use contains instead of toEqual due to us not changing the raw value "_rawValue": ["CCC266260 ",]
    expect(dicomCopy.dict[keywordToTagCode("PatientID")]).toEqual({vr: "LO", Value: ["12345"],"_rawValue": ["CCC266260 "]});

  });

  it("creates nested sequence structures if missing", () => {

    const dicomCopy = dcmjs.data.DicomMessage.readFile(dicomData.write())
    setValueAtPath(dicomCopy, [ "RequestAttributesSequence", 0,"ScheduledProcedureStepID"],"LO","STEP_001");
    expect(dicomCopy.dict[keywordToTagCode("RequestAttributesSequence")].Value[0][keywordToTagCode("ScheduledProcedureStepID")].Value[0]).toBe("STEP_001");
  });

});

