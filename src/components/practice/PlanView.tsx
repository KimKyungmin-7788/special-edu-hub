import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, ListOrdered, NotebookPen, Users } from "lucide-react"
import { planText } from "@/config/practice"
import { lookupStandards, type StandardLite } from "@/lib/standards"
import type { App } from "@/lib/apps"
import { PLAN_LEVELS, type PracticePlan } from "@/lib/practices"
import { PlanBar, PlanDivider, PlanGroupsView, PlanLessonsView, PlanRow, PlanTable } from "@/components/practice/PlanTable"

/** 사례 상세 — 지도안 양식 글을 쓰기 화면과 같은 표로 보여 준다. 빈 칸 줄은 숨긴다. */
export function PlanView({ plan, apps }: { plan: PracticePlan; apps: App[] }) {
  const [standards, setStandards] = useState<StandardLite[]>([])

  useEffect(() => {
    let alive = true
    if (plan.standards.length)
      lookupStandards(plan.standards)
        .then((l) => alive && setStandards(l))
        .catch(() => {})
    return () => {
      alive = false
    }
  }, [plan.standards])

  const appById = new Map(apps.map((a) => [a.id, a]))
  const toolLabel = (v: string) => {
    if (v.startsWith("app:")) {
      const a = appById.get(v.slice(4))
      return a ? (
        <Link to={`/app/${a.id}`} className="rounded-full bg-brand-muted px-2 py-0.5 text-xs text-brand-muted-foreground hover:underline">
          {a.title}
        </Link>
      ) : null
    }
    return <span className="rounded-full border border-border px-2 py-0.5 text-xs">{v.slice(5)}</span>
  }
  const tools = [...apps.map((a) => `app:${a.id}`), ...plan.tools.map((t) => `tool:${t}`)]
  const text = (v: string) => <p className="whitespace-pre-line px-3 py-2.5">{v}</p>

  const table = (
    <PlanTable>
      <PlanBar icon={ClipboardList}>{planText.bars.head}</PlanBar>
      {plan.unit && <PlanRow label={planText.unit}>{text(plan.unit)}</PlanRow>}
      {plan.standards.length > 0 && (
        <PlanRow label={planText.standards}>
          <ul className="flex flex-col gap-1.5 px-3 py-2.5">
            {plan.standards.map((code) => {
              const s = standards.find((x) => x.code === code)
              return (
                <li key={code}>
                  <span className="font-mono font-semibold">{code}</span> {s?.text}
                </li>
              )
            })}
          </ul>
        </PlanRow>
      )}
      <PlanRow label={planText.goals}>
        <div className="divide-y divide-border">
          {PLAN_LEVELS.map((l) => (
            <div key={l} className="grid grid-cols-[2.75rem_minmax(0,1fr)]">
              <div className="flex items-center justify-center bg-surface font-semibold">{l}</div>
              {text(plan.goals[l])}
            </div>
          ))}
        </div>
      </PlanRow>
      {tools.length > 0 && (
        <PlanRow label={planText.tools}>
          <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
            {tools.map((t) => (
              <span key={t}>{toolLabel(t)}</span>
            ))}
          </div>
        </PlanRow>
      )}

      {plan.groups.some((g) => g.performance || g.content || g.method || g.highTouch) && (
        <>
          <PlanBar icon={Users}>{planText.bars.groups}</PlanBar>
          <PlanGroupsView groups={plan.groups} />
        </>
      )}

      <PlanBar icon={ListOrdered}>
        {planText.bars.lessons} · {plan.lessons.length}차시
      </PlanBar>
      <PlanLessonsView lessons={plan.lessons} toolLabel={toolLabel} />
      {plan.evaluation && <PlanRow label={planText.evaluation}>{text(plan.evaluation)}</PlanRow>}

    </PlanTable>
  )
  if (!plan.reaction && !plan.reflection) return table
  return (
    <div className="flex flex-col gap-6">
      {table}
      <PlanDivider>{planText.recordIntro}</PlanDivider>
      <PlanTable>
        <PlanBar icon={NotebookPen} tone="record">
          {planText.bars.record}
        </PlanBar>
        {plan.reaction && <PlanRow label={planText.reaction}>{text(plan.reaction)}</PlanRow>}
        {plan.reflection && <PlanRow label={planText.reflection}>{text(plan.reflection)}</PlanRow>}
      </PlanTable>
    </div>
  )
}
