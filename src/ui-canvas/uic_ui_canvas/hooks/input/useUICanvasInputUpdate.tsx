import {doc, getDoc, updateDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";

export default function useUICanvasInputUpdate({selectedUI, selectedUICanvasId, selectedInput}) {
    const updateInput = async (inputName: string, componentInfo = null) => {        if (!selectedUI) return;
        const uiCanvasDocRef = doc(db, "ui_canvas", selectedUICanvasId);
        const docSnapInput = await getDoc(uiCanvasDocRef).then(res => res.get("input"));
        const id = componentInfo ? componentInfo.id : selectedInput.id
        const payload = {
            ...selectedUI,
            input: {
                ...docSnapInput,
                [selectedUICanvasId]: {
                    ...docSnapInput[selectedUICanvasId],
                    [id]: {
                        ...docSnapInput[selectedUICanvasId][id],
                        ...(componentInfo ? componentInfo : {inputName})

                    }
                },
            }
        }
        try {
            await updateDoc(uiCanvasDocRef, payload)
            message.success("Input updated successfully")

        } catch (e) {
            console.error("Error updating UI canvas input:", e)
        }

    }
    return {updateInput}
}
