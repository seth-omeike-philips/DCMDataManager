import { BaseDicomMetadata } from "./BaseDicomMetadata";
import { TagKeyMap } from "./TagKeyMap";

export type TagFunctions = {
  [T in keyof TagKeyMap]: (
    dataset: BaseDicomMetadata,
    key: TagKeyMap[T]
  ) => void
}
