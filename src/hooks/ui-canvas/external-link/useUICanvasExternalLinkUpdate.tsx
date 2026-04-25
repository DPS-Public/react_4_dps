import {RootState, useAppSelector} from "@/store";
import {doc, getDoc, setDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";

export default function useUICanvasExternalLinkUpdate() {
    const {currentCanvas} = useAppSelector((state: RootState) => state.auth);
    const currentProject = useAppSelector((state) => state.project.currentProject);
    const updateExternalLink = async (id, values) => {
        const canvasId = localStorage.getItem("currentUI") || currentCanvas?.id;
        if (!currentProject?.id || !canvasId) {
            console.error("Project ID və UI Canvas ID tələb olunur");
            return false;
        }

        const docRef = doc(db, "external_links", currentProject.id);

        try {
            const docSnap = await getDoc(docRef);
            const data = docSnap.data();
            const canvasLinks = data?.links?.[canvasId] || {};

            // Sadəcə seçilmiş linkin sahələrini yenilə (defaultView toxunulmur)
            const updatedCanvasLinks = {
                ...canvasLinks,
                [id]: {
                    ...canvasLinks[id], // mövcud sahələri saxla
                    ...values,
                    lastUpdated: new Date().toISOString(),
                },
            };

            const newData = {
                links: {
                    ...data?.links,
                    [canvasId]: updatedCanvasLinks,
                },
            };
            await setDoc(docRef, newData, { merge: true });

            message.success("External Link updated successfully");            return true;
        } catch (error) {
            message.error("Something went wrong");
            console.error("❌ External link yenilənərkən xəta:", error);
            return false;
        }
    }
    return {updateExternalLink}
}
