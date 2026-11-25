import { useEffect, useRef, useState, type PointerEvent } from "react"
import { Undo2 } from "lucide-react"
import { planText } from "@/config/practice"
import { Modal } from "@/components/ui/Modal"

const t = planText.photos
/** 붓 반지름 = 사진 긴 변 × 비율 (작게·보통·크게) */
const BRUSH = [0.03, 0.06, 0.1]

/**
 * 올리기 전 얼굴 모자이크 — 문지른 곳을 칸 단위로 그 칸의 평균색으로 덮는다(새 라이브러리 없이 canvas).
 * 덮은 칸은 원본에서 다시 계산하므로 되돌리기는 마지막 문지르기 한 번을 빼고 다시 그린다.
 * 원본 사진은 저장소에 올라가지 않고, '올리기'를 누르면 모자이크된 canvas 만 넘긴다.
 */
export function PhotoMosaicDialog({
  source,
  busy,
  error,
  onCancel,
  onDone,
}: {
  source: HTMLCanvasElement
  busy: boolean
  error: string | null
  onCancel: () => void
  onDone: (canvas: HTMLCanvasElement) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const orig = useRef<ImageData | null>(null)
  const strokes = useRef<number[][]>([])
  const done = useRef(new Set<number>())
  const last = useRef<{ x: number; y: number } | null>(null)
  const [brush, setBrush] = useState(1)
  const [count, setCount] = useState(0)

  const w = source.width
  const h = source.height
  const block = Math.max(6, Math.round(Math.max(w, h) / 70))
  const cols = Math.ceil(w / block)

  useEffect(() => {
    const ctx = ref.current?.getContext("2d")
    if (!ctx) return
    ctx.drawImage(source, 0, 0)
    orig.current = ctx.getImageData(0, 0, w, h)
  }, [source, w, h])

  function fillCell(ctx: CanvasRenderingContext2D, idx: number) {
    const data = orig.current!.data
    const x0 = (idx % cols) * block
    const y0 = Math.floor(idx / cols) * block
    const x1 = Math.min(x0 + block, w)
    const y1 = Math.min(y0 + block, h)
    let r = 0, g = 0, b = 0, n = 0
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      }
    ctx.fillStyle = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  }

  function paintAt(x: number, y: number) {
    const ctx = ref.current?.getContext("2d")
    const stroke = strokes.current[strokes.current.length - 1]
    if (!ctx || !stroke) return
    const radius = Math.max(w, h) * BRUSH[brush]
    const reach = radius + block / 2
    for (let cy = Math.max(0, Math.floor((y - radius) / block)); cy * block < Math.min(h, y + radius); cy++)
      for (let cx = Math.max(0, Math.floor((x - radius) / block)); cx * block < Math.min(w, x + radius); cx++) {
        const idx = cy * cols + cx
        if (done.current.has(idx)) continue
        if (Math.hypot(cx * block + block / 2 - x, cy * block + block / 2 - y) > reach) continue
        done.current.add(idx)
        stroke.push(idx)
        fillCell(ctx, idx)
      }
  }

  /** 빠르게 문질러도 끊기지 않게 지난 점과 사이를 메운다. */
  function paintTo(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * w) / rect.width
    const y = ((e.clientY - rect.top) * h) / rect.height
    const from = last.current ?? { x, y }
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (block / 2)))
    for (let i = 1; i <= steps; i++) paintAt(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps)
    last.current = { x, y }
  }

  function undo() {
    const ctx = ref.current?.getContext("2d")
    if (!ctx || !orig.current) return
    strokes.current.pop()
    ctx.putImageData(orig.current, 0, 0)
    done.current = new Set(strokes.current.flat())
    for (const idx of done.current) fillCell(ctx, idx)
    setCount(strokes.current.length)
  }

  return (
    <Modal open onClose={() => !busy && onCancel()} labelledBy="photo-mosaic-title" className="max-w-2xl">
      <div className="flex flex-col gap-3 p-4">
        <h2 id="photo-mosaic-title" className="pr-10 text-base font-semibold">
          {t.mosaicTitle}
        </h2>
        <canvas
          ref={ref}
          width={w}
          height={h}
          className="mx-auto block max-h-[60vh] w-auto max-w-full cursor-crosshair touch-none rounded-md bg-surface"
          onPointerDown={(e) => {
            if (busy) return
            e.currentTarget.setPointerCapture(e.pointerId)
            strokes.current.push([])
            last.current = null
            paintTo(e)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) paintTo(e)
          }}
          onPointerUp={() => {
            if (strokes.current.at(-1)?.length === 0) strokes.current.pop()
            last.current = null
            setCount(strokes.current.length)
          }}
        />
        <div className="flex items-center gap-3 text-sm">
          <label htmlFor="photo-mosaic-brush" className="shrink-0 whitespace-nowrap text-muted-foreground">
            {t.brush}
          </label>
          <input
            id="photo-mosaic-brush"
            type="range"
            min={0}
            max={BRUSH.length - 1}
            step={1}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            className="min-w-0 flex-1 accent-primary"
            disabled={busy}
          />
          <button
            type="button"
            onClick={undo}
            disabled={busy || count === 0}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <Undo2 className="size-4" aria-hidden />
            {t.undo}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="whitespace-nowrap rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => ref.current && onDone(ref.current)}
            disabled={busy}
            className="whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t.uploading : t.upload}
          </button>
        </div>
      </div>
    </Modal>
  )
}
