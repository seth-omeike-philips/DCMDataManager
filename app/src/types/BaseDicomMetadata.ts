export interface BaseDicomMetadata {
  AccessionNumber: string
  AcquisitionDate: string
  AcquisitionNumber: number
  AcquisitionTime: string
  AcquisitionType: string
  BitsAllocated: number
  BitsStored: number
  BodyPartExamined: string
  CTDIPhantomTypeCodeSequence: DicomCodeSequenceItem[]
  CTDIvol: number
  Columns: number
  ContentDate: string
  ContentTime: string
  ContrastBolusAgent: string
  ContrastBolusIngredientConcentration: number
  ContrastBolusRoute: string
  ContrastBolusTotalDose: number
  ContrastBolusVolume: number
  ContrastFlowDuration: number | null
  ContrastFlowRate: number | null
  ConversionType: string
  ConvolutionKernel: string
  DataCollectionDiameter: number
  DeidentificationMethod: string
  DeviceSerialNumber: string
  DistanceSourceToDetector: number
  DistanceSourceToPatient: number
  EstimatedDoseSaving: number
  Exposure: number
  ExposureModulationType: string
  ExposureTime: number
  FilterType: string
  FluoroscopyFlag: string
  FrameOfReferenceUID: string
  GantryDetectorTilt: number
  HighBit: number
  ImageComments: string
  ImageOrientationPatient: number[]
  ImagePositionPatient: number[]
  ImageType:number[]
  InstanceNumber: number
  InstitutionalDepartmentName: string
  IrradiationEventUID: string
  KVP: number
  LossyImageCompression: string
  Manufacturer: string
  ManufacturerModelName: string
  Modality: string
  PatientID: string
  PatientName: DicomPatientName[]
  PatientPosition: string
  PatientSex: string // "M" | "F" 
  PhotometricInterpretation: string
  PixelData: unknown[]
  PixelRepresentation: number
  PixelSpacing:number[]
  PositionReferenceIndicator: string
  ProtocolName: string
  ReconstructionDiameter: number
  ReferencedPerformedProcedureStepSequence: DicomReferencedPerformedProcedureStepSequence[]
  RequestAttributesSequence: unknown[]
  RequestingPhysician: unknown[]
  RescaleIntercept: number
  RescaleSlope: number
  RescaleType: string
  RevolutionTime: number
  Rows: number
  SOPClassUID: string
  SOPInstanceUID: string
  SamplesPerPixel: number
  ScanOptions: string
  SeriesDate: string
  SeriesDescription: string
  SeriesInstanceUID: string
  SeriesNumber: number
  SeriesTime: string
  SingleCollimationWidth: number
  SliceThickness: number
  SoftwareVersions: string
  SpacingBetweenSlices: number
  SpecificCharacterSet: string
  SpiralPitchFactor: number
  StationName: string
  StudyDate: string
  StudyDescription: string
  StudyID: string
  StudyInstanceUID: string
  StudyTime: string
  TableFeedPerRotation: number
  TableSpeed: number
  TotalCollimationWidth: number
  WindowCenter: number[]
  WindowWidth: number[]
  XFocusCenter: number
  XRayTubeCurrent: number
  YFocusCenter: number
  _vrMap: Record<string, string> // PixelData

FilterMaterial: string
ImageLaterality: string
InstanceCreationDate: string
InstanceCreationTime: string
InstitutionAddress: string
InstitutionName: string
NameOfPhysiciansReadingStudy: DicomPatientName[]
OperatorsName: string
OtherPatientIDs:string
PatientAge: string
PatientBirthDate: string
PatientComments: string
PatientSize: number
PatientWeight: number
PerformedProcedureStepDescription: string
PerformedProcedureStepID: string
PerformedProcedureStepStartDate: string
PerformedProcedureStepStartTime: string
PerformingPhysicianName: DicomPatientName[]
ProcedureCodeSequence: unknown[]
ReconstructionTargetCenterPatient: number[]
ReferencedImageSequence: DicomReferencedPerformedProcedureStepSequence[]
ReferencedStudySequence: unknown[]
ReferringPhysicianName: unknown[]
RequestingService: string
RotationDirection: string
SliceLocation: number
SpatialResolution: number
TableHeight: number
TablePosition: number
}

export interface DicomCodeSequenceItem {
  CodeValue: string
  CodingSchemeDesignator: string
  CodingSchemeVersion?: string
  CodeMeaning: string
  _vrMap?: Record<string, unknown> // dcmjs internal
}

export interface DicomReferencedPerformedProcedureStepSequence {
  ReferencedSOPClassUID: string
  ReferencedSOPInstanceUID: string
  _vrMap?: Record<string, unknown> // dcmjs internal
}

export interface DicomPatientName {
  Alphabetic: string

}

export interface RequestAttribute {
  	ReasonForTheRequestedProcedure: string
		RequestedProcedureDescription: string
		RequestedProcedureID: string
		ScheduledProcedureStepDescription: string
		ScheduledProcedureStepID: string
		ScheduledProtocolCodeSequence: DicomCodeSequenceItem[]
    _vrMap: Record<string, unknown>
}