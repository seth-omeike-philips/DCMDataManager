import { BaseDicomMetadata } from "./BaseDicomMetadata"

export type TagKeyMap = {
  REMOVE: keyof BaseDicomMetadata
  REPLACE_WITH_UNDEFINED: keyof BaseDicomMetadata
  HASH: StringKeys<BaseDicomMetadata>
  GENERATE_UID: StringKeys<BaseDicomMetadata>
  MAP: keyof BaseDicomMetadata/* CustomMappedKeys */
  KEEP: keyof BaseDicomMetadata
}