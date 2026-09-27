import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Check, Crop, Maximize, Move, ZoomIn, ZoomOut } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { cn } from "@/lib/utils"

/** 썸네일 출력 규격 — 카드 칸(16:9)과 같은 비율. */
export const THUMB_OUT_W = 1280
export const THUMB_OUT_H = 720
const ASPECT = THUMB_OUT_W / THUMB_OUT_H
const ZOOM_MAX = 4

type Mode = "fill" | "fit"

/**
 * 썸네일 자르기 창 — 어떤 크기의 사진이든 16:9 · 1280×720 으로 맞춰 올린다(라이브러리 없이 직접 구현).
 *  - 채우기(fill): 16:9 틀을 꽉 채운다. 끌어서 보일 위치를 옮기고, 슬라이더·휠로 확대.
 *  - 전체 보이기(fit): 사진을 자르지 않고 가운데에 두고, 남는 여백은 같은 사진을 흐리게 깔아 채운다
 *    (세로·정사각 사진용 — 세로 사진이면 이 모드로 시작).
 * 결과는 WebP(미지원 브라우저는 JPEG)로 압축한 File 로 돌려준다. GIF 는 첫 장면만 남는다.
 */
export function ThumbnailCropper({
  file,
  onCancel,
  onDone,
}: {
  /** 자를 원본 사진. null 이면 닫힘. */
  file: File | null
  onCancel: () => void
  onDone: (result: File) => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("fill")
  const [zoom, setZoom] = useState(1)
  // 보이는 영역의 중심(원본 사진 기준 0~1 비율)
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 })
  const [boxW, setBoxW] = useState(0)
  const [busy, setBusy] = useState(false)
  // 조작 안내(끌기·확대) — 한 번이라도 움직이면 숨긴다 / 끄는 중엔 3등분 격자 표시
  const [touched, setTouched] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)

  // 원본 사진 읽기 + 초기값(세로·정사각이면 '전체 보이기'로 시작)
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImg(image)
      setMode(image.naturalWidth / image.naturalHeight < 1.2 ? "fit" : "fill")
      setZoom(1)
      setCenter({ x: 0.5, y: 0.5 })
      setTouched(false)
    }
    image.onerror = () => setError("사진을 읽지 못했어요. 다른 파일로 시도해 주세요.")
    image.src = url
    setSrc(url)
    setError(null)
    return () => {
      URL.revokeObjectURL(url)
      setImg(null)
      setSrc(null)
    }
  }, [file])

  // 자르기 틀의 실제 너비(화면 크기에 따라 바뀜)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el)
    setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [img])

  const boxH = boxW / ASPECT
  const iw = img?.naturalWidth ?? 1
  const ih = img?.naturalHeight ?? 1
  // 틀을 꽉 채우는 최소 배율 × 확대
  const scale = Math.max(boxW / iw, boxH / ih) * zoom
  const dw = iw * scale
  const dh = ih * scale

  /** 사진이 틀 밖으로 비지 않도록 중심을 제한. */
  function clamp(c: { x: number; y: number }, w = dw, h = dh) {
    const hx = boxW / (2 * w)
    const hy = boxH / (2 * h)
    return {
      x: Math.min(1 - hx, Math.max(hx, c.x)),
      y: Math.min(1 - hy, Math.max(hy, c.y)),
    }
  }

  function setZoomClamped(z: number) {
    const next = Math.min(ZOOM_MAX, Math.max(1, z))
    const s = Math.max(boxW / iw, boxH / ih) * next
    setZoom(next)
    setTouched(true)
    setCenter((c) => clamp(c, iw * s, ih * s))
  }

  // 휠 확대(패시브 리스너로는 preventDefault 가 안 돼 직접 등록)
  useEffect(() => {
    const el = boxRef.current
    if (!el || mode !== "fill") return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      setZoomClamped(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  })

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (mode !== "fill") return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
    setTouched(true)
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    // 끌기 끝(pointerup)을 놓친 경우 — 버튼이 떼어져 있으면 더 움직이지 않는다
    if (e.pointerType === "mouse" && e.buttons === 0) {
      onPointerUp()
      return
    }
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current = { x: e.clientX, y: e.clientY }
    setCenter((c) => clamp({ x: c.x - dx / dw, y: c.y - dy / dh }))
  }
  function onPointerUp() {
    drag.current = null
    setDragging(false)
  }

  async function confirm() {
    if (!img || !file) return
    setBusy(true)
    setError(null)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = THUMB_OUT_W
      canvas.height = THUMB_OUT_H
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("canvas")
      ctx.imageSmoothingQuality = "high"

      if (mode === "fill") {
        const s = Math.max(boxW / iw, boxH / ih) * zoom
        const sw = boxW / s
        const sh = boxH / s
        ctx.drawImage(img, center.x * iw - sw / 2, center.y * ih - sh / 2, sw, sh, 0, 0, THUMB_OUT_W, THUMB_OUT_H)
      } else {
        drawBlurredCover(ctx, img)
        const s = Math.min(THUMB_OUT_W / iw, THUMB_OUT_H / ih)
        const w = iw * s
        const h = ih * s
        ctx.drawImage(img, (THUMB_OUT_W - w) / 2, (THUMB_OUT_H - h) / 2, w, h)
      }

      const blob = await toBlob(canvas)
      const ext = blob.type === "image/webp" ? "webp" : "jpg"
      onDone(new File([blob], `thumbnail.${ext}`, { type: blob.type }))
    } catch {
      setError("사진을 변환하지 못했어요. 다른 파일로 시도해 주세요.")
    } finally {
      setBusy(false)
    }
  }

  const modes: { value: Mode; icon: typeof Crop; title: string; desc: string }[] = [
    { value: "fill", icon: Crop, title: "꽉 채우기", desc: "틀에 맞춰 잘라요" },
    { value: "fit", icon: Maximize, title: "전체 보이기", desc: "자르지 않고 빈 곳은 흐리게" },
  ]

  return (
    <Modal
      open={file != null}
      onClose={onCancel}
      labelledBy="cropper-title"
      className="max-h-[calc(100svh-2rem)] max-w-xl overflow-y-auto"
    >
      <div className="p-6">
        <h2 id="cropper-title" className="text-base font-semibold">
          썸네일 맞추기
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          목록 카드와 같은 16:9 비율로 맞춰 올려요. 먼저 맞추는 방식을 고르세요.
        </p>

        {/* 모드 선택 — 가장 먼저 눈에 들어오도록 큰 카드 두 개 */}
        <div role="radiogroup" aria-label="맞추는 방식" className="mt-4 grid grid-cols-2 gap-2">
          {modes.map((m) => {
            const on = mode === m.value
            const Icon = m.icon
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMode(m.value)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg border-2 px-3.5 py-3 text-left transition-colors",
                  on
                    ? "border-primary bg-brand-soft"
                    : "border-border bg-background hover:border-brand-line hover:bg-brand-soft/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    on ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-semibold", on ? "text-foreground" : "text-foreground/80")}>
                    {m.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">{m.desc}</span>
                </span>
                {on && (
                  <Check className="absolute right-2.5 top-2.5 size-4 text-primary" aria-hidden />
                )}
              </button>
            )
          })}
        </div>

        {/* 자르기 틀 */}
        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onLostPointerCapture={onPointerUp}
          className={cn(
            "relative mt-3 aspect-video w-full touch-none select-none overflow-hidden rounded-lg border border-border bg-surface",
            mode === "fill" && "cursor-grab active:cursor-grabbing",
          )}
        >
          {src && img && mode === "fill" && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: dw,
                height: dh,
                left: boxW / 2 - center.x * dw,
                top: boxH / 2 - center.y * dh,
              }}
            />
          )}
          {/* 끄는 중 — 3등분 격자 */}
          {mode === "fill" && dragging && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-background/70" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-background/70" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-background/70" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-background/70" />
            </div>
          )}
          {/* 조작 안내 — 처음 한 번, 움직이면 사라짐 */}
          {mode === "fill" && img && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-opacity duration-300",
                touched ? "opacity-0" : "opacity-100",
              )}
            >
              <span className="inline-flex items-center gap-3 rounded-full bg-foreground/75 px-3.5 py-1.5 text-xs font-medium text-background">
                <span className="inline-flex items-center gap-1">
                  <Move className="size-3.5" />
                  끌어서 위치 이동
                </span>
                <span className="h-3 w-px bg-background/40" />
                <span className="inline-flex items-center gap-1">
                  <ZoomIn className="size-3.5" />
                  아래 막대·휠로 확대
                </span>
              </span>
            </div>
          )}
          {src && img && mode === "fit" && (
            <>
              <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl" />
              <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
            </>
          )}
          {!img && !error && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              불러오는 중…
            </p>
          )}
        </div>

        {/* 확대 — 보조 조작이라 차분하게 */}
        {mode === "fill" && (
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">
            <button
              type="button"
              aria-label="축소"
              onClick={() => setZoomClamped(zoom - 0.2)}
              className="rounded-md p-1 hover:bg-accent hover:text-foreground"
            >
              <ZoomOut className="size-4" aria-hidden />
            </button>
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoomClamped(Number(e.target.value))}
              aria-label="확대"
              className="h-1 flex-1 accent-muted-foreground"
            />
            <button
              type="button"
              aria-label="확대"
              onClick={() => setZoomClamped(zoom + 0.2)}
              className="rounded-md p-1 hover:bg-accent hover:text-foreground"
            >
              <ZoomIn className="size-4" aria-hidden />
            </button>
            <span className="w-10 text-right text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!img || busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "맞추는 중…" : "이대로 쓰기"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * 틀 전체를 사진으로 덮고 흐리게 — 아주 작게 줄였다 키우는 방식이라
 * canvas filter 를 지원하지 않는 브라우저(Safari 일부)에서도 똑같이 흐려진다.
 */
function drawBlurredCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const tiny = document.createElement("canvas")
  tiny.width = 32
  tiny.height = 18
  const t = tiny.getContext("2d")
  if (!t) return
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const s = Math.max(32 / iw, 18 / ih)
  t.drawImage(img, (32 - iw * s) / 2, (18 - ih * s) / 2, iw * s, ih * s)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(tiny, 0, 0, THUMB_OUT_W, THUMB_OUT_H)
}

/** WebP 로 압축(미지원이면 JPEG). */
function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  return encode("image/webp").then(async (b) => {
    if (b && b.type === "image/webp") return b
    const jpg = await encode("image/jpeg")
    if (!jpg) throw new Error("encode")
    return jpg
  })
}
