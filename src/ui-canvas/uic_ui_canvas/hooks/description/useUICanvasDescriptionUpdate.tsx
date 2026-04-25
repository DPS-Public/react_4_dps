import { db } from '@/config/firebase';
import { message } from 'antd';
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    setDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

export default function useUICanvasDescriptionUpdate({ selectedUICanvasId }) {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    /* =========================
       CREATE DESCRIPTION
    ========================== */
    const createDescription = async (description: string) => {
        if (!selectedUICanvasId) {
            message.error('No UI Canvas selected');
            return;
        }

        if (!userData?.uid) {
            message.error('User not authenticated');
            return;
        }

        const uiCanvasDocRef = doc(db, 'ui_canvas', selectedUICanvasId);

        try {
            const docSnap = await getDoc(uiCanvasDocRef);

            if (!docSnap.exists()) {
                message.error('UI Canvas not found');
                return;
            }

            const oldDescription = docSnap.data().description || '';

            await updateDoc(uiCanvasDocRef, {
                description,
                updatedAt: serverTimestamp(),
            });

            await createHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                userId: userData.uid,
                userName: userData.name || userData.email || 'Unknown User',
                userEmail: userData.email || 'Unknown Email',
                actionType: 'FIELD_UPDATE',
                fieldName: 'description',
                oldValue: oldDescription,
                newValue: description,
            });

            message.success('Description updated successfully');
        } catch (error) {
            console.error('Error updating description:', error);
            message.error('Failed to update description');
        }
    };

    /* =========================
       GENERIC FIELD UPDATE
    ========================== */
    const updateUICanvasField = async (fieldName: string, newValue: any) => {
        if (!selectedUICanvasId) {
            message.error('No UI Canvas selected');
            return false;
        }

        if (!userData?.uid) {
            message.error('User not authenticated');
            return false;
        }

        const uiCanvasDocRef = doc(db, 'ui_canvas', selectedUICanvasId);

        try {
            const docSnap = await getDoc(uiCanvasDocRef);

            if (!docSnap.exists()) {
                message.error('UI Canvas not found');
                return false;
            }

            const docData = docSnap.data() || {};
            const oldValue =
                fieldName === 'input'
                    ? (docData.input?.[selectedUICanvasId] ?? null)
                    : (docData[fieldName] ?? null);

            const payload =
                fieldName === 'input'
                    ? {
                        input: {
                            ...(docData.input || {}),
                            [selectedUICanvasId]: newValue,
                        },
                        updatedAt: serverTimestamp(),
                    }
                    : {
                        [fieldName]: newValue,
                        updatedAt: serverTimestamp(),
                    };

            await updateDoc(uiCanvasDocRef, payload);

            await createHistoryRecord({
                uiCanvasId: selectedUICanvasId,
                userId: userData.uid,
                userName: userData.name || userData.email || 'Unknown User',
                userEmail: userData.email || 'Unknown Email',
                actionType: 'FIELD_UPDATE',
                fieldName,
                oldValue,
                newValue,
            });

            message.success(`${fieldName} updated successfully`);
            return true;
        } catch (error) {
            console.error(`Error updating ${fieldName}:`, error);
            message.error(`Failed to update ${fieldName}`);
            return false;
        }
    };

    /* =========================
       CREATE HISTORY RECORD
    ========================== */
    const createHistoryRecord = async ({
        uiCanvasId,
        userId,
        userName,
        userEmail,
        actionType,
        fieldName,
        oldValue,
        newValue,
    }: {
        uiCanvasId: string;
        userId: string;
        userName: string;
        userEmail: string;
        actionType: string;
        fieldName: string;
        oldValue: any;
        newValue: any;
    }) => {
        try {
            const historyDocRef = doc(db, 'ui_canvas_history', uiCanvasId);
            const historySnap = await getDoc(historyDocRef);

            const historyRecord = {
                id: crypto.randomUUID(),
                userId,
                userName,
                userEmail,
                actionType,
                fieldName,
                oldValue,
                newValue,
                timestamp: Timestamp.now(), // ✅ ARRAY üçün DÜZGÜN
            };

            if (!historySnap.exists()) {
                await setDoc(historyDocRef, {
                    uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    [fieldName]: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                await updateDoc(historyDocRef, {
                    updatedAt: serverTimestamp(),
                    [fieldName]: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }
        } catch (error) {
            console.error('Error creating history record:', error);
        }
    };

    /* =========================
       GET HISTORY
    ========================== */
    const getUICanvasHistory = async () => {
        if (!selectedUICanvasId) {
            message.error('No UI Canvas selected');
            return null;
        }

        try {
            const historyDocRef = doc(db, 'ui_canvas_history', selectedUICanvasId);
            const snap = await getDoc(historyDocRef);

            if (!snap.exists()) {
                return {
                    uiCanvasId: selectedUICanvasId,
                    allChanges: [],
                };
            }

            return snap.data();
        } catch (error) {
            console.error('Error getting UI Canvas history:', error);
            message.error('Failed to get history');
            return null;
        }
    };

    return {
        createDescription,
        updateUICanvasField,
        getUICanvasHistory,
    };
}
