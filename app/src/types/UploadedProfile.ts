import { BaseDicomMetadata } from "./BaseDicomMetadata"

export type UploadedProfile = {
  profileName: string
  tags: Partial<Record<keyof BaseDicomMetadata, Tag>>
}