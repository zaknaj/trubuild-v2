import { useState } from "react"
import { Upload, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface UploadedFile {
  id: string
  name: string
  fakeUrl: string
}

interface UploadZoneProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  multiple?: boolean
  accept?: string
  className?: string
  compact?: boolean
}

// Generate a fake file name based on common document types
function generateFakeFileName(accept?: string): string {
  const timestamp = Date.now().toString(36).slice(-4)
  if (accept?.includes("xlsx") || accept?.includes("excel")) {
    return `document_${timestamp}.xlsx`
  }
  return `document_${timestamp}.pdf`
}

export function UploadZone({
  files,
  onFilesChange,
  multiple = false,
  accept = ".pdf,.doc,.docx",
  className,
  compact = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleClick = () => {
    // Fake upload - generate a fake file
    const newFile: UploadedFile = {
      id: crypto.randomUUID(),
      name: generateFakeFileName(accept),
      fakeUrl: `/uploads/${crypto.randomUUID()}`,
    }

    if (multiple) {
      onFilesChange([...files, newFile])
    } else {
      onFilesChange([newFile])
    }
  }

  const handleRemoveFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // Fake the upload on drop as well
    handleClick()
  }

  // If single file mode and we have a file, show the file instead of zone
  if (!multiple && files.length > 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <FileItem
          file={files[0]}
          onRemove={() => handleRemoveFile(files[0].id)}
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Upload zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors",
          compact ? "p-4" : "p-8",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <Upload
          className={cn(
            "mx-auto text-muted-foreground",
            compact ? "size-6" : "size-8"
          )}
        />
        <p className={cn("font-medium", compact ? "mt-1 text-sm" : "mt-2")}>
          Click or drag and drop to upload
        </p>
        <p className="text-sm text-muted-foreground">
          {accept.replace(/\./g, "").toUpperCase().replace(/,/g, ", ")}
        </p>
      </div>

      {/* File list for multiple mode */}
      {multiple && files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onRemove={() => handleRemoveFile(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FileItem({
  file,
  onRemove,
}: {
  file: UploadedFile
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
      <FileText className="size-4 text-muted-foreground shrink-0" />
      <span className="text-sm truncate flex-1">{file.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-6 p-0 hover:bg-destructive/10 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
