import { db } from "@/config/firebase"
import { addDoc, collection, getDocs, query, Timestamp, updateDoc, where } from "firebase/firestore"

export const serviceAddCommonDescription = async (projectId: string, name: string) => {
    try {
        const snapshot = await getDocs(
            query(collection(db, `common_descriptions_${projectId}`), where('name', '==', name))
        )
        if (!snapshot.empty) {
            const existingDoc = snapshot.docs[0]
            const currentCount = existingDoc.data().usageCount || 0
            await updateDoc(existingDoc.ref, { usageCount: currentCount + 1 })
            return existingDoc.id
        } else {
            const docRef = await addDoc(collection(db, `common_descriptions_${projectId}`), {
                name: name.trim(),
                usageCount: 1,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            })
            return docRef.id
        }
    } catch (error) {
        console.error("Error adding common description:", error)
        throw error
    }
}
