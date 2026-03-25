import React, { useState,useRef } from "react"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"
import { policyLogicFunction, Transformation } from "@/policy/PolicyLogic"
import { basePolicyLogic } from "@/policy/BasePolicyLogic"
import { NonEditableTags } from "@/policy/NonEditableTags"
import Draggable from "react-draggable"
import { useModal } from "@/context/ModalContext"
import UploadProfileHelp from "./UploadProfileHelp"
import { Loader2 } from "lucide-react"

interface Props {
  dataSet: Record<string, BaseDicomMetadata>
  onClose: () => void
  isAllFilesAvailable: boolean
  setModifiedDataSet: React.Dispatch<React.SetStateAction<Record<string, Record<keyof BaseDicomMetadata, Transformation>>>>
}

type Status = "idle"| "success" | "error"

const EditTagsModal: React.FC<Props> = ({ dataSet, onClose,isAllFilesAvailable,setModifiedDataSet }) => {

    const [profile, setProfile] = useState<string>("ANONYMIZE")
    const [status, setStatus] = useState<Status>("idle")
    
    const [policyLogic, setPolicyLogic] = useState(basePolicyLogic)
    const {openModal} = useModal();

    const nodeRef = useRef<HTMLDivElement>(null)
    const handleTagChange = (key: keyof BaseDicomMetadata,value: Tag) => {
        setPolicyLogic(prev => ({
        ...prev,
        [profile]: {
            ...prev[profile],
            [key]: value
        }
        }))
        // For persistance
        basePolicyLogic[profile][key] = value;
    }

    const handleExportProfile = () => {
        try {
            const currentProfile = policyLogic[profile];

            if (!currentProfile) throw new Error(`Profile "${profile}" not found`);

            const json = JSON.stringify(currentProfile, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `${profile}.json`;
            a.click();

            URL.revokeObjectURL(url);
            openModal({
                type: "success",
                title: "Profile Compiled Successfully",
                message: `Your profile has been compiled and can be exported.`
            })
        } catch (err) {
            openModal({
                type: "error",
                title: "Profile Export Failed",
                message: `${err}`
            })
            console.error("Export failed:", err);
        }
    };

    const handleSubmit = async () => {
        try {
            const tagActions = policyLogic[profile];
            const modifiedDataSet = policyLogicFunction(tagActions,dataSet);
            setModifiedDataSet(modifiedDataSet);

            setStatus("success")
            openModal({
                type: "success",
                title: "Policy Successfully Staged",
                message:"Your policy has been successfully staged for exportation."
              })

            setTimeout(() => {
                onClose()
                setStatus("idle")
            }, 1500)

        } catch (err) {
            setStatus("error")
            openModal({
                type: "error",
                title: "Policy Application Failed",
                message:`Error: ${err}`
              })
            setTimeout(() => {
                onClose()
                setStatus("idle")
            }, 3000)
        }
        
    }

    const handleUploadProfile = async (file: File) => {
        try {

            const text = await file.text()
            const profileName = file.name.replace(/\.[^/.]+$/, "");
            console.log(text)
            const tags: Partial<Record<keyof BaseDicomMetadata, Tag>> = JSON.parse(text)


            if (!profileName || !tags) {
                throw new Error("JSON file is missing profileName or tags.")
            }
            setPolicyLogic(prev => ({
                ...prev,
                [profileName]: {
                    ...prev[profileName],
                    ...tags
                }
            }))
            
            setProfile(profileName)

            // Enable Persistence
            basePolicyLogic[profileName] = {} as Partial<Record<keyof BaseDicomMetadata, Tag>>;

            for (const [key ,val] of Object.entries(tags) as [keyof BaseDicomMetadata,Tag][]) {
                if (!val) continue
                basePolicyLogic[profileName][key] = val
            }
            

            
        } catch (err) {
            console.log(err)
            openModal({
                type: "error",
                title: "Error Reading Profile",
                message: `Profile is in the wrong format.\n${err}`
            })
            return;
        }
    }

  return (
    <>
        {status !== "idle" ? (""): 
        (
            <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-slate-900"
            onClick={onClose}
            >
            <Draggable nodeRef={nodeRef} cancel="select, option, input, textarea, button" bounds="parent">

                <div
                    ref={nodeRef}
                    className="cursor-move bg-white w-[700px] max-h-[80vh] rounded-2xl shadow-xl p-6 overflow-y-auto relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                    onClick={onClose}
                    className="absolute bg-slate-100 top-4 right-4 text-gray-500 hover:text-black"
                    >
                    ✕
                    </button>

                    <h2 className="text-xl font-semibold mb-4 modal-drag-handle">
                    Edit Tag Policy
                    </h2>

                    <div className="flex flex-col mb-5">
                    
                        {/* Profile Selector */}
                        <div className="mb-2 flex items-center justify-between">
        
                            {/* Profile Select */}
                            <div className="flex  items-center gap-2 ">
                                <label className="font-medium ">Profile:</label>
                                <select
                                    value={profile}
                                    onChange={(e) => setProfile(e.target.value as string)}
                                    className="border rounded px-3 py-1 bg-slate-100 cursor-pointer"
                                    >
                                    {Object.keys(policyLogic).map(profileName => (
                                            <option key={profileName} >{profileName}</option>                            
                                    ))}
                                </select>
                                
                            </div>

                            

                            {/* Actions */}
                            <div className="flex items-center gap-4">
                                

                                <div className="relative rounded p-4">
                                    <UploadProfileHelp />
                                    <label className="px-3 py-2 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300 text-sm font-medium">
                                        Upload Profile
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleUploadProfile(file);
                                                e.target.value = "";
                                            }}
                                        />
                                    </label>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                    disabled={!isAllFilesAvailable}
                                    >
                                    {isAllFilesAvailable ?
                                    ("Apply Policy") :
                                    (<Loader2 className="h-5 w-5 animate-spin text-white" />)
                                    }
                                </button>

                            </div>
                        </div>
                        <button onClick={handleExportProfile} className="px-4 py-2 max-w-40 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            Export Profile
                        </button>
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
                    .filter(key => !NonEditableTags.has(key))
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
                                className="bg-slate-100 border rounded px-2 py-1"
                            >
                                <option value="KEEP">
                                    KEEP
                                </option>
                                <option value="REMOVE">
                                    REMOVE
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
            
            </Draggable>     
            </div>
        )}
    </>
  )
}

export default EditTagsModal