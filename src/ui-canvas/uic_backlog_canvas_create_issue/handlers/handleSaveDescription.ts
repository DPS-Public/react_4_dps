import { message } from "antd"
import { serviceAddCommonDescription } from "../services/serviceAddCommonDescription"
import { serviceUpdateCommonDescription } from "../services/serviceUpdateCommonDescription"

export const handleSaveDescription = async (
    newDescriptionName: string,
    projectId: string,
    editingDescription: any,
    closeModal: () => void,
    loadCommonDescriptions: () => Promise<void>
) => {
    if (!newDescriptionName.trim()) {
        message.error("Description name cannot be empty")
        return
    }
    if (!projectId) {
        message.error("Project not found")
        return
    }
    try {
        if (editingDescription) {
            await serviceUpdateCommonDescription(projectId, editingDescription.id, newDescriptionName)
            message.success("Description updated successfully")
        } else {
            await serviceAddCommonDescription(projectId, newDescriptionName)
            message.success("Description added successfully")
        }
        closeModal()
        await loadCommonDescriptions()
    } catch (error: any) {
        message.error(error?.message || "Failed to save description")
    }
}
