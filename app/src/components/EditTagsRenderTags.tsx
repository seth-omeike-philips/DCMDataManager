import { PolicyLogic } from '@/policy/BasePolicyLogic';
import { TagAction } from '@/policy/PolicyLogic';
import React from 'react'
type TagPath = (string | number)[];


interface Props {
    tagKey: string;
    value: any;
    profile: string;
    policyLogic: PolicyLogic;
    handleTagChange:  (path: TagPath, tagAction: TagAction["type"], value: string | undefined) => void;
}
const EditTagsRenderTags: React.FC<Props> = ({ tagKey, value,profile,policyLogic,handleTagChange }) => {


    const renderField = (tagKey:string, value:any, path: TagPath, depthCount:number) => {
        if (Array.isArray(value)) {
            return (
            <div>
                {/**If it is just an array and not an array of objects */}
                {value.every((item) => typeof item !== "object" || item === null) && (
                    <div className="flex font-medium ">{tagKey} [ ]</div>
                )}
                {value.map((item, index) => (
                    <div key={`${[...path, tagKey, index].join(".")}`} className={`${typeof item !== "object" ? "border-l pl-4 ml-2" : ""}`}>
                        {renderField(tagKey, item, [...path, index], depthCount + 1)}
                    </div>
                ))}
            </div>
            );
        }
        
        if (typeof value === "object" && value !== null && tagKey !== "_vrMap" && tagKey !== "PixelData") {
            
            return (
                <div className="">
                    <div className="flex font-medium">{tagKey}</div>
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
        const pathKey = path.join(".");
        let pathName = pathKey.split(".").slice(-1)[0];

        let shouldBeBold = false;
        if (tagKey === pathKey) {
            shouldBeBold = true;
            pathName = pathKey;
        }
        // Primitive
        if (pathName === "_vrMap" || pathName === "PixelData") {
            return null; // Skip rendering for these keys
        }
        return (
            <div className="flex flex-row items-center justify-between w-full">

                <div className={`text-sm ${shouldBeBold ? "font-medium" : "font-normal"}`}>
                    {pathName}
                </div>
                
                <div className="flex flex-col pb-1">
                    <select value={policyLogic[profile][pathKey]?.type ?? "COULD_NOT_FIND_TAG"}
                        onChange={e => handleTagChange( path, e.target.value as TagAction["type"], undefined)}
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
                    {policyLogic[profile][pathKey]?.type === "CUSTOM" && (
                        <div className="flex ">
                            <input
                            type="text"
                            className="border mt-1 max-w-40 px-2 py-1 bg-slate-100 dark:bg-slate-100"
                            placeholder="Input custom value..."
                            value={policyLogic[profile][pathKey]?.value || ""}
                            onChange={(e) =>handleTagChange([pathKey], "CUSTOM", e.target.value)}
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