import {RootState, useAppSelector} from "@/store";
import {callApiPublic, callApiWithToken} from "@/utils/callApi.ts";
import {message} from "antd";
import { db } from "@/config/firebase";
import { doc, getDoc, serverTimestamp, arrayUnion, updateDoc } from "firebase/firestore";
import services from "@/ui-canvas/uic_backlog_canvas/services/backlogService";

export default function useUICanvasCreateBulkIssue({selectedDescriptions, setSelectedDescriptions, uiList, selectedUI, selectedUICanvasId, allUIInputs}) {

    
    const {currentProject} = useAppSelector((state: RootState) => state.project);
    const {currentUser, canvasses, users} = useAppSelector((state: RootState) => state.auth);
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // Helper function to get inputBlock from selectedUI or allUIInputs
    const getInputBlock = (inputId: string) => {
        // First try: selectedUI.input structure is { [inputId]: {...} }
        if (selectedUI?.input && selectedUI.input[inputId]) {
            return selectedUI.input[inputId];
        } 
        // Second try: allUIInputs structure is { [canvasId]: { [inputId]: {...} } }
        else if (allUIInputs && selectedUICanvasId && allUIInputs[selectedUICanvasId]?.[inputId]) {
            return allUIInputs[selectedUICanvasId][inputId];
        }
        return null;
    };
    
    // Helper function to get description data (text + metadata) from selectedUI or allUIInputs
    const getDescriptionData = (desc: any) => {        
        if (!desc?.inputId || !desc?.id) {            return { text: '', data: null };
        }
        
        const inputBlock = getInputBlock(desc.inputId);
        
        if (!inputBlock) {            return { text: '', data: null };
        }
        
        const descId = desc.descId || desc.id;
        let descriptionText = '';
        let descriptionData: any = null;
        
        // Handle formAction separately (it's directly on inputBlock)
        if (desc.key === 'formAction') {
            const formAction = inputBlock.formAction;
            if (formAction) {
                descriptionText = formAction.description || formAction.action || '';
                descriptionData = {
                    key: 'formAction',
                    action: formAction.action,
                    description: formAction.description,
                    condition: formAction.condition,
                    uiId: formAction.uiId ?? formAction.ui_canvas_id,
                    ui_canvas_id: formAction.uiId ?? formAction.ui_canvas_id,
                };
            }            return { text: descriptionText, data: descriptionData };
        }
        
        // Get field block based on key
        const fieldBlock = inputBlock?.[desc.key];
        
        if (!fieldBlock) {            return { text: '', data: null };
        }
        
        // Get the description item based on the key type
        const descItem = fieldBlock[descId];
        
        if (!descItem) {            return { text: '', data: null };
        }
        
        // Build description text and data based on type
        if (desc.key === 'manualDescription') {
            const event = descItem.event ? `[${descItem.event}] ` : '';
            descriptionText = event + (descItem.description || descItem.label || '');
            descriptionData = {
                key: 'manualDescription',
                event: descItem.event,
                description: descItem.description || descItem.label || '',
            };
        } else if (desc.key === 'templateDescription') {
            const label = descItem.label ? `${descItem.label}: ` : '';
            descriptionText = label + (descItem.description || '');
            descriptionData = {
                key: 'templateDescription',
                label: descItem.label,
                description: descItem.description || '',
            };
        } else if (desc.key === 'apiCall') {
            descriptionText = descItem.description || descItem.label || '';
            descriptionData = {
                key: 'apiCall',
                event: descItem.event,
                description: descItem.description || descItem.label || '',
                api: descItem.api,
                apiName: descItem.apiName,
            };
        } else {
            // Default: get description or label
            descriptionText = descItem.description || descItem.label || '';
            descriptionData = {
                key: desc.key,
                description: descItem.description || descItem.label || '',
            };
        }        return { text: descriptionText, data: descriptionData };
    };
    
    const createBulkIssue = async (values: any, uploadUrlList) => {
        try {            
            let createdIssues = [];
            
            if (selectedDescriptions && selectedDescriptions.length > 0) {
                const now = new Date();
                const pad = (n: number) => n.toString().padStart(2, "0");
                const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                
                const userName = users.find((item: any) => item?.uid == values?.assignee)?.displayName as any;
                const userPhoto = users.find((item: any) => item?.uid == values?.assignee)?.photoURL as any;
                
                
                const bulkIssue = selectedDescriptions.map(description => {
                    const { text: descriptionText, data: descriptionData } = getDescriptionData(description);
                    // Get input block to extract inputName
                    const inputBlock = getInputBlock(description.inputId);
                    const inputName = inputBlock?.inputName || '';
                    
                    // Combine form description with UI canvas input description
                    const formDescription = values.description?.trim() || '';
                    const uiCanvasDescription = descriptionText || '';
                    let finalDescription = '';
                    
                    if (formDescription && uiCanvasDescription) {
                        // Both exist: combine them with a separator
                        finalDescription = `${formDescription}\n\n--- UI Canvas Input Description ---\n${uiCanvasDescription}`;
                    } else if (formDescription) {
                        // Only form description exists
                        finalDescription = formDescription;
                    } else if (uiCanvasDescription) {
                        // Only UI canvas description exists
                        finalDescription = uiCanvasDescription;
                    }
                    
                    // Debug: Log description to verify it's being combined correctly
                
                    
                    // Build base issue data
                    const issueData: any = {
                        ...values,
                        description: finalDescription,
                        assignee: values?.assignee,
                        assigneeName: userName,
                        assigneePhotoUrl: userPhoto,
                        uiCanvas: uiList?.find(item => item.id === values.uiCanvas)?.label ?? '',
                        uiCanvasId: values.uiCanvas,
                        closedDate: "",
                        createdBy: currentUser?.displayName,
                        createdAt: formatted,
                        status: "new",
                        sh: 0,
                        comment: "",
                        eh: 0,
                        imageUrl: uploadUrlList || null,
                        descId: description?.descId ?? description?.id,
                        inputId: description?.inputId,
                        inputName: inputName,
                        key: description?.key,
                        // Store full description data as JSON string for BacklogTable to parse
                        uiCanvasDescriptionData: descriptionData ? JSON.stringify(descriptionData) : null,
                    };

                    // If API Canvas relation (apiCall key), add API Canvas fields to top level
                    if (description?.key === 'apiCall' && descriptionData) {
                        issueData.apiCanvasId = descriptionData.api || null;
                        issueData.apiCanvasName = descriptionData.apiName || null;
                        issueData.apiCanvasDescription = descriptionData.description || null;
                    }

                    return issueData;
                });
                
                
                const response = await callApiPublic("/backlog/add-issue-bulk", {data: bulkIssue, projectId: currentProject.id});
                
                createdIssues = bulkIssue;
                
                message.success("Issue(s) created successfully");
                setSelectedDescriptions([]);
                
                // Add to ui_canvas_history for each selected description
                if (selectedUICanvasId) {
                    await addBulkIssueHistoryRecord({
                        uiCanvasId: selectedUICanvasId,
                        selectedDescriptions: selectedDescriptions,
                        createdIssues: createdIssues,
                        formValues: values,
                    });
                }
            } else {
                // Eğer seçili descriptions yoksa, tek bir issue oluştur (backlog'daki gibi)
                if (!currentUser) {
                    message.error("User not found!");
                    return;
                }
                
                const now = new Date();
                const pad = (n: number) => n.toString().padStart(2, "0");
                const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

                const counterRef = doc(db, "backlog_counter", currentProject?.id);
                const docSnap = await getDoc(counterRef);

                const userName = users.find((item: any) => item?.uid == values?.assignee)?.displayName as any;
                const userPhoto = users.find((item: any) => item?.uid == values?.assignee)?.photoURL as any;
                const issueData = {
                    no: docSnap?.exists() ? docSnap.data()?.lastTaskNo : 1,
                    description: values.description.trim(),
                    assignee: values?.assignee,
                    assigneeName: userName,
                    assigneePhotoUrl: userPhoto,
                    createdBy: currentUser && currentUser?.displayName,
                    uiCanvas: canvasses.find(item => item.id == values.uiCanvas)?.label,
                    uiCanvasId: values.uiCanvas,
                    type: values.type,
                    comment: "",
                    imageUrl: uploadUrlList || null,
                    createdAt: formatted,
                    closedDate: "",
                    status: "new",
                    api: "",
                    apiDescription: "",
                    sh: 0,
                    eh: 0,
                };
                const issueId = await services.createIssue(currentProject?.id, issueData);
                
                // Create notification for assignee if assigned and assignee is different from creator
                if (values?.assignee && issueId && values.assignee !== currentUser.uid) {
                    try {
                        await callApiWithToken('/notifications/create-issue-notification', {
                            projectId: currentProject?.id,
                            issueId: issueId,
                            issueKey: issueId, // issueKey is same as issueId for URL navigation
                            issueNo: issueData.no,
                            assigneeId: values.assignee,
                            createdBy: currentUser.uid,
                            createdByName: currentUser.displayName || currentUser.email,
                            issueDescription: values.description.trim().substring(0, 200),
                            issueType: values.type
                        });
                    } catch (error) {
                        console.error("Error creating notification:", error);
                    }
                }
                
                // Add to ui_canvas_history for single issue
                if (selectedUICanvasId && values.uiCanvas) {
                    await addSingleIssueHistoryRecord({
                        uiCanvasId: selectedUICanvasId,
                        issueData: issueData,
                        issueId: issueId,
                        formValues: values,
                    });
                }
                
                message.success("Issue created successfully");
            }
        } catch (e) {            message.error("Something went wrong");
        }
    }

    // Add to ui_canvas_history for bulk issues
    const addBulkIssueHistoryRecord = async (historyData: {
        uiCanvasId: string;
        selectedDescriptions: any[];
        createdIssues: any[];
        formValues: any;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'BULK_ISSUE_CREATE',
                fieldName: 'bulk_issues',
                selectedDescriptions: historyData.selectedDescriptions,
                createdIssuesCount: historyData.createdIssues.length,
                formValues: historyData.formValues,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);
            
            if (!historyDocSnap.exists()) {
                // Create new document
                await updateDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    bulk_issues: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    bulk_issues: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding bulk issue history record:', error);
        }
    }

    // Add to ui_canvas_history for single issue
    const addSingleIssueHistoryRecord = async (historyData: {
        uiCanvasId: string;
        issueData: any;
        issueId: string;
        formValues: any;
    }) => {
        try {
            const uiCanvasHistoryDocRef = doc(db, 'ui_canvas_history', historyData.uiCanvasId);
            
            const historyRecord = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: userData?.uid || 'unknown',
                userName: userData?.name || userData?.email || 'Unknown User',
                userEmail: userData?.email || 'Unknown Email',
                actionType: 'SINGLE_ISSUE_CREATE',
                fieldName: 'issues',
                issueId: historyData.issueId,
                issueData: historyData.issueData,
                formValues: historyData.formValues,
                timestamp: new Date().toISOString(),
            };

            // Check if history document exists
            const historyDocSnap = await getDoc(uiCanvasHistoryDocRef);
            
            if (!historyDocSnap.exists()) {
                // Create new document
                await updateDoc(uiCanvasHistoryDocRef, {
                    uiCanvasId: historyData.uiCanvasId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    issues: [historyRecord],
                    allChanges: [historyRecord],
                });
            } else {
                // Update existing document
                await updateDoc(uiCanvasHistoryDocRef, {
                    updatedAt: serverTimestamp(),
                    issues: arrayUnion(historyRecord),
                    allChanges: arrayUnion(historyRecord),
                });
            }        } catch (error) {
            console.error('Error adding single issue history record:', error);
        }
    }

    return {createBulkIssue}
}


