import { useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { Film, X } from "lucide-react"
import { inspectPreviewSource, preparePreviewVideo, PREVIEW_MAX_SECONDS } from "@/lib/apps"
import { cn } from "@/lib/utils"

/**
 * 미리보기 영상 칸(53) — 목록 카드에 마우스를 올리면 재생되는 짧은 영상 1개(선택).
 * 값: 새로 고른 영상(File) · 이미 올린 영상 주소(string) · 없음(null). 실제 업로드는 저장할 때 WriteForm 이 한다.
 * 화면 녹화 원본(크거나 맥 .mov)은 고를 때 브라우저 안에서 작게 줄여 담는다.
 * 10초보다 길면 막대로 시작 지점을 골라 그 10초만 담는다. 소리는 재생할 때 항상 끈다.
 */
export function AppPreviewField({
  value,
  onChange,
  disabled,
}: {
  value: File | string | null
  onChange: (v: File | string | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const trimRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState("")
  const [over, setOver] = useState(false)
  // 줄이는 중이면 진행률(0~1), 아니면 null
  const [shrinking, setShrinking] = useState<number | null>(null)
  // 10초보다 긴 원본 — 시작 지점을 고르는 중
  const [source, setSource] = useState<{ file: File; duration: number } | null>(null)
  const [start, setStart] = useState(0)
  const busy = disabled || shrinking !== null
  // 새로 고른 파일·자를 원본은 임시 주소로 미리 본다
  const src = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : value), [value])
  const sourceSrc = useMemo(() => (source ? URL.createObjectURL(source.file) : null), [source])
  useEffect(() => () => {
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src)
  }, [src])
  useEffect(() => () => {
    if (sourceSrc) URL.revokeObjectURL(sourceSrc)
  }, [sourceSrc])

  async function shrink(file: File, duration: number, from: number) {
    setError("")
    setShrinking(0)
    try {
      onChange(await preparePreviewVideo(file, duration, from, setShrinking))
      setSource(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상을 담지 못했어요.")
    } finally {
      setShrinking(null)
    }
  }

  async function pick(list: FileList | null) {
    const file = list?.[0]
    if (!file) return
    setError("")
    try {
      const duration = await inspectPreviewSource(file)
      if (duration > PREVIEW_MAX_SECONDS + 0.5) {
        setStart(0)
        setSource({ file, duration })
      } else {
        await shrink(file, duration, 0)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상을 담지 못했어요.")
    }
  }

  // 시작 지점을 옮기면 그 10초를 반복해서 보여 준다
  function moveStart(sec: number) {
    setStart(sec)
    if (trimRef.current) trimRef.current.currentTime = sec
  }
  function keepInRange() {
    const v = trimRef.current
    if (v && (v.currentTime >= start + PREVIEW_MAX_SECONDS || v.currentTime < start - 0.5)) v.currentTime = start
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    if (!busy) void pick(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      {source && sourceSrc ? (
        <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-border p-3">
          <video
            ref={trimRef}
            src={sourceSrc}
            muted
            autoPlay
            playsInline
            onTimeUpdate={keepInRange}
            onEnded={() => moveStart(start)}
            className="aspect-video w-full rounded-lg bg-surface object-contain"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span>
              담을 10초 고르기 <span className="text-muted-foreground">
                {clock(start)} ~ {clock(Math.min(start + PREVIEW_MAX_SECONDS, source.duration))}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, source.duration - PREVIEW_MAX_SECONDS)}
              step={0.1}
              value={start}
              onChange={(e) => moveStart(Number(e.target.value))}
              disabled={busy}
              className="w-full accent-primary"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void shrink(source.file, source.duration, start)}
              disabled={busy}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {shrinking !== null ? `줄이는 중… ${Math.round(shrinking * 100)}%` : "이 10초 담기"}
            </button>
            <button
              type="button"
              onClick={() => setSource(null)}
              disabled={busy}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
            >
              취소
            </button>
          </div>
        </div>
      ) : src ? (
        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface">
          <video src={src} muted loop autoPlay playsInline className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="미리보기 영상 빼기"
            className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!busy) setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
          disabled={busy}
          className={cn(
            "flex aspect-video w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background text-muted-foreground transition-colors hover:border-foreground/30 disabled:opacity-50",
            over ? "border-primary bg-brand-muted" : "border-input",
          )}
        >
          <Film className="size-8" aria-hidden />
          {shrinking !== null ? (
            <span className="text-base" aria-live="polite">
              영상 줄이는 중… {Math.round(shrinking * 100)}%
            </span>
          ) : (
            <>
              <span className="text-base">클릭해서 선택 · 끌어다 놓기</span>
              <span className="text-xs">길면 {PREVIEW_MAX_SECONDS}초만 골라 담아요 · 크면 자동으로 줄여요</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files)
          e.target.value = ""
        }}
        disabled={busy}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

/** 초 → "1:05" */
function clock(sec: number) {
  const s = Math.floor(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
