import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 경량 모달 (2단계 묶음 C) — 의존성 없이 직접 구현.
 * 백드롭 딤 + 흐림, ESC 닫기, 포커스 트랩, 스크롤 락, 포커스 복원.
 * 색·반경은 전부 토큰(bg-popover / border-border / bg-foreground 알파 등).
 *
 * 접근성: role="dialog" aria-modal, labelledBy 로 제목 연결.
 * shadcn Dialog 대신 이 한 컴포넌트로 모달 동작을 모은다(트리거 통일과 짝).
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type ModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 패널 제목 요소의 id (aria-labelledby) */
  labelledBy?: string
  className?: string
}

export function Modal({ open, onClose, children, labelledBy, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // 최신 onClose 를 effect 재구독 없이 참조
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const prevActive = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden" // 배경 스크롤 락

    const panel = panelRef.current
    // 열릴 때 패널 내부 첫 포커서블(없으면 패널)로 포커스 이동
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== "Tab") return

      const nodes = panel?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) {
        e.preventDefault() // 포커스가 모달 밖으로 새지 않도록
        return
      }
      const list = Array.from(nodes)
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const active = document.activeElement
      const inside = panel?.contains(active ?? null)

      if (e.shiftKey) {
        if (active === firstEl || !inside) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        if (active === lastEl || !inside) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = prevOverflow
      prevActive?.focus?.() // 닫힐 때 트리거로 포커스 복원
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 백드롭: 딤 + 흐림. 클릭 시 닫기. 색은 foreground 토큰 파생 알파. */}
      <div
        className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* 패널 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-sm rounded-xl border border-border bg-popover text-popover-foreground shadow-xl outline-none",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
