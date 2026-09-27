import { useEffect, useRef, useState, type DragEvent } from "react"
import { Crop, ImagePlus, X } from "lucide-react"
import { THUMBNAIL_MIME } from "@/lib/apps"
import { ThumbnailCropper } from "@/components/app/ThumbnailCropper"

const RESULT_MAX_BYTES = 2 * 1024 * 1024 // 올라가는 결과물 한도(app-thumbnails 버킷과 동일)
const SOURCE_MAX_BYTES = 20 * 1024 * 1024 // 원본 사진 한도 — 자르기 창에서 1280×720 으로 줄인다

/** 대표 사진 값: 새로 자른 파일(file) 또는 이미 올라간 주소(url). 둘 다 없으면 비어 있음. */
export type CoverValue = { file: File | null; url: string }

/**
 * 대표 사진 칸 — 앱 글쓰기 썸네일(WriteForm)과 같은 방식.
 * 선택·끌어다 놓기·붙여넣기(Ctrl·⌘+V) → 자르기 창(16:9, 1280×720) → 미리보기.
 * 실제 업로드는 폼 제출 때 한다(부모가 value.file 을 올림).
 */
export function CoverField({
  value,
  onChange,
  disabled,
}: {
  value: CoverValue
  onChange: (v: CoverValue) => void
  disabled?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [cropSource, setCropSource] = useState<File | null>(null)
  const [lastSource, setLastSource] = useState<File | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const preview = value.file ? blobUrl : value.url || null

  function accept(file: File | null) {
    setError(null)
    if (!file) return
    if (!THUMBNAIL_MIME.includes(file.type)) {
      setError("이미지(PNG·JPG·WebP·GIF) 파일만 넣을 수 있습니다.")
      return
    }
    if (file.size > SOURCE_MAX_BYTES) {
      setError("사진은 20MB 이하만 넣을 수 있습니다.")
      return
    }
    setLastSource(file)
    setCropSource(file)
  }

  function applyCropped(result: File) {
    setCropSource(null)
    if (result.size > RESULT_MAX_BYTES) {
      setError("변환한 사진이 2MB를 넘어요. 다른 사진으로 시도해 주세요.")
      return
    }
    setBlobUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(result)
    })
    onChange({ file: result, url: "" })
  }

  function clear() {
    setBlobUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
    setLastSource(null)
    setError(null)
    onChange({ file: null, url: "" })
  }

  // 스크린샷 붙여넣기 — 에디터 안에서 붙여넣을 때는 에디터가 먼저 처리하도록 편집 영역은 제외.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest("[contenteditable=true], input, textarea")) return
      for (const it of e.clipboardData?.items ?? []) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile()
          if (f) {
            e.preventDefault()
            accept(f)
          }
          return
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [])

  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    },
    // 언마운트 때만 정리
    [],
  )

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    accept(e.dataTransfer.files?.[0] ?? null)
  }

  return (
    <>
      {preview ? (
        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md border border-border">
          <img src={preview} alt="대표 사진 미리보기" className="h-full w-full object-cover" />
          {lastSource && (
            <button
              type="button"
              onClick={() => setCropSource(lastSource)}
              disabled={disabled}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-background disabled:opacity-50"
            >
              <Crop className="size-3.5" aria-hidden />
              다시 맞추기
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label="대표 사진 빼기"
            className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          disabled={disabled}
          className="flex aspect-video w-full max-w-sm flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-surface text-muted-foreground transition-colors hover:border-foreground/30 disabled:opacity-50"
        >
          <ImagePlus className="size-7" aria-hidden />
          <span className="text-sm">클릭해서 선택 · 끌어다 놓기 · 붙여넣기</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0] ?? null)
          e.target.value = ""
        }}
        disabled={disabled}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ThumbnailCropper
        file={cropSource}
        onCancel={() => setCropSource(null)}
        onDone={applyCropped}
      />
    </>
  )
}
