import { useRef, useState, type DragEvent } from "react"
import { FileText, Upload, X } from "lucide-react"
import { APP_FILE_LIMIT, APP_FILE_MAX_BYTES, APP_FILE_TYPES, type AppFile } from "@/lib/apps"
import { cn } from "@/lib/utils"

/** 파일 크기 글자(KB·MB) */
export function fileSizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** 칸에 담긴 파일 한 줄 — 이미 올린 것(AppFile) 또는 새로 고른 것(File) */
export type FileItem = AppFile | File

/**
 * 자료 파일 칸(51) — 최대 APP_FILE_LIMIT 개. 눌러서 고르거나 끌어다 놓는다.
 * 실제 업로드는 저장할 때 WriteForm 이 한다. 형식·크기·개수는 고를 때 먼저 걸러 칸 아래에 알려 준다.
 */
export function AppFileField({
  value,
  onChange,
  disabled,
}: {
  value: FileItem[]
  onChange: (v: FileItem[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  const [over, setOver] = useState(false)
  const full = value.length >= APP_FILE_LIMIT

  function add(list: FileList | null) {
    const picked = Array.from(list ?? [])
    if (picked.length === 0) return
    const ok: File[] = []
    let message = ""
    for (const file of picked) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
      if (!APP_FILE_TYPES[ext]) message = `‘${file.name}’ — PDF·한글·파워포인트·워드·엑셀·zip·TTF 파일만 올릴 수 있습니다.`
      else if (file.size > APP_FILE_MAX_BYTES) message = `‘${file.name}’ — ${fileSizeLabel(file.size)}예요. 5MB 이하만 올릴 수 있습니다.`
      else ok.push(file)
    }
    const room = APP_FILE_LIMIT - value.length
    if (ok.length > room) message = `파일은 ${APP_FILE_LIMIT}개까지 올릴 수 있어요.`
    setError(message)
    if (room > 0 && ok.length) onChange([...value, ...ok.slice(0, room)])
  }

  function drop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    if (!disabled) add(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((item, i) => (
            <li key={item instanceof File ? `new-${i}-${item.name}` : item.path} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fileSizeLabel(item.size)}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                disabled={disabled}
                aria-label={`${item.name} 빼기`}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          disabled={disabled}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-sm transition-colors disabled:opacity-50",
            over ? "border-primary bg-brand-soft text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Upload className="size-5" aria-hidden />
          <span className="font-medium">파일을 끌어다 놓거나 눌러서 고르세요</span>
          <span className="text-xs">{value.length}/{APP_FILE_LIMIT}개</span>
        </button>
      )}
      <input
        ref={inputRef}
        id="app-file"
        type="file"
        multiple
        className="sr-only"
        accept={Object.keys(APP_FILE_TYPES).map((ext) => `.${ext}`).join(",")}
        onChange={(e) => {
          add(e.target.files)
          e.target.value = ""
        }}
        disabled={disabled}
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
