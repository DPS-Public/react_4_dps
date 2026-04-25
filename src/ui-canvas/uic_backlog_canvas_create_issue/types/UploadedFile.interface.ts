export interface UploadedFile {
    type: "image" | "file"
    location: "upload" | "dragger"
    url: string
    name: string
}
