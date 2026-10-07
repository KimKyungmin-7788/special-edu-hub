import { useEffect, useRef, useState } from "react"
import { Check, Copy, LifeBuoy, X } from "lucide-react"
import { RESCUE } from "../steps"

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 클립보드 권한이 없을 때(오래된 브라우저 등) 예전 방식으로 한 번 더 시도해요.
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    // 창(dialog) 안에 붙여야 선택이 돼요.
    ;(document.querySelector("dialog[open]") ?? document.body).appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    area.remove()
    return ok
  }
}

/** 프롬프트 글. [ ] 자리는 눈에 띄게 칠해요. */
function PromptText({ className = "" }: { className?: string }) {
  const parts = RESCUE.prompt.split(/(\[[^\]]+\])/)
  return (
    <p className={"leading-relaxed " + className}>
      {parts.map((part, i) =>
        part.startsWith("[") ? (
          <mark
            key={i}
            className="rounded bg-cta/60 px-1 font-semibold text-cta-foreground"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </p>
  )
}

/** 표지에 두는 만능 프롬프트 칸: 바로 복사해요. */
export function RescueCard() {
  const [copied, setCopied] = useState(false)
  return (
    <section
      aria-labelledby="rescue-card-title"
      className="max-w-xl rounded-2xl bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="rescue-card-title"
          className="flex items-center gap-2 text-base font-bold"
        >
          <LifeBuoy aria-hidden className="size-5 text-primary" />
          {RESCUE.title}
        </h2>
        <button
          type="button"
          onClick={async () => {
            if (await copyText(RESCUE.prompt)) {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            }
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-95"
        >
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? "복사했어요" : "복사"}
        </button>
      </div>
      <PromptText className="mt-3 text-[15px] text-foreground/85" />
      <p className="mt-2 text-xs text-muted-foreground">
        막히면 어느 단계에서든 이 문장을 쓰면 돼요. {RESCUE.tip}
      </p>
    </section>
  )
}

/** 단계마다 두는 작은 버튼. 누르면 창이 열리고, 복사하면 창이 저절로 닫혀요. */
export function RescueButton({ where }: { where: string }) {
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailed(false)
          setOpen(true)
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground/80 transition-all duration-200 hover:border-primary hover:text-primary active:scale-95"
      >
        <LifeBuoy aria-hidden className="size-3.5 text-primary" />
        만능 프롬프트
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        aria-labelledby="rescue-dialog-title"
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="rescue-dialog-title"
                className="flex items-center gap-2 text-lg font-bold"
              >
                <LifeBuoy aria-hidden className="size-5 text-primary" />
                {RESCUE.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                복사해서 {where}에 붙여 넣고, 칠한 자리를 내 상황으로 바꿔요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-surface p-4">
            <PromptText className="text-base" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{RESCUE.tip}</p>

          <div className="mt-5 flex items-center justify-end gap-3">
            {failed && (
              <p role="alert" className="text-sm text-destructive">
                복사가 안 됐어요. 글을 직접 끌어서 복사해 주세요.
              </p>
            )}
            <button
              type="button"
              onClick={async () => {
                if (await copyText(RESCUE.prompt)) setOpen(false)
                else setFailed(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-95"
            >
              <Copy aria-hidden className="size-4" />
              복사하기
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
