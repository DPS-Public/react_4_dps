import { serviceSendIssueActionNotification } from "./serviceSendIssueActionNotification"

export const serviceSendIssueNotification = async (
    issueId: string,
    issueNo: number,
    values: any,
    currentUser: any,
    currentProject: any
): Promise<void> => {
    if (!issueId) return
    try {
        const recipients = Array.from(
            new Set([
                values?.assignee,
                values?.createdByUid || values?.createdByEmail || values?.createdBy,
            ].filter((item) => typeof item === 'string' ? item.trim() !== '' : Boolean(item)))
        )

        for (const recipient of recipients) {
            await serviceSendIssueActionNotification(
                currentProject?.id,
                issueId,
                issueId,
                issueNo,
                recipient as string,
                currentUser?.uid || '',
                currentUser?.displayName || currentUser?.email || 'Unknown',
                'issue_created',
                { issueType: values?.type || '', parentNo: values?.parentNo || null },
                values?.description?.trim()?.substring(0, 200) || ''
            )
        }
    } catch (error) {
        console.error("Error creating notification:", error)
    }
}
