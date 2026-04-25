import { db } from "@/config/firebase"
import { doc, getDoc } from "firebase/firestore"
import { serviceCreateIssue } from "./serviceCreateIssue"
import { serviceSendIssueNotification } from "./serviceSendIssueNotification"
import { utilBuildBaseIssueData } from "../utils/utilBuildBaseIssueData"
import { utilFindNodeById } from "../utils/utilFindNodeById"

export const serviceCreateIssueWithNodes = async (
    values: any,
    uploadedUrlList: any[],
    currentUser: any,
    canvasses: any[],
    currentProject: any,
    users: any[],
    selectedNodes?: Set<string>,
    treeData?: any[],
    selectedDescriptions?: any[]
): Promise<string[]> => {

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    const counterRef = doc(db, "backlog_counter", currentProject?.id)
    let docSnap = await getDoc(counterRef)


    const foundUser = users.find((item: any) => item?.uid == values?.assignee) as any
    const userName = foundUser?.displayName
    const userPhoto = foundUser?.photoURL

    if (selectedNodes && selectedNodes.size > 0 && treeData) {
        const nodeArray = Array.from(selectedNodes)
        let createdCount = 0
        let firstRepoId: string | null = null
        const createdIssueIds: string[] = []

        for (const nodeId of nodeArray) {
            const node = utilFindNodeById(treeData, nodeId)
            if (node?.githubRepoId) { firstRepoId = node.githubRepoId; break }
        }

        for (const nodeId of nodeArray) {
            const node = utilFindNodeById(treeData, nodeId)
            if (!node) continue

            const nodeCollection: any = {}
            if (node.canvasType && node.canvasId) {
                if (node.canvasType === 'api') nodeCollection.apiCanvas1 = node.canvasId
                else if (node.canvasType === 'ui') nodeCollection.uiCanvas1 = node.canvasId
            }

            const nodeRepoId = node.githubRepoId?.trim() ? node.githubRepoId : (firstRepoId || '')
            if (nodeRepoId) nodeCollection.repoId = nodeRepoId

            const issueData: any = utilBuildBaseIssueData(docSnap, values, uploadedUrlList, formatted, userName, userPhoto, currentUser, canvasses)
            if (Object.keys(nodeCollection).length > 0) issueData.collection = nodeCollection

            const issueId = await serviceCreateIssue(currentProject?.id, issueData)
            createdIssueIds.push(issueId)
            createdCount++
            await serviceSendIssueNotification(issueId, issueData.no, values, currentUser, currentProject)
            docSnap = await getDoc(counterRef)
        }        return createdIssueIds
    } else {
        let issueData: any = utilBuildBaseIssueData(docSnap, values, uploadedUrlList, formatted, userName, userPhoto, currentUser, canvasses)
        if (selectedDescriptions) {
            issueData = { ...issueData, inputDescriptions: selectedDescriptions };
        }
        const issueId = await serviceCreateIssue(currentProject?.id, issueData)
        await serviceSendIssueNotification(issueId, issueData.no, values, currentUser, currentProject)
        return [issueId]
    }
}
