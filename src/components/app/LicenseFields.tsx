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
  const date = new Date(createdAt).toLocaleDateString("ko-KR")
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border pt-3 text-sm">
      <span className="shrink-0 whitespace-nowrap text-muted-foreground">{t.shortLabel}</span>
      <ul className="flex flex-wrap gap-1.5" title={opt.hint}>
        {opt.badges.map((b) => {
          const Icon = badgeIcons[b]
          return (
            <li key={b} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-primary">
              <Icon className="size-3.5" aria-hidden />
              {b}
            </li>
          )
        })}
      </ul>
      <span className="sr-only">{opt.hint}</span>
      {opt.code && <span className="whitespace-nowrap text-xs text-muted-foreground">{opt.code}</span>}
      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
        {date} {t.firstRegistered}
      </span>
    </div>
  )
}
