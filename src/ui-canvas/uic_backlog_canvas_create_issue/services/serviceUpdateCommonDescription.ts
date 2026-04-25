import { db } from "@/config/firebase"
import { doc, Timestamp, updateDoc } from "firebase/firestore"

export const serviceUpdateCommonDescription = async (projectId: string, id: string, name: string) => {
    try {
        const docRef = doc(db, `common_descriptions_${projectId}`, id)
        await updateDoc(docRef, { name: name.trim(), updatedAt: Timestamp.now() })
    } catch (error) {
        console.error("Error updating common description:", error)
        throw error
    }
}
