import { db } from '@/config/firebase';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface BacklogIssuePayload {
    title?: string;
    description: string;
    assignee: string;
    assigneeName: string;
    assigneePhotoUrl: string | null;
    createdBy: string;
    uiCanvas: string;
    uiCanvasId: string;
    type: string;
    comment: string;
    imageUrl: null;
    createdAt: string;
    closedDate: string;
    status: string;
    sh: number;
    eh: number;
    codeLine: number;
    commitId: string;
    commitSha: string;
    commitMessage: string;
    commitAuthor: string;
    commitDate: string;
    commitUrl: string | null;
    repositoryName?: string;
    branchName?: string;
    insertedLine?: number;
    githubData: any;
    crdNodeData?: string;
}

/**
 * Persists a new backlog issue for a GitHub commit via the backlog service.
 * Strips API-related fields that should not be stored on commit issues.
 *
 * Service layer — direct Firestore client SDK write, no React state.
 */
export const createBacklogIssue = async (
    projectId: string,
    payload: BacklogIssuePayload
): Promise<void> => {
    const issueData: any = { ...payload };

    // Remove API-canvas fields that do not apply to commit-sourced issues
    delete issueData.api;
    delete issueData.apiDescription;
    delete issueData.apiCanvasId;
    delete issueData.apiCanvasName;
    delete issueData.apiCanvasDescription;

    const counterRef = doc(db, 'backlog_counter', projectId);
    const counterSnap = await getDoc(counterRef);

    let nextNo = 1;
    if (!counterSnap.exists()) {
        await setDoc(counterRef, { lastTaskNo: 1 });
    } else {
        nextNo = (counterSnap.data()?.lastTaskNo || 0) + 1;
        await updateDoc(counterRef, { lastTaskNo: nextNo });
    }

    issueData.no = nextNo;
    await addDoc(collection(db, `backlog_${projectId}`), issueData);
};
