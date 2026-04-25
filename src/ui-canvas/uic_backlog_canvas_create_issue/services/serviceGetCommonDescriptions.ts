import { db } from "@/config/firebase"
import { collection, getDocs } from "firebase/firestore"

export const serviceGetCommonDescriptions = async (projectId: string) => {
    try {
        const snapshot = await getDocs(collection(db, `common_descriptions_${projectId}`))
        const descriptions: any[] = []
        snapshot.forEach(doc => descriptions.push({ id: doc.id, ...doc.data() }))
        return descriptions.sort((a, b) => {
            if (b.usageCount !== a.usageCount) return (b.usageCount || 0) - (a.usageCount || 0)
            return (a.name || '').localeCompare(b.name || '')
        })
    } catch (error) {
        console.error("Error loading common descriptions:", error)
        return []
    }
}
