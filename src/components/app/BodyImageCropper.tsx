import { useEffect, useId, useRef, useState, type PointerEvent } from "react"
import { Modal } from "@/components/ui/Modal"

/** 본문 사진은 썸네일과 달리 자유로운 비율로 자른다. 좌표는 원본 대비 백분율. */
export function BodyImageCropper({ src, onCancel, onDone }: {
  src: string
  onCancel: () => void
  onDone: (file: File) => Promise<void>
}) {
  const titleId = useId()
  const imageRef = useRef<HTMLImageElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [rect, setRect] = useState({ x: 0, y: 0, w: 100, h: 100 })
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  function point(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, (e.clientX - box.left) / box.width * 100)),
      y: Math.max(0, Math.min(100, (e.clientY - box.top) / box.height * 100)),
    }
  }

  async function apply() {
    const image = imageRef.current
    if (!ready || !image || busy) return
    setBusy(true)
    setError("")
    try {
      const sw = image.naturalWidth * rect.w / 100
      const sh = image.naturalHeight * rect.h / 100
      const scale = Math.min(1, 1600 / Math.max(sw, sh))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(sw * scale))
      canvas.height = Math.max(1, Math.round(sh * scale))
      const context = canvas.getContext("2d")
      if (!context) throw new Error("사진을 처리할 수 없습니다.")
      context.drawImage(image, image.naturalWidth * rect.x / 100, image.naturalHeight * rect.y / 100,
        sw, sh, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85))
      if (!blob) throw new Error("사진을 변환하지 못했습니다.")
      await onDone(new File([blob], "cropped-image.webp", { type: blob.type }))
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : "자르지 못했습니다. 다시 시도해 주세요.")
    } finally {
      if (active.current) setBusy(false)
    }
  }

  return (
    <Modal open onClose={() => { if (!busy) onCancel() }} labelledBy={titleId} className="max-w-xl max-h-[calc(100svh-2rem)] overflow-y-auto">
      <div className="p-6">
        <h2 id={titleId} className="text-base font-semibold">본문 사진 자르기</h2>
        <p className="mt-2 text-sm text-muted-foreground">사진 위를 드래그해 남길 영역을 선택하세요. 아래 막대로도 조절할 수 있어요. 움직이는 사진은 한 장의 이미지로 저장됩니다.</p>
        <div className="mt-4 flex justify-center">
          <div className="relative max-w-full touch-none select-none overflow-hidden rounded-md bg-surface"
            onPointerDown={(e) => {
              if (!ready || busy) return
              e.currentTarget.setPointerCapture(e.pointerId)
              start.current = point(e)
            }}
            onPointerMove={(e) => {
              if (!start.current) return
              const end = point(e)
              const x = Math.min(start.current.x, end.x)
              const y = Math.min(start.current.y, end.y)
              setRect({ x: Math.min(99, x), y: Math.min(99, y), w: Math.max(1, Math.abs(end.x - start.current.x)), h: Math.max(1, Math.abs(end.y - start.current.y)) })
            }}
            onPointerUp={() => { start.current = null }}
            onPointerCancel={() => { start.current = null }}
            onLostPointerCapture={() => { start.current = null }}>
            <img ref={imageRef} src={src} crossOrigin="anonymous" alt="자를 사진" draggable={false}
              className="block max-h-80 max-w-full h-auto w-auto"
              onLoad={() => setReady(true)} onError={() => setError("사진을 읽지 못했습니다. 외부 사진이라면 파일로 저장한 뒤 다시 넣어 주세요.")} />
            {ready && <div aria-hidden className="pointer-events-none absolute border-2 border-primary bg-primary/10"
              style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }} />}
          </div>
        </div>
        <fieldset disabled={!ready || busy} className="mt-4 grid grid-cols-2 gap-3">
          {([
            ["x", "왼쪽 위치", 0, 100 - rect.w], ["y", "위쪽 위치", 0, 100 - rect.h],
            ["w", "남길 너비", 1, 100 - rect.x], ["h", "남길 높이", 1, 100 - rect.y],
          ] as const).map(([key, label, min, max]) => (
            <label key={key} className="flex flex-col gap-1 text-xs text-muted-foreground">
              {label} {Math.round(rect[key])}%
              <input type="range" min={min} max={max} step={0.1} value={rect[key]}
                onChange={(e) => setRect((r) => ({ ...r, [key]: Number(e.target.value) }))} className="w-full accent-primary" />
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50">취소</button>
          <button type="button" disabled={!ready || busy} onClick={() => void apply()} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "사진 적용 중…" : "잘라서 적용"}</button>
        </div>
      </div>
    </Modal>
  )
}
