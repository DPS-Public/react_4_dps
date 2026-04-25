import {RootState, useAppSelector} from "@/store";
import {doc, getDoc, setDoc} from "firebase/firestore";
import {db} from "@/config/firebase.ts";
import {message} from "antd";

export default function useUICanvasExternalLinkSetDefault() {
    const {currentCanvas} = useAppSelector((state: RootState) => state.auth);
    const currentProject = useAppSelector((state) => state.project.currentProject);

    const setDefault = async (id) => {
        const canvasId = localStorage.getItem("currentUI") || currentCanvas?.id;
        if (!currentProject?.id || !canvasId) {
            console.error("Project ID və UI Canvas ID tələb olunur");
            return;
        }

        const docRef = doc(db, "external_links", currentProject.id);

        try {
            const docSnap = await getDoc(docRef);
            const data = docSnap.data();
            const canvasLinks = data?.links?.[canvasId] || {};

            // 1️⃣ Bütün linkləri array şəklinə gətir
            const linkEntries = Object.entries(canvasLinks);

            // 2️⃣ Mövcud linkləri defaultView=false et və sıralama üçün hazırla
            let updatedLinks = linkEntries.map(([linkId, link]) => ({
                id: linkId,
                ...link,
                defaultView: false,
            }));

            // 3️⃣ Default olacaq linki tap və ən əvvələ gətir
            const targetIndex = updatedLinks.findIndex((l) => l.id === id);

            if (targetIndex !== -1) {
                const [targetLink] = updatedLinks.splice(targetIndex, 1);
                updatedLinks.unshift({
                    ...targetLink,
                    defaultView: true,
                });
            } else {
                // Əgər bu link mövcud deyilsə, onu yeni kimi əlavə et
                updatedLinks.unshift({
                    id,
                    defaultView: true,
                });
            }

            // 4️⃣ Hər birinə yeni order ver (1-dən başlayaraq)
            updatedLinks = updatedLinks.map((link, index) => ({
                ...link,
                order: index + 1,
            }));

            // 5️⃣ Yenidən obyekt halına sal
            const updatedCanvasLinks = Object.fromEntries(
                updatedLinks.map((link) => [link.id, link])
            );

            // 6️⃣ Firestore-a yaz
            const newData = {
                links: {
                    ...data?.links,
                    [canvasId]: updatedCanvasLinks,
                },
            };

            await setDoc(docRef, newData, {merge: true});
            message.success("External Link updated successfully");        } catch (error) {
            message.error("Something went wrong");
            console.error("❌ External link əlavə edilərkən xəta:", error);
        }


    };

    return {setDefault};
}
