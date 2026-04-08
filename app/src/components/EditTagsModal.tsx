import React, { useState,useRef } from "react"
import { BaseDicomMetadata } from "@/types/BaseDicomMetadata"
import { policyLogicFunction, TagAction } from "@/policy/PolicyLogic"
import { basePolicyLogic } from "@/policy/BasePolicyLogic"
import { NonEditableTags } from "@/policy/NonEditableTags"
import Draggable from "react-draggable"
import { useModal } from "@/context/ModalContext"
import UploadProfileHelp from "./UploadProfileHelp"
import { Loader2 } from "lucide-react"
import {mappingDescription} from "@/policy/MappingDescription";
import EditTagsRenderTags from "./EditTagsRenderTags"

interface Props {
  dataSet: Record<string, BaseDicomMetadata>
  onClose: () => void
  isAllFilesAvailable: boolean
  setModifiedDataSet: React.Dispatch<React.SetStateAction<Record<string, Record<keyof BaseDicomMetadata, TagAction>>>>
}

type Status = "idle"| "success" | "error"
type TagPath = (string | number)[];
type PolicyNode =
  | { type: "primitive"; action?: TagPolicy }
  | { type: "object"; children: Record<string, PolicyNode> }
  | { type: "array"; items: PolicyNode[] };

type TagPolicy = {
  type: string;
  value?: string;
};

const EditTagsModal: React.FC<Props> = ({ dataSet, onClose,isAllFilesAvailable,setModifiedDataSet }) => {

    const [profile, setProfile] = useState<string>("ANONYMIZE")
    const [status, setStatus] = useState<Status>("idle")
    
    
    const [policyLogic, setPolicyLogic] = useState(basePolicyLogic)
    const {openModal} = useModal();

    const nodeRef = useRef<HTMLDivElement>(null);

    const handleTagChange = (path: TagPath, tagAction: TagAction["type"], value: string|undefined) => {
        const pathKey = path.join(".");

        console.log("Changing tag policy for:", pathKey, "to", tagAction, "with value:", value);
        if (tagAction === "CUSTOM") {
            setPolicyLogic(prev => ({
                ...prev,
                [profile]: {
                    ...prev[profile],
                    [pathKey]: {
                        ...(prev[profile]?.[pathKey] || {}),
                        type: tagAction,
                        value: value || "" // Ensure value is set for CUSTOM action
                    }
                }
            }));
        } else {
            setPolicyLogic(prev => ({
                ...prev,
                [profile]: {
                ...prev[profile],
                [pathKey]: {
                    ...(prev[profile]?.[pathKey] || {}),
                    type: tagAction
                }
                }
            }));
        }

            // Ensure persistence in basePolicyLogic
        if (!basePolicyLogic[profile]) {
            basePolicyLogic[profile] = {} as Record<string, TagAction>;
        }
        if (tagAction === "CUSTOM" && value !== undefined) {
            basePolicyLogic[profile][pathKey] = { type: tagAction, value: value };
        } else if (tagAction !== "CUSTOM") {
            basePolicyLogic[profile][pathKey] = { type: tagAction };
        }
    };


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
            const tags: Record<string, TagAction> = JSON.parse(text)


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
            basePolicyLogic[profileName] = {} as Record<string, TagAction>;

            for (const [key ,val] of Object.entries(tags) as [string, TagAction][]) {
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
                    {Object.entries(
                        dataSet[Object.keys(dataSet)[0]] // Sample the first file's metadata to get the list of tags
                    )
                    .sort((a, b) => {
                    const isTag = (k: string) => /^[0-9A-Fa-f]{8}$/.test(k)

                    const aIsTag = isTag(a[0])
                    const bIsTag = isTag(b[0])

                    // Alphabetical keys first
                    if (!aIsTag && bIsTag) return -1    
                    if (aIsTag && !bIsTag) return 1

                    // If both same type, sort normally
                    return a[0].localeCompare(b[0])
                    })
                    .filter(key => !NonEditableTags.has(key[0]))
                    .map(key => {
                        const typedKey = key[0]

                        return (
                        <div
                            key={key[0]}
                            className="flex flex-col justify-between items-center"
                        >
                            <div className="flex  justify-between items-center w-full">
                                <div className="relative flex flex-col pr-3 pt-3">
                                    {mappingDescription[key[0] as keyof typeof mappingDescription]?.description && (

                                    
                                        <button
                                        onClick={() => openModal({
                                            type: "info",
                                            title: `Mapping Description for ${key[0]}`,
                                            message: mappingDescription[key[0] as keyof typeof mappingDescription]?.description || `No mappingdescription available for ${key[0]}.`
                                        })}
                                        className="absolute top-0 right-0 rounded-full w-3 h-3 p-2 
                                        bg-transparent border-1 border-blue-300 hover:border-blue-500
                                        flex items-center justify-center text-sm font-bold"
                                        >
                                        ?
                                        </button>
                                    )}
                                    
                                </div>
                            
                            

                                <div className="w-full mt-2">
                                    <EditTagsRenderTags
                                     key={key[0]}
                                     tagKey={key[0]}
                                     value={key[1]}
                                     profile={profile} 
                                     handleTagChange={handleTagChange}
                                     policyLogic={policyLogic} 
                                     setPolicyLogic={setPolicyLogic}/>
                                </div>
                            </div>

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