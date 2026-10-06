import { useEffect, useRef } from "react"
import { ExternalLink, X } from "lucide-react"
import type { StepDialog } from "../steps"
import { CommandBox } from "./CommandBox"

export function LinkDialog({
  dialog,
  open,
  onClose,
}: {
  dialog: StepDialog
  open: boolean
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
      aria-labelledby="link-dialog-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <h2
            id="link-dialog-title"
            className="flex items-center gap-2 text-lg font-bold"
          >
            <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
            {dialog.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <ol className="mt-4 space-y-3">
          {dialog.steps.map((text, i) => (
            <li key={text} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-muted-foreground ring-1 ring-brand-line">
                {i + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        {dialog.command && <CommandBox command={dialog.command} />}

        <div className="mt-5 flex items-center justify-between gap-3">
          {dialog.more ? (
            <a
              href={dialog.more.href}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {dialog.more.label}
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(새 탭)</span>
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            확인했어요
          </button>
        </div>
      </div>
    </dialog>
  )
}
