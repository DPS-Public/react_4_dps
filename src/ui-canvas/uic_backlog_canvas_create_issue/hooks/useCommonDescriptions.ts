import { useState, useEffect } from "react"
import { serviceGetCommonDescriptions } from "../services/serviceGetCommonDescriptions"

export const useCommonDescriptions = (projectId: string | undefined, open: boolean) => {
    const [commonDescriptions, setCommonDescriptions] = useState<any[]>([])
    const [loadingDescriptions, setLoadingDescriptions] = useState(false)

    const loadCommonDescriptions = async () => {
        if (!projectId) return
        setLoadingDescriptions(true)
        try {
            const descriptions = await serviceGetCommonDescriptions(projectId)
            setCommonDescriptions(descriptions.filter((d: any) => !d.deleted))
        } catch (error) {
            console.error("Error loading common descriptions:", error)
        } finally {
            setLoadingDescriptions(false)
        }
    }

    useEffect(() => {
        if (open && projectId) {
            loadCommonDescriptions()
        }
    }, [open, projectId])

    return { commonDescriptions, loadingDescriptions, loadCommonDescriptions }
}
