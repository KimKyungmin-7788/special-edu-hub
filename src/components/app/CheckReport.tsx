import { useEffect, useState } from "react"
import { Check, Copy, ListChecks } from "lucide-react"
import { DetailSection } from "@/components/app/DetailSection"
import { Emphasis } from "@/components/ui/Emphasis"
import { GuideLink } from "@/components/app/GuideLink"
import { criteriaSource, criterionStateText, evaluateCriteria, type CriterionResult, type CriterionState, type Todo, type TodoLevel, todoLevelText } from "@/config/criteria"
import { getAppChecks, getSafety, type AppCheck, type Safety } from "@/lib/safety"
import { cn } from "@/lib/utils"

const TONE: Record<CriterionState, string> = {
  attention: "text-destructive",
  ok: "text-brand-muted-foreground",
  self: "text-foreground",
  na: "text-brand-muted-foreground",
  recommend: "text-muted-foreground",
}

/**
 * 자동 점검 결과(작성자·운영진만 — 점검 기록은 RLS 로 그 사람들에게만 읽힌다).
 * 고칠 것(실제로 찾은 문제)·확인할 것(조건에 따른 의무)·권장을 번호로 먼저 보여 주고, 항목마다 AI 에게 붙여 넣을 프롬프트를 펼쳐 복사하게 한다.
 * KERIS 필수기준 9개 항목은 펼쳐 보기. 점검 기록이 없으면 아무것도 그리지 않는다.
 * bare = 운영진 탭처럼 테두리 없이 넣을 때.
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

  let body
  if (!ev) {
    body = (
      <div className="text-sm">
        <p className="font-semibold">확인 못 했어요</p>
        <p className="mt-1 text-muted-foreground">
          이 앱은 누리집이 파일을 받아 볼 수 없어 점검하지 못했어요. 안전하다는 뜻은 아니에요.
        </p>
      </div>
    )
  } else {
    const levels: TodoLevel[] = ["fix", "check", "recommend"]
    const counts = levels
      .map((l) => [l, ev.todos.filter((t) => t.level === l).length] as const)
      .filter(([, n]) => n > 0)
      .map(([l, n]) => `${todoLevelText[l]} ${n}개`)
    const head = counts.length ? counts.join(" · ") : "✓ 점검에서 고칠 것이 없었어요"
    body = (
      <div className="text-sm">
        <p className={cn("font-semibold", counts.length === 0 && "text-brand-muted-foreground")}>{head}</p>
        <p className="mt-1 text-muted-foreground">
          <Emphasis text={ev.summary} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          기준: <GuideLink />
        </p>

        {ev.todos.length > 0 && (
          <ol className="mt-3 divide-y divide-border border-y border-border">
            {ev.todos.map((t, i) => (
              <TodoRow key={t.text} todo={t} n={i + 1} />
            ))}
          </ol>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-muted-foreground underline">9개 기준 모두 보기</summary>
          <dl className="mt-2 divide-y divide-border">
            {groupResults([...ev.results, ev.baseline]).map((r) => (
              <ResultRow key={r.id} r={r} />
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            <GuideLink /> · {data.check.createdAt.slice(0, 10)} 점검. 기본 보안은 가이드 기준 밖의 권장 항목입니다.{" "}
            {criteriaSource.caveat}
          </p>
        </details>
      </div>
    )
  }

  return bare ? body : (
    <DetailSection icon={ListChecks} title="자동 점검 결과">
      {body}
    </DetailSection>
  )
}

function TodoRow({ todo, n }: { todo: Todo; n: number }) {
  const [copied, setCopied] = useState(false)
  const fix = todo.level === "fix"

  async function copy() {
    try {
      await navigator.clipboard.writeText(todo.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <li className="py-2.5">
      <div className="flex gap-3">
        <span className={cn("w-4 shrink-0 font-semibold", fix ? "text-destructive" : "text-muted-foreground")}>{n}</span>
        <span>
          <span
            className={cn(
              "mr-1.5 rounded-full border px-1.5 py-px text-xs",
              fix ? "border-destructive text-destructive" : "border-border text-muted-foreground",
            )}
          >
            {todoLevelText[todo.level]}
          </span>
          <Emphasis text={todo.text} /> <span className="text-xs text-muted-foreground">({todo.ids.join("·")})</span>
        </span>
      </div>
      <details className="ml-7 mt-1.5">
        <summary className="cursor-pointer text-xs text-muted-foreground underline">AI에게 맡길 프롬프트</summary>
        <div className="mt-1.5 rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Claude·Codex·ChatGPT 등에 붙여 넣기</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium hover:bg-accent"
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-keep px-3 py-2 font-sans text-xs leading-relaxed">{todo.prompt}</pre>
        </div>
      </details>
    </li>
  )
}

const ORDER: CriterionState[] = ["ok", "na", "attention", "self", "recommend"]

/**
 * 펼쳐 보기 목록: 좋은 것부터, '걱정 없어요'가 셋 이상(학생 정보를 안 보내는 앱)이면 한 줄로 묶는다
 * (같은 문장이 줄마다 되풀이되지 않게).
 */
function groupResults(list: CriterionResult[]): CriterionResult[] {
  const na = list.filter((r) => r.state === "na")
  const rest = list.filter((r) => r.state !== "na")
  const merged: CriterionResult[] =
    na.length > 2
      ? [
          {
            id: `${na[0].id}~${na[na.length - 1].id}`,
            title: `개인정보 기준 ${na.length}개`,
            state: "na",
            note: "학생 정보나 외부로 보내는 주소를 찾지 못해 챙길 필요가 없어요.",
          },
        ]
      : na
  return [...rest, ...merged].sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state))
}

function ResultRow({ r }: { r: CriterionResult }) {
  return (
    <div className="grid gap-x-3 gap-y-0.5 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <dt className={cn("font-medium", TONE[r.state])}>
        {(r.state === "ok" || r.state === "na") && "✓ "}
        {criterionStateText[r.state]}
      </dt>
      <dd>
        <span className="font-medium">
          {r.id} · {r.title}
        </span>
        <span className="block text-muted-foreground">
          <Emphasis text={r.note} />
        </span>
      </dd>
    </div>
  )
}
