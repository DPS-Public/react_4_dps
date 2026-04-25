import { db } from "@/config/firebase"
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { syncUICanvasBacklogMetrics } from "@/ui-canvas/uic_ui_canvas/services/uICanvasAnalyticsService";

export const serviceCreateIssue = async (projectId: string, data: any) => {
    const counterRef = doc(db, "backlog_counter", projectId)
    const docSnap = await getDoc(counterRef)
    let nextNo = 1
    if (!docSnap.exists()) {
        await setDoc(counterRef, { lastTaskNo: 1 })
    } else {
        nextNo = docSnap.data().lastTaskNo + 1
        await updateDoc(counterRef, { lastTaskNo: nextNo })
    }
    data.no = nextNo
    const docRef = await addDoc(collection(db, `backlog_${projectId}`), data)
    if (data?.uiCanvasId) {
        await syncUICanvasBacklogMetrics(projectId, data.uiCanvasId)
    }
    return docRef.id
}
