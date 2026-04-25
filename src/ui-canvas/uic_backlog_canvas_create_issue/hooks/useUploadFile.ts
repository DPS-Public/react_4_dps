import { useState, useEffect } from "react"
import { message } from "antd"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "@/config/firebase"
import { UploadedFile } from "../types/UploadedFile.interface"

export const useUploadFile = (open: boolean) => {
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
    const [uploadedUrlList, setUploadedUrlList] = useState<UploadedFile[]>([])
    const [fileList, setFileList] = useState<any[]>([])
    const [loader, setLoader] = useState(false)

    const uploadFile = async (file: File, location: "upload" | "dragger") => {
        setLoader(true)
        try {
            const storageRef = ref(storage, `issues/${Date.now()}_${file.name}`)
            const snapshot = await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(snapshot.ref)
            const isImage = file.type.startsWith("image/")
            setUploadedUrl(downloadURL)
            setUploadedUrlList(prev => [...prev, { type: isImage ? "image" : "file", location, url: downloadURL, name: file.name }])
            message.success(`${file.name} uploaded successfully`)
        } catch {
            message.error("Upload failed")
        } finally {
            setLoader(false)
        }
    }

    // Clipboard paste — only active when drawer is open
    useEffect(() => {
        if (!open) return

        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return
            for (const item of Array.from(items)) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile()
                    if (file) {
                        const ext = item.type.split("/")[1] || "png"
                        const namedFile = new File([file], `paste-${Date.now()}.${ext}`, { type: item.type })
                        uploadFile(namedFile, "dragger")
                    }
                }
            }
        }

        window.addEventListener("paste", handlePaste)
        return () => window.removeEventListener("paste", handlePaste)
    }, [open])

    const clearFiles = () => {
        setUploadedUrl(null)
        setFileList([])
        setUploadedUrlList([])
    }

    return { uploadedUrl, uploadedUrlList, setUploadedUrlList, fileList, setFileList, loader, setLoader, uploadFile, clearFiles }
}
