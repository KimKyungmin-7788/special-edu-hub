import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

/** 슬라이드 한 장의 실제 크기. 내용은 이 크기에 맞춰 만들고, 화면에는 비율대로 줄이거나 늘려 보여요. */
export const SLIDE_W = 1366
export const SLIDE_H = 768

/**
 * PPT처럼 16:9 한 장을 화면 크기에 맞춰 통째로 확대·축소해요.
 * 그래서 어떤 화면에서도 같은 모습으로 보여요.
 */
export function SlideFrame({
  children,
  footer,
}: {
  children: ReactNode
  footer: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () =>
      setScale(Math.min(el.clientWidth / SLIDE_W, el.clientHeight / SLIDE_H))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={box}
      className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"
    >
      {/* zoom은 글씨를 선명하게 그대로 그리면서 크기만 바꿔요. */}
      <div
        data-slide
        style={{ width: SLIDE_W, height: SLIDE_H, zoom: scale }}
        className="flex shrink-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border"
      >
        <div className="min-h-0 flex-1">{children}</div>
        {footer}
      </div>
    </div>
  )
}
