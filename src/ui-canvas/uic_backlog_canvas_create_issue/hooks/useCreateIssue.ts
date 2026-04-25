import { useAppSelector } from "@/store"
import { useProjectUsers } from "@/hooks/useProjectUsers"
import { message } from "antd"
import { serviceCreateIssueWithNodes } from "../services/serviceCreateIssueWithNodes"

const useCreateIssue = () => {
    const { currentUser, canvasses } = useAppSelector(state => state.auth)
    const { currentProject } = useAppSelector(state => state.project)
    const { projectUsers: users } = useProjectUsers()

    const createIssue = async (
        values: any,
        uploadedUrlList: any[],
        selectedNodes?: Set<string>,
        treeData?: any[],
        selectedDescriptions?: any[]
    ): Promise<string[]> => {
        if (!currentUser) {
            message.error("User not found!")
            return []
        }

        return await serviceCreateIssueWithNodes(
            values,
            uploadedUrlList,
            currentUser,
            canvasses,
            currentProject,
            users,
            selectedNodes,
            treeData,
            selectedDescriptions
        )
    }

    return { createIssue }
}

export default useCreateIssue
