// resolveNewValue.test.ts

import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import {resolveNewValue,} from "../../electron/helperMethods/helperMethods";
import * as helperMethods from "../../electron/helperMethods/helperMethods";
import * as dcmjs from "dcmjs";
import fs from "fs";
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata";
import { TagAction } from "@/policy/PolicyLogic";

const filePath = "C:\\Users\\320308966\\Documents\\I10";
const nodeBuffer = await fs.promises.readFile(filePath);

const arrayBuffer = nodeBuffer.buffer.slice(
  nodeBuffer.byteOffset,
  nodeBuffer.byteOffset + nodeBuffer.byteLength
)

const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer,{ignoreErrors: true,});
const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict) as BaseDicomMetadata


describe("resolveNewValue", () => {

  it("returns original value if no transformation exists", () => {

    const modifiedDataset:Record<string, TagAction> = {
    };
    const value = "John Doe"
    const result = resolveNewValue(dataset,value,modifiedDataset,["PatientName"],"PN");
    expect(result).toBe(value);
    
  });

  it("returns null for REMOVE transformation", () => {

    const modifiedDataset:Record<string, TagAction> = {
      "PatientName": {
        type: "REMOVE",
      },
    };

    const result = resolveNewValue(dataset,"John Doe",modifiedDataset,["PatientName"],"PN" );
    expect(result).toBeNull();
  });

  it("returns original value for KEEP transformation", () => {

    const modifiedDataset: Record<string, TagAction> = {
      "PatientName": {
        type: "KEEP",
      },
    };

    const result = resolveNewValue(
      dataset,
      "John Doe",
      modifiedDataset,
      ["PatientName"],
      "PN"
    );

    expect(result).toBe("John Doe");
  });

  it("applies CUSTOM transformation", () => {

    const modifiedDataset: Record<string, TagAction> = {
      "PatientName": {
        type: "CUSTOM",
        value: "Jane Doe",
      },
    };

    const result = resolveNewValue(
      dataset,
      "John Doe",
      modifiedDataset,
      ["PatientName"],
      "PN"
    );

    expect(result).toBeDefined();
    expect(result).toContain("Jane Doe");
  });

  it("generates a UID for GENERATE_UID transformation", () => {

    const modifiedDataset: Record<string, TagAction> = {
      "SOPInstanceUID": {
        type: "GENERATE_UID",
      },
    };

    const result = resolveNewValue(
      dataset,
      dataset.SOPInstanceUID,
      modifiedDataset,
      ["SOPInstanceUID"],
      "UI"
    );

    expect(typeof result).toBe("string");
    expect(result.startsWith("2.25.")).toBe(true);
  });

  it("hashes a string value for HASH transformation", () => {

    const originalValue = "John Doe";

    const modifiedDataset: Record<string, TagAction> = {
      "PatientName": {
        type: "HASH",
      },
    };

    const expectedHash = crypto
      .createHash("sha256")
      .update(originalValue)
      .digest("hex");

    const result = resolveNewValue(
      dataset,
      originalValue,
      modifiedDataset,
      ["PatientName"],
      "LO"
    );

    expect(typeof result).toBe("string");
    expect(result).toContain(expectedHash.substring(0, 10));
  });

  it("throws error when HASH transformation receives non-string value", () => {

    const modifiedDataset: Record<string, TagAction> = {
      "ImageType": {
        type: "HASH",
      },
    };

    expect(() =>
      resolveNewValue(
        dataset,
        ["ORIGINAL", "PRIMARY"],
        modifiedDataset,
        ["ImageType"],
        "CS"
      )
    ).toThrow("Cannot hash key: ImageType. Can only hash strings");
  });

  it("applies MAP transformation with string return value", () => {

    const modifiedDataset: Record<string, TagAction> = {
      "PatientName": {
        type: "MAP",
      },
    };
    if (!dataset.PatientName) {
        expect(true, "Expecting patientName to exist").toEqual(false);
        return;
    };
    const name = dataset.PatientName[0].Alphabetic || "No Name"
    const mappedValue = crypto.createHash("sha256").update(name).digest("hex").slice(0, 64)
    const mapperSpy = vi
      .spyOn(helperMethods, "mapper")
      .mockReturnValue(name);

    const result = resolveNewValue(
      dataset,
      "John Doe",
      modifiedDataset,
      ["PatientName"],
      "PN"
    );

    

    expect(result[0]).toContain(mappedValue);

    mapperSpy.mockRestore();
  });

  it("returns non-string MAP values directly", () => {

    const modifiedDataset: Record<string, TagAction> = {
      "PatientName": {
        type: "MAP",
      },
    };

    if (!dataset.PatientName) {
        expect(true, "Expecting patientName to exist").toEqual(false);
        return;
    }
    const name = dataset.PatientName[0].Alphabetic || "No Name"
    
    const mappedObject = crypto.createHash("sha256").update(name).digest("hex").slice(0, 64)

    const mapperSpy = vi
      .spyOn(helperMethods, "mapper")
      .mockReturnValue(mappedObject);

    const result = resolveNewValue(
      dataset,
      "John Doe",
      modifiedDataset,
      ["PatientName"],
      "PN"
    );

    expect(result[0]).toEqual(mappedObject);

    mapperSpy.mockRestore();
  });

  it("supports nested sequence paths", () => {

    const modifiedDataset: Record<string, TagAction> = {
      "RequestAttributesSequence.0.RequestedProcedureID": {
        type: "CUSTOM",
        value: "PROC_001",
      },
    };

    const result = resolveNewValue(
      dataset,
      "OLD_PROC",
      modifiedDataset,
      ["RequestAttributesSequence", 0, "RequestedProcedureID"],
      "LO"
    );

    expect(result).toBe("PROC_001");
  });

});