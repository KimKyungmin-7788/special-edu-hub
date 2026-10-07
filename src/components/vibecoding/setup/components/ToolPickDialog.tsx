import { useEffect, useRef } from "react"
import { ArrowRight, X } from "lucide-react"
import { TOOL_NAME, type Tool } from "../steps"
import { CHOICES } from "./Landing"

/** 도구를 고르기 전에 목차를 누르면, 먼저 둘 중 하나를 고르게 해요. */
export function ToolPickDialog({
  open,
  onPick,
  onClose,
}: {
  open: boolean
  onPick: (tool: Tool) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="tool-pick-title"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="tool-pick-title" className="text-xl font-bold">
              무엇을 사용 중인가요?
            </h2>
            <p className="mt-1 text-[15px] text-muted-foreground">
              고르면 단계 안내가 그 도구에 맞게 바뀌어요. Claude 또는 ChatGPT
              유료 계정이 필요해요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CHOICES.map((c) => (
            <button
              key={c.tool}
              type="button"
              onClick={() => onPick(c.tool)}
              className="group flex items-center justify-between gap-3 rounded-2xl border-2 bg-background px-5 py-5 text-left shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md active:scale-95 motion-safe:hover:-translate-y-0.5"
            >
              <span>
                <span className="block text-2xl font-bold tracking-tight group-hover:text-primary">
                  {c.service}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {c.plan} · {TOOL_NAME[c.tool]}
                </span>
              </span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ArrowRight aria-hidden className="size-5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
