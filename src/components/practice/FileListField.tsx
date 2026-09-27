import { useRef, useState } from "react"
import { FileText, Paperclip, X } from "lucide-react"
import {
  PRACTICE_FILES_MAX,
  PRACTICE_FILE_ACCEPT,
  uploadPracticeFile,
  errorText,
  type PracticeFile,
} from "@/lib/practices"

/** 파일 크기 표시(예: 1.2MB, 340KB). */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(n / 1024))}KB`
}

/**
 * 첨부파일 칸 — 고르면 바로 올리고 목록에 더한다(글 저장 전이라도 저장소에 올라감).
 * 빼기는 목록에서만 뺀다. 저장소 정리는 부모가 저장 성공 후 한다(removed 목록).
 */
export function FileListField({
  value,
  onChange,
  onBusyChange,
  disabled,
}: {
  value: PracticeFile[]
  onChange: (v: PracticeFile[]) => void
  onBusyChange?: (busy: boolean) => void
  disabled?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const left = PRACTICE_FILES_MAX - value.length

  async function pick(list: FileList | null) {
    if (!list || list.length === 0) return
    setError(null)
    const files = Array.from(list).slice(0, left)
    if (list.length > left)
      setError(`첨부파일은 ${PRACTICE_FILES_MAX}개까지예요. 앞의 ${left}개만 올립니다.`)
    setUploading(true)
    onBusyChange?.(true)
    const added: PracticeFile[] = []
    try {
      for (const f of files) added.push(await uploadPracticeFile(f))
    } catch (e) {
      setError(errorText(e, "파일을 올리지 못했습니다."))
    } finally {
      if (added.length > 0) onChange([...value, ...added])
      setUploading(false)
      onBusyChange?.(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {value.map((f) => (
            <li key={f.path} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatBytes(f.size)}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.path !== f.path))}
                disabled={disabled || uploading}
                aria-label={`${f.name} 빼기`}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {left > 0 && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Paperclip className="size-4" aria-hidden />
          {uploading ? "올리는 중…" : "파일 첨부"}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={PRACTICE_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ""
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
