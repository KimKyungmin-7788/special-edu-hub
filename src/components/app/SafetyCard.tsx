import { ShieldCheck } from "lucide-react"
import { DetailSection } from "@/components/app/DetailSection"
import { GuardianNotice } from "@/components/app/SafetyFields"
import { DATA_ITEM_ORDER, safetyText as t } from "@/config/safety"
import { needsGuardianConsent, type Safety } from "@/lib/safety"

/** 자료 상세의 "안전 확인 정보" 카드(67) — 등록 교사가 입력한 내용을 항목·내용 두 칸으로 보여 준다. */
export function SafetyCard({ safety }: { safety: Safety }) {
  const items = DATA_ITEM_ORDER.filter((i) => safety.dataItems.includes(i)).map((i) => {
    if (i === "other") return safety.dataOther
    const opt = t.dataItems.options[i]
    return `${opt.name} (${opt.example})`
  }).filter(Boolean)

  const rows: { label: string; value: string; sub?: string[]; notice?: boolean }[] = []
  if (safety.studentData)
    rows.push({ label: t.studentData.label, value: t.studentData.options[safety.studentData], sub: items })
  if (safety.studentAi !== null)
    rows.push({
      label: t.studentAi.shortLabel,
      value: safety.studentAi ? t.studentAi.yes : t.studentAi.no,
      sub: safety.aiService ? [safety.aiService] : [],
    })
  if (safety.targetAge)
    rows.push({ label: t.targetAge.label, value: t.targetAge.options[safety.targetAge], notice: needsGuardianConsent(safety) })
  if (safety.copyright) rows.push({ label: t.copyright.label, value: t.copyright.options[safety.copyright] })

  return (
    <DetailSection icon={ShieldCheck} title={t.title}>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-x-4 gap-y-1 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-sm">
              <span className="font-medium">{row.value}</span>
              {row.sub?.map((s) => (
                <span key={s} className="mt-0.5 block text-muted-foreground">
                  {s}
                </span>
              ))}
              {row.notice && <GuardianNotice className="mt-2" />}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        {t.confirmedBy}
        {safety.createdAt && ` · ${safety.createdAt.slice(0, 10)}`}
      </p>
    </DetailSection>
  )
}
