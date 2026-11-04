import { useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { ArrowUp, Film, X } from "lucide-react"
import { inspectPreviewSource, preparePreviewVideo, PREVIEW_MAX_SECONDS, type PreviewSegment } from "@/lib/apps"
import { cn } from "@/lib/utils"

/**
 * 미리보기 영상 칸(53) — 목록 카드에 마우스를 올리면 재생되는 짧은 영상 1개(선택).
 * 값: 새로 고른 영상(File) · 이미 올린 영상 주소(string) · 없음(null). 실제 업로드는 저장할 때 WriteForm 이 한다.
 * 화면 녹화 원본(크거나 맥 .mov)은 고를 때 브라우저 안에서 작게 줄여 담는다.
 * 15초(PREVIEW_MAX_SECONDS)보다 길면 컷 편집 화면에서 장면 여러 개를 골라 순서대로 이어 붙여 담는다.
 * 소리는 재생할 때 항상 끈다.
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
  const [error, setError] = useState("")
  const [over, setOver] = useState(false)
  // 줄이는 중이면 진행률(0~1), 아니면 null
  const [shrinking, setShrinking] = useState<number | null>(null)
  // 담을 길이보다 긴 원본 — 장면을 고르는 중
  const [source, setSource] = useState<{ file: File; duration: number } | null>(null)
  const busy = disabled || shrinking !== null
  // 새로 고른 파일은 임시 주소로 미리 본다
  const src = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : value), [value])
  useEffect(() => () => {
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src)
  }, [src])

  async function shrink(file: File, duration: number, segments: PreviewSegment[]) {
    setError("")
    setShrinking(0)
    try {
      onChange(await preparePreviewVideo(file, duration, segments, setShrinking))
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
      if (duration > PREVIEW_MAX_SECONDS + 0.5) setSource({ file, duration })
      else await shrink(file, duration, [[0, duration]])
    } catch (e) {
      setError(e instanceof Error ? e.message : "영상을 담지 못했어요.")
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    if (!busy) void pick(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      {source ? (
        <CutEditor
          file={source.file}
          duration={source.duration}
          shrinking={shrinking}
          disabled={busy}
          onDone={(segments) => void shrink(source.file, source.duration, segments)}
          onCancel={() => setSource(null)}
        />
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
              <span className="text-xs">길면 장면을 골라 {PREVIEW_MAX_SECONDS}초로 담아요 · 크면 자동으로 줄여요</span>
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

/**
 * 컷 편집 — 원본을 보며 [시작]·[끝] 버튼으로 장면을 고르고(막대를 눌러 위치 이동),
 * 장면 목록에서 순서를 바꾸거나 뺀 뒤 이어 붙여 담는다. 합계는 PREVIEW_MAX_SECONDS 이내.
 */
function CutEditor({
  file,
  duration,
  shrinking,
  disabled,
  onDone,
  onCancel,
}: {
  file: File
  duration: number
  shrinking: number | null
  disabled: boolean
  onDone: (segments: PreviewSegment[]) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [pos, setPos] = useState(0)
  const [start, setStart] = useState<number | null>(null)
  const [segments, setSegments] = useState<PreviewSegment[]>([])
  const [message, setMessage] = useState("")
  // 미리 보기 중이면 재생할 장면 목록과 지금 장면 번호
  const preview = useRef<{ list: PreviewSegment[]; index: number } | null>(null)

  const total = segments.reduce((sum, [s, e]) => sum + (e - s), 0)

  function seek(sec: number) {
    preview.current = null
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(duration, sec))
  }

  function markEnd() {
    const v = videoRef.current
    if (!v) return
    const end = Math.round(v.currentTime * 10) / 10
    if (start === null) return setMessage("먼저 [ 시작을 눌러 주세요.")
    if (end <= start) return setMessage("끝은 시작보다 뒤여야 해요.")
    if (total + (end - start) > PREVIEW_MAX_SECONDS + 0.05)
      return setMessage(`합계가 ${PREVIEW_MAX_SECONDS}초를 넘어요. 구간을 줄이거나 다른 장면을 빼 주세요.`)
    setSegments([...segments, [start, end]])
    setStart(null)
    setMessage("")
  }

  function playList(list: PreviewSegment[]) {
    const v = videoRef.current
    if (!v || list.length === 0) return
    preview.current = { list, index: 0 }
    v.currentTime = list[0][0]
    void v.play()
  }

  // 재생 위치를 따라가고, 미리 보기 중이면 장면 끝에서 다음 장면으로 건너뛴다
  function onTime() {
    const v = videoRef.current
    if (!v) return
    setPos(v.currentTime)
    const p = preview.current
    if (!p) return
    if (v.currentTime >= p.list[p.index][1]) {
      p.index += 1
      if (p.index >= p.list.length) {
        preview.current = null
        v.pause()
      } else {
        v.currentTime = p.list[p.index][0]
      }
    }
  }

  function moveUp(i: number) {
    const next = [...segments]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    setSegments(next)
  }

  const pct = (sec: number) => `${(sec / duration) * 100}%`

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-border p-3">
      <video
        ref={videoRef}
        src={url}
        muted
        playsInline
        controls
        onTimeUpdate={onTime}
        onSeeked={onTime}
        className="aspect-video w-full rounded-lg bg-surface object-contain"
      />

      {/* 막대 — 누르면 그 위치로. 고른 장면은 초록, 고르는 중인 구간은 노랑 점선 */}
      <div>
        <div
          role="slider"
          aria-label="재생 위치"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(pos)}
          tabIndex={0}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            seek(((e.clientX - r.left) / r.width) * duration)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") seek(pos - 1)
            if (e.key === "ArrowRight") seek(pos + 1)
          }}
          className="relative h-7 cursor-pointer rounded-md bg-surface outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {segments.map(([s, e], i) => (
            <div
              key={`${s}-${e}`}
              className="absolute inset-y-0 rounded border border-primary/60 bg-brand-muted"
              style={{ left: pct(s), width: pct(e - s) }}
            >
              <span className="absolute left-1 top-1 text-xs font-bold text-brand-muted-foreground">{i + 1}</span>
            </div>
          ))}
          {start !== null && pos > start && (
            <div
              className="absolute inset-y-0 rounded border border-dashed border-cta bg-cta/20"
              style={{ left: pct(start), width: pct(pos - start) }}
            />
          )}
          <div className="absolute -inset-y-1 w-0.5 rounded bg-foreground" style={{ left: pct(pos) }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>지금 {clock(pos)}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <SmallButton onClick={() => { setStart(Math.round(pos * 10) / 10); setMessage("") }} disabled={disabled}>
          {start === null ? "[ 지금 위치를 시작으로" : `[ 시작 ${clock(start)} (다시 누르면 바꿈)`}
        </SmallButton>
        <SmallButton onClick={markEnd} disabled={disabled}>
          지금 위치를 끝으로 ]
        </SmallButton>
        <SmallButton
          onClick={() => playList(start !== null && pos > start ? [[start, pos]] : segments)}
          disabled={disabled || (segments.length === 0 && start === null)}
        >
          ▶ 미리 보기
        </SmallButton>
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}

      <div>
        <p className="text-sm font-medium">담을 장면</p>
        {segments.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            영상을 보다가 [ 시작과 끝 ]을 눌러 장면을 고르세요. 여러 장면을 고르면 순서대로 이어 붙여요.
          </p>
        ) : (
          <ol className="mt-1 divide-y divide-border text-sm">
            {segments.map(([s, e], i) => (
              <li key={`${s}-${e}`} className="flex items-center gap-2 py-1.5">
                <span className="w-4 font-bold text-primary">{i + 1}</span>
                <button type="button" onClick={() => seek(s)} className="hover:underline">
                  {clock(s)} ~ {clock(e)}
                </button>
                <span className="text-xs text-muted-foreground">({Math.round((e - s) * 10) / 10}초)</span>
                <span className="ml-auto flex gap-1">
                  {i > 0 && (
                    <IconButton label={`${i + 1}번 장면을 위로`} onClick={() => moveUp(i)} disabled={disabled}>
                      <ArrowUp className="size-3.5" aria-hidden />
                    </IconButton>
                  )}
                  <IconButton
                    label={`${i + 1}번 장면 빼기`}
                    onClick={() => setSegments(segments.filter((_, j) => j !== i))}
                    disabled={disabled}
                  >
                    <X className="size-3.5" aria-hidden />
                  </IconButton>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">
          합계 <b>{Math.round(total * 10) / 10}</b>초 / {PREVIEW_MAX_SECONDS}초
        </span>
        <button
          type="button"
          onClick={() => onDone(segments)}
          disabled={disabled || segments.length === 0}
          className="ml-auto rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {shrinking !== null ? `줄이는 중… ${Math.round(shrinking * 100)}%` : "이어 붙여 담기"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          취소
        </button>
      </div>
    </div>
  )
}

function SmallButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      {children}
    </button>
  )
}

/** 초 → "1:05" */
function clock(sec: number) {
  const s = Math.floor(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
