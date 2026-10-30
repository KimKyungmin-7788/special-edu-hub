import { useRef, useState, type DragEvent } from "react"
import { FileText, Upload, X } from "lucide-react"
import { checkVerificationDoc, VERIFICATION_DOC_MIME } from "@/lib/verification"
import { cn } from "@/lib/utils"

/**
 * 교사인증 서류 넣는 칸 — 끌어다 놓거나 눌러서 고른다. 파일은 1개.
 * 고르기만 하고 올리지는 않는다(신청하기를 누를 때 올림 → 취소하면 서버에 남지 않음).
 */
export function VerifyDocDrop({
  file,
  onChange,
  disabled = false,
}: {
  file: File | null
  onChange: (file: File | null, error: string | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  function pick(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    const problem = checkVerificationDoc(f)
    onChange(problem ? null : f, problem)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setOver(false)
    if (!disabled) pick(e.dataTransfer.files)
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm">
        <FileText className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {(file.size / 1024 / 1024).toFixed(1)}MB
        </span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          disabled={disabled}
          aria-label="파일 빼기"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (!disabled) inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center text-sm transition-colors",
        over ? "border-primary bg-brand-muted" : "border-border bg-background hover:bg-accent",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Upload className="size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">파일을 여기에 끌어다 놓거나 눌러서 고르세요</p>
      <p className="text-xs text-muted-foreground">PDF·PNG·JPG·WebP, 1개</p>
      <input
        ref={inputRef}
        type="file"
        accept={VERIFICATION_DOC_MIME.join(",")}
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ""
        }}
        className="hidden"
      />
    </div>
  )
}
