import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Search, X } from "lucide-react"
import { getApps, displayTitle, type App } from "@/lib/apps"
import { AppThumbnail } from "@/components/app/AppThumbnail"
import {
  PRACTICE_APPS_MAX,
  PRACTICE_APP_NOTE_MAX,
  type PracticeAppLink,
} from "@/lib/practices"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/**
 * "이 수업에서 쓴 학습자료" 고르기 — 등록된 앱을 제목으로 찾아 붙인다.
 * 붙인 앱마다 "이렇게 썼어요" 한 줄(선택)·순서 바꾸기·빼기.
 * 앱 목록은 공개 앱 전체를 한 번 불러와 화면에서 거른다(수가 적음).
 */
export function AppLinkPicker({
  value,
  onChange,
  disabled,
}: {
  value: PracticeAppLink[]
  onChange: (v: PracticeAppLink[]) => void
  disabled?: boolean
}) {
  const [apps, setApps] = useState<App[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    getApps().then(setApps)
  }, [])

  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps])
  const chosen = new Set(value.map((v) => v.appId))

  const q = query.trim().toLowerCase()
  const results =
    q === ""
      ? []
      : apps
          .filter((a) => !chosen.has(a.id))
          .filter((a) => `${a.title} ${a.summary}`.toLowerCase().includes(q))
          .slice(0, 8)

  function add(id: string) {
    if (value.length >= PRACTICE_APPS_MAX) return
    onChange([...value, { appId: id, note: "" }])
    setQuery("")
  }

  function move(i: number, d: -1 | 1) {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((v, i) => {
            const app = byId.get(v.appId)
            return (
              <li
                key={v.appId}
                className="flex items-start gap-3 rounded-md border border-border p-2"
              >
                <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-surface">
                  {app && <AppThumbnail app={app} iconClassName="size-5" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="truncate text-sm font-medium">
                    {app ? displayTitle(app) : "불러오는 중…"}
                  </p>
                  <input
                    className={inputClass + " py-1.5"}
                    placeholder="이렇게 썼어요 (선택, 예: 도입에서 오늘 날짜 확인)"
                    value={v.note}
                    onChange={(e) =>
                      onChange(
                        value.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                note: Array.from(e.target.value)
                                  .slice(0, PRACTICE_APP_NOTE_MAX)
                                  .join(""),
                              }
                            : x,
                        ),
                      )
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="flex shrink-0 flex-col">
                  <IconButton label="위로" onClick={() => move(i, -1)} disabled={disabled || i === 0}>
                    <ArrowUp className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label="아래로"
                    onClick={() => move(i, 1)}
                    disabled={disabled || i === value.length - 1}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label="빼기"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    disabled={disabled}
                  >
                    <X className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {value.length < PRACTICE_APPS_MAX ? (
        <div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={inputClass + " pl-9"}
              placeholder="자료 이름으로 찾기"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
            />
          </div>
          {q !== "" && (
            <ul className="mt-1 flex flex-col overflow-hidden rounded-md border border-border bg-card">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  찾는 자료가 없어요.
                </li>
              ) : (
                results.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => add(a.id)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="relative aspect-video w-14 shrink-0 overflow-hidden rounded bg-surface">
                        <AppThumbnail app={a} iconClassName="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{displayTitle(a)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          자료는 {PRACTICE_APPS_MAX}개까지 붙일 수 있어요.
        </p>
      )}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  )
}
