import { Coins, PencilOff, ShieldQuestion, UserCheck } from "lucide-react"
import { FormPanel } from "@/components/form/FormParts"
import { safetyText } from "@/config/safety"
import type { License } from "@/lib/safety"
import { cn } from "@/lib/utils"

const t = safetyText.license
export const LICENSE_ORDER: License[] = ["by", "by_nc", "by_nc_nd", "ask"]

/** 자료 등록·수정 폼: 다른 선생님이 이 자료를 쓸 수 있는 조건(75, 필수) */
export function LicenseFields({
  value,
  onChange,
  includesOthers,
  disabled,
}: {
  value: License | null
  onChange: (v: License) => void
  includesOthers: boolean
  disabled?: boolean
}) {
  return (
    <FormPanel title={`${t.label} (필수)`} hint={includesOthers ? t.othersNote : undefined}>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t.label}</legend>
        {LICENSE_ORDER.map((key) => {
          const opt = t.options[key]
          const checked = value === key
          return (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                checked ? "border-primary bg-brand-soft" : "border-border hover:bg-surface",
              )}
            >
              <input
                type="radio"
                name="license"
                className="mt-1 size-4 shrink-0"
                checked={checked}
                onChange={() => onChange(key)}
                disabled={disabled}
              />
              <span className="min-w-0">
                <span className="block text-base font-semibold">{opt.name}</span>
                <span className="mt-0.5 block break-keep text-sm text-muted-foreground">{opt.hint}</span>
              </span>
            </label>
          )
        })}
      </fieldset>
    </FormPanel>
  )
}

const badgeIcons: Record<string, typeof UserCheck> = {
  "출처 표시": UserCheck,
  비영리: Coins,
  "변경 금지": PencilOff,
  "허락받고 사용": ShieldQuestion,
}

/** 자료 상세: 이용 조건 배지 줄 + 처음 등록한 날. 고른 적 없으면 허락받고 사용 */
export function LicenseLine({ license, createdAt }: { license: License | null; createdAt: string }) {
  const opt = t.options[license ?? "ask"]
  // 시안대로 2026-09-14 꼴(그 기기 날짜 기준)
  const d = new Date(createdAt)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-border pt-4">
      <span className="shrink-0 whitespace-nowrap text-muted-foreground">{t.shortLabel}</span>
      <ul className="flex flex-wrap gap-2" title={opt.hint}>
        {opt.badges.map((b) => {
          const Icon = badgeIcons[b]
          return (
            <li key={b} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-muted px-3 py-1 text-sm font-medium text-brand-muted-foreground">
              <Icon className="size-4" aria-hidden />
              {b}
            </li>
          )
        })}
      </ul>
      <span className="sr-only">{opt.hint}</span>
      <span className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
        {date} {t.firstRegistered}
      </span>
    </div>
  )
}
