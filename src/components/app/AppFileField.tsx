import { useRef, useState } from "react"
import { FileText, Upload, X } from "lucide-react"
import { APP_FILE_MAX_BYTES, APP_FILE_TYPES, type AppFile } from "@/lib/apps"

/** 파일 크기 글자(KB·MB) */
export function fileSizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/**
 * 자료 파일 칸(50) — 한 개. 이미 올린 파일(saved) 또는 새로 고른 파일(picked)을 보여 주고, 빼거나 바꾼다.
 * 실제 업로드는 저장할 때 WriteForm 이 한다. 형식·크기는 고를 때 먼저 걸러 칸 아래에 알려 준다.
 */
export function AppFileField({
  saved,
  picked,
  onPick,
  onClear,
  disabled,
}: {
  saved: AppFile | null
  picked: File | null
  onPick: (file: File) => void
  onClear: () => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  const current = picked ? { name: picked.name, size: picked.size } : saved

  function choose(file: File | undefined) {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!APP_FILE_TYPES[ext]) return setError("PDF·한글·파워포인트·워드·엑셀·zip 파일만 올릴 수 있습니다.")
    if (file.size > APP_FILE_MAX_BYTES) return setError(`파일이 ${fileSizeLabel(file.size)}예요. 5MB 이하만 올릴 수 있습니다.`)
    setError("")
    onPick(file)
  }

  return (
    <div className="flex flex-col gap-2">
      {current ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{current.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fileSizeLabel(current.size)}</span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="파일 빼기"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Upload className="size-4" aria-hidden />
          파일 고르기
        </button>
      )}
      <input
        ref={inputRef}
        id="app-file"
        type="file"
        className="sr-only"
        accept={Object.keys(APP_FILE_TYPES).map((ext) => `.${ext}`).join(",")}
        onChange={(e) => {
          choose(e.target.files?.[0])
          e.target.value = ""
        }}
        disabled={disabled}
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
