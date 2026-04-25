import { useState } from "react"

export const useDescriptionModal = () => {
    const [descriptionModalOpen, setDescriptionModalOpen] = useState(false)
    const [editingDescription, setEditingDescription] = useState<any>(null)
    const [newDescriptionName, setNewDescriptionName] = useState('')

    const openModal = (editDesc?: any) => {
        if (editDesc) {
            setEditingDescription(editDesc)
            setNewDescriptionName(editDesc.name)
        } else {
            setEditingDescription(null)
            setNewDescriptionName('')
        }
        setDescriptionModalOpen(true)
    }

    const closeModal = () => {
        setDescriptionModalOpen(false)
        setNewDescriptionName('')
        setEditingDescription(null)
    }

    return { descriptionModalOpen, editingDescription, newDescriptionName, setNewDescriptionName, openModal, closeModal }
}
