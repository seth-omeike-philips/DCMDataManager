import React, { useState } from "react"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"
import { policyLogicFunction } from "@/policy/PolicyLogic"
import { basePolicyLogic } from "@/policy/BasePolicyLogic"
import { ProcessingState } from "./ProcessingState"
interface Props {
  dataSet: Record<string, BaseDicomMetadata>
  onClose: () => void
}

const defaultPolicy: Record<Profile, Record<keyof BaseDicomMetadata, Tag>> = basePolicyLogic

const EditTagsModal: React.FC<Props> = ({ dataSet, onClose }) => {
  const [profile, setProfile] = useState<Profile>("ANONYMIZE")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  
  const [policyLogic, setPolicyLogic] = useState(defaultPolicy)

  const handleTagChange = (
    key: keyof BaseDicomMetadata,
    value: Tag
  ) => {
    setPolicyLogic(prev => ({
      ...prev,
      [profile]: {
        ...prev[profile],
        [key]: value
      }
    }))
  }

    const handleSubmit = async () => {
        try {
            setStatus("loading")

            const entries = Object.values(dataSet)

            for (const item of entries) {
                await policyLogicFunction(profile, policyLogic, item)
            }

            setStatus("success")

            setTimeout(() => {
                onClose()
                setStatus("idle")
            }, 1500)

        } catch {
            setStatus("error")
            setTimeout(() => {
                onClose()
                setStatus("idle")
            }, 3000)
        }
        
    }

  return (
    <>
        {status !== "idle" ? (
        <ProcessingState
            status={status}
            loadingText="Applying policy..."
            successText="Policy applied. Ready to export."
            errorText="Processing failed."
        />
        ) : (
        
        <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-slate-900"
        onClick={onClose}
        >
        <div
            className="bg-white w-[700px] max-h-[80vh] rounded-2xl shadow-xl p-6 overflow-y-auto relative"
            onClick={e => e.stopPropagation()}
        >
            {/* Close button */}
            <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
            ✕
            </button>

            <h2 className="text-xl font-semibold mb-4">
            Edit Tag Policy
            </h2>

            {/* Profile Selector */}
            <div className="mb-6 flex flex-row items-center justify-between">
                <div className="flex">
                    <label className="mr-2 font-medium">
                        Profile:
                    </label>
                    <select
                        value={profile}
                        onChange={e =>
                        setProfile(e.target.value as Profile)
                        }
                        className="border rounded px-2 py-1"
                    >
                        <option value="ANONYMIZE">
                        ANONYMIZE
                        </option>
                        <option value="DEIDENTIFY">
                        DEIDENTIFY
                        </option>
                    </select>
                </div>

                {/* Submit */}
                <div className="mt-6 flex justify-end">
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Apply Policy
                    </button>
                </div>
            </div>

            {/* Tag List */}
            <div className="space-y-3">
            {Object.keys(
                dataSet[Object.keys(dataSet)[0]]
            )
            .sort((a, b) => {
            const isTag = (k: string) => /^[0-9A-Fa-f]{8}$/.test(k)

            const aIsTag = isTag(a)
            const bIsTag = isTag(b)

            // Alphabetical keys first
            if (!aIsTag && bIsTag) return -1
            if (aIsTag && !bIsTag) return 1

            // If both same type, sort normally
            return a.localeCompare(b)
        })
            .map(key => {
                const typedKey = key as keyof BaseDicomMetadata

                return (
                <div
                    key={key}
                    className="flex justify-between items-center"
                >
                    <span className="text-sm font-medium">
                    {key}
                    </span>

                    <select value={policyLogic[profile][typedKey] ?? "COULD_NOT_FIND_TAG"}
                        onChange={e => handleTagChange( typedKey,e.target.value as Tag)}
                        className="border rounded px-2 py-1"
                    >
                        <option value="KEEP">
                            KEEP
                        </option>
                        <option value="REMOVE">
                            REMOVE
                        </option>
                        <option value="REPLACE_WITH_UNDEFINED">
                            REPLACE_WITH_UNDEFINED
                        </option>
                        <option value="HASH">
                            HASH
                        </option>
                        <option value="GENERATE_UID">
                            GENERATE_UID
                        </option>
                        <option value="MAP">
                            MAP
                        </option>
                    </select>
                </div>
                )
            })}
            </div>


        </div>
        </div>
    )}
    </>
  )
}

export default EditTagsModal