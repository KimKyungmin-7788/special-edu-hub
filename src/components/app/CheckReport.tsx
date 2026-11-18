import { useEffect, useState } from "react"
import { ListChecks } from "lucide-react"
import { DetailSection } from "@/components/app/DetailSection"
import { Emphasis } from "@/components/ui/Emphasis"
import { criteriaSource, criterionStateText, evaluateCriteria, type CriterionState } from "@/config/criteria"
import { getAppChecks, getSafety, type AppCheck, type Safety } from "@/lib/safety"
import { cn } from "@/lib/utils"

const TONE: Record<CriterionState, string> = {
  attention: "text-destructive",
  ok: "text-brand-muted-foreground",
  self: "text-foreground",
  na: "text-muted-foreground",
}

/**
 * 자동 점검 결과(작성자·운영진만 — 점검 기록은 RLS 로 그 사람들에게만 읽힌다).
 * 할 일만 번호로 먼저 보여 주고, KERIS 필수기준 9개 항목은 펼쳐 보기로 둔다.
 * 점검 기록이 없으면 아무것도 그리지 않는다. bare = 운영진 탭처럼 테두리 없이 넣을 때.
 */
export function CheckReport({ appId, refreshKey, bare }: { appId: string; refreshKey?: string; bare?: boolean }) {
  const [data, setData] = useState<{ check: AppCheck; safety: Safety | null } | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getAppChecks(appId), getSafety(appId)]).then(([checks, safety]) => {
      if (active) setData(checks[0] ? { check: checks[0], safety } : null)
    })
    return () => {
      active = false
    }
  }, [appId, refreshKey])

  if (!data) return null
  const ev = evaluateCriteria(data.check, data.safety)

  const body = !ev ? (
    <p className="text-sm text-muted-foreground">파일을 받아 볼 수 없어 결과를 내지 못했습니다.</p>
  ) : (
    <div className="text-sm">
      <p className="font-semibold">{ev.todos.length === 0 ? "할 일 없음" : `할 일 ${ev.todos.length}개`}</p>
      <p className="mt-1 text-muted-foreground">
        <Emphasis text={ev.summary} />
      </p>

      {ev.todos.length > 0 && (
        <ol className="mt-3 divide-y divide-border border-y border-border">
          {ev.todos.map((todo, i) => (
            <li key={todo.text} className="flex gap-3 py-2.5">
              <span className="w-4 shrink-0 font-semibold text-destructive">{i + 1}</span>
              <span>
                <Emphasis text={todo.text} />{" "}
                <span className="text-xs text-muted-foreground">({todo.ids.join("·")})</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-muted-foreground underline">9개 기준 모두 보기</summary>
        <dl className="mt-2 divide-y divide-border">
          {ev.results.map((r) => (
            <div key={r.id} className="grid gap-x-3 gap-y-0.5 py-2 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
              <dt className={cn("font-medium", TONE[r.state])}>{criterionStateText[r.state]}</dt>
              <dd>
                <span className="font-medium">
                  {r.id} {r.title}
                </span>
                <span className="block text-muted-foreground">
                  <Emphasis text={r.note} />
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          {criteriaSource.name} · {data.check.createdAt.slice(0, 10)} 점검. {criteriaSource.caveat}
        </p>
      </details>
    </div>
  )

  return bare ? body : (
    <DetailSection icon={ListChecks} title="자동 점검 결과">
      {body}
    </DetailSection>
  )
}
