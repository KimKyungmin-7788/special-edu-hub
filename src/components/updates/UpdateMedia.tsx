import { useEffect, useRef, useState } from "react"
import { MousePointer2 } from "lucide-react"

/**
 * 소식 영상(55) — 자료 카드처럼 마우스를 올리면 소리 없이 반복 재생, 떼면 처음으로.
 * 마우스가 없는 기기(휴대폰·태블릿)는 자동 반복. 움직임 줄이기 설정이면 첫 화면만 보여 준다.
 */
export function UpdateMedia({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [touch, setTouch] = useState(false)

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!still && window.matchMedia("(hover: none)").matches) {
      setTouch(true)
      void ref.current?.play().catch(() => {})
    }
  }, [])

  function enter(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    void ref.current?.play().catch(() => {})
  }
  function leave() {
    const v = ref.current
    if (!v || touch) return
    v.pause()
    v.currentTime = 0
  }

  return (
    <div
      onPointerEnter={enter}
      onPointerLeave={leave}
      className="relative mt-3 aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface"
    >
      {/* #t=0.1 — 재생 전에도 첫 화면이 보이게 */}
      <video
        ref={ref}
        src={`${src}#t=0.1`}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      {!playing && !touch && (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground">
          <MousePointer2 className="size-3.5" aria-hidden />
          마우스를 올려 보세요
        </span>
      )}
    </div>
  )
}
