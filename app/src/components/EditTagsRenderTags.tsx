import { basePolicyLogic } from '@/policy/BasePolicyLogic';
import { BaseDicomMetadata } from '@/types/BaseDicomMetadata';
import React, { useState } from 'react'
type TagPath = (string | number)[];
type PolicyNode =
  | { type: "primitive"; action?: TagPolicy }
  | { type: "object"; children: Record<string, PolicyNode> }
  | { type: "array"; items: PolicyNode[] };

type TagPolicy = {
  type: string;
  value?: string;
};

interface Props {
    tagKey: string;
    value: any;
    profile: string;
    handleCustomValueChange: (tagKey: keyof BaseDicomMetadata, value: string) => void;
    handleTagChange: (tagKey: keyof BaseDicomMetadata, actionType: string) => void;
}
const EditTagsRenderTags: React.FC<Props> = ({ tagKey, value,profile, handleCustomValueChange, handleTagChange }) => {

    const [policyLogic, setPolicyLogic] = useState(basePolicyLogic);
    const renderField = (tagKey:string, value:any, path: TagPath, depthCount:number) => {
        const typedKey = tagKey as keyof BaseDicomMetadata;
        if (Array.isArray(value)) {
            return (
            <div>
                {value.map((item, index) => (
                    <div key={`${[...path, tagKey, index].join(".")}`}>
                    {renderField(tagKey, item, [...path, index], depthCount + 1)}
                    </div>
                ))}
            </div>
            );
        }
        
        if (typeof value === "object" && value !== null) {
            return (
                <div className="">
                    <div className="flex">{tagKey}</div>
                    <div className="border-l pl-4 ml-2">
                        {Object.entries(value).map(([childKey, childValue]) => (
                            
                            <div key={`${[...path, tagKey, childKey].join(".")}`}>
                                
                                {renderField(childKey, childValue, [...path,childKey], depthCount + 1)}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        console.log(`path: ${path}`);
        console.log(`tagKey: ${tagKey} | ${policyLogic[profile][typedKey]?.type ?? "COULD_NOT_FIND_TAG"}`);
        const pathKey = path.join(".");
        let pathName = pathKey.split(".").slice(-1)[0];

        let shouldBeBold = false;
        if (tagKey === pathKey) {
            shouldBeBold = true;
            pathName = pathKey;
        }
        // Primitive
        return (
            <div className="flex flex-row items-center justify-between w-full">

                <div className={`text-sm ${shouldBeBold ? "font-medium" : "font-normal"}`}>
                    {pathName}
                </div>
                
                <div className="flex flex-col pb-1">
                    <select value={policyLogic[profile][typedKey]?.type ?? "COULD_NOT_FIND_TAG"}
                        onChange={e => handleTagChange( typedKey,e.target.value as unknown)}
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
                        <option value="CUSTOM">
                            CUSTOM
                        </option>

                    </select>
                    {policyLogic[profile][typedKey]?.type === "CUSTOM" && (
                        <div className="flex ">
                            <input
                            type="text"
                            className="border mt-1 max-w-40 px-2 py-1 bg-slate-100 dark:bg-slate-100"
                            placeholder="Input custom value..."
                            value={policyLogic[profile][typedKey]?.value || ""}
                            onChange={(e) =>handleCustomValueChange(typedKey, e.target.value)}
                            />
                        </div>
                    )}
                </div>

            </div>
        );
    };

   return renderField(tagKey,value,[tagKey],0);
}

export default EditTagsRenderTags