import { db } from "@/config/firebase"
import { collection, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore"

export const serviceIncrementDescriptionUsage = async (projectId: string, name: string) => {
    try {
        const snapshot = await getDocs(
            query(collection(db, `common_descriptions_${projectId}`), where('name', '==', name))
        )
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref
            const currentCount = snapshot.docs[0].data().usageCount || 0
            await updateDoc(docRef, { usageCount: currentCount + 1, updatedAt: Timestamp.now() })
        }
    } catch (error) {
        console.error("Error incrementing description usage:", error)
    }
}
