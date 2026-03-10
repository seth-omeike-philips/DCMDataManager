import { BaseDicomMetadata } from "./BaseDicomMetadata"

export type TagKeyMap = {
  REMOVE: keyof BaseDicomMetadata
  HASH: StringKeys<BaseDicomMetadata>
  GENERATE_UID: StringKeys<BaseDicomMetadata>
  MAP: keyof BaseDicomMetadata/* CustomMappedKeys */
  KEEP: keyof BaseDicomMetadata
}