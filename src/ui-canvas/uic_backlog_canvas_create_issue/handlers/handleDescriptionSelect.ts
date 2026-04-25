import { serviceIncrementDescriptionUsage } from "../services/serviceIncrementDescriptionUsage"

export const handleDescriptionSelect = (
    value: string,
    commonDescriptions: any[],
    projectId: string,
    getFieldValue: (name: string) => string,
    setFieldValue: (name: string, value: any) => void
) => {
    const selectedDesc = commonDescriptions.find((d: any) => d.id === value)
    if (!selectedDesc) return

    const currentDescription = getFieldValue('description') || ''
    const tagText = `[${selectedDesc.name}]`

    if (!currentDescription.includes(tagText)) {
        const newDescription = currentDescription.trim()
            ? `${tagText} ${currentDescription}`
            : tagText
        setFieldValue('description', newDescription)
        serviceIncrementDescriptionUsage(projectId, selectedDesc.name)
    }
}
