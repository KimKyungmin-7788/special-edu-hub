import { useState } from "react"
import { Check, Copy, LifeBuoy } from "lucide-react"
import type { StepHelp } from "../steps"

export function HelpPrompt({
  items,
  where,
}: {
  items: StepHelp[]
  where: string
}) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const current = items[active]

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <LifeBuoy aria-hidden className="size-4 text-primary" />
        막혔나요?
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        상황을 고르고 프롬프트를 복사해서 {where}에 붙여 넣어요.
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="tablist">
        {items.map((item, i) => (
          <button
            key={item.situation}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => {
              setActive(i)
              setCopied(false)
            }}
            className={
              "rounded-full border px-3.5 py-1 text-sm transition-colors " +
              (i === active
                ? "border-foreground bg-accent font-semibold"
                : "text-muted-foreground hover:bg-accent")
            }
          >
            {item.situation}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-xl border bg-surface">
        <p className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
          {current.prompt}
        </p>
        <div className="flex justify-end border-t px-3 py-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {copied ? (
              <Check aria-hidden className="size-4 text-primary" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            <span aria-live="polite">
              {copied ? "복사했어요" : "프롬프트 복사"}
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
