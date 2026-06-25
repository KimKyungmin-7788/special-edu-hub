import { useEffect, useRef, useState, type ReactNode } from "react"
import { HelpCircle } from "lucide-react"

/**
 * 작은 도움말 팝업. "?" 아이콘을 누르면 설명 말풍선이 뜬다.
 * 바깥 클릭 / ESC 로 닫힌다. 의존성 없이 직접 구현, 색은 토큰만.
 * 우측 영역에서도 잘리지 않도록 말풍선은 오른쪽 정렬(right-0)로 펼친다.
 */
export function InfoHint({
  children,
  label = "설명 보기",
}: {
  children: ReactNode
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HelpCircle className="size-4" aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute right-0 top-7 z-20 w-64 rounded-md border border-border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  )
}
