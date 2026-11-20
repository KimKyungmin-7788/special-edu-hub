import { useId, useState } from "react"
import { HeartHandshake } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { highTouchGroups, highTouchSources } from "@/config/hightouch"
import { cn } from "@/lib/utils"

/**
 * 하이터치 사례 고르기 모달 — 묶음별 사례를 체크해 담으면 그 집단의 하이터치 칸에 한 줄씩 더한다.
 * 이미 칸에 있는 문장은 '담김'으로 보여 주고 다시 넣지 않는다.
 */
export function HighTouchPicker({
  open,
  onClose,
  level,
  current,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  level: string
  current: string
  onAdd: (lines: string[]) => void
}) {
  const titleId = useId()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [only, setOnly] = useState<string | null>(null)
  const existing = new Set(current.split("\n").map((l) => l.trim()).filter(Boolean))

  const toggle = (text: string) =>
    setPicked((cur) => {
      const next = new Set(cur)
      if (next.has(text)) next.delete(text)
      else next.add(text)
      return next
    })

  function close() {
    setPicked(new Set())
    setOnly(null)
    onClose()
  }

  function add() {
    onAdd([...picked])
    close()
  }

  const groups = only ? highTouchGroups.filter((g) => g.id === only) : highTouchGroups

  return (
    <Modal open={open} onClose={close} labelledBy={titleId} className="max-w-3xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="border-b border-border px-5 pb-3 pt-5 pr-12">
          <h2 id={titleId} className="flex items-center gap-1.5 text-lg font-semibold">
            <HeartHandshake className="size-5 text-brand-muted-foreground" aria-hidden />
            하이터치 사례 · {level} 집단
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[{ id: null, title: "전체" }, ...highTouchGroups].map((g) => (
              <button
                key={g.id ?? "all"}
                type="button"
                onClick={() => setOnly(g.id)}
                aria-pressed={only === g.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  only === g.id
                    ? "border-foreground bg-accent font-semibold"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {g.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {groups.map((g) => (
            <section key={g.id} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold">{g.title}</h3>
              {g.note && <p className="mt-1 text-xs text-muted-foreground">{g.note}</p>}
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {g.items.map((it) => {
                  const done = existing.has(it.text)
                  const on = done || picked.has(it.text)
                  return (
                    <li key={it.id}>
                      <label
                        className={cn(
                          "flex h-full cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm",
                          on ? "border-primary bg-brand-muted/50" : "border-border hover:bg-accent",
                          done && "cursor-default opacity-70",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={on}
                          disabled={done}
                          onChange={() => toggle(it.text)}
                        />
                        <span>
                          {it.text}
                          {done && <span className="ml-1 text-xs text-muted-foreground">담김</span>}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                근거:{" "}
                {g.sources.map((k, i) => (
                  <span key={k}>
                    {i > 0 && " · "}
                    <a
                      href={highTouchSources[k].url}
                      target="_blank"
                      rel="noopener"
                      className="underline hover:text-foreground"
                    >
                      {highTouchSources[k].name}
                    </a>
                  </span>
                ))}
              </p>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="text-sm text-muted-foreground">{picked.size}개 고름</span>
          <button
            type="button"
            onClick={add}
            disabled={picked.size === 0}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            담기
          </button>
        </div>
      </div>
    </Modal>
  )
}
