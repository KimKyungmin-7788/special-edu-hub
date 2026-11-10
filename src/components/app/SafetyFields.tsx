import { TriangleAlert } from "lucide-react"
import { FormPanel, fieldInput } from "@/components/form/FormParts"
import { DATA_ITEM_ORDER, safetyText as t } from "@/config/safety"
import { needsGuardianConsent, type DataItem, type Safety } from "@/lib/safety"

/**
 * 자료 등록·수정 폼의 "안전 확인 정보 (선택)" 구역(67).
 * 학생 정보를 저장하거나 학생이 AI 를 쓴다고 고르면 대상 연령을 묻고,
 * 전 연령 + 서버에 저장 + 개인식별가능정보면 보호자 동의 안내를 보여 준다.
 */
export function SafetyFields({
  value,
  onChange,
  disabled,
}: {
  value: Safety
  onChange: (next: Safety) => void
  disabled?: boolean
}) {
  const set = (patch: Partial<Safety>) => onChange({ ...value, ...patch })
  const stored = value.studentData === "device" || value.studentData === "server"
  const ai = value.studentAi === true

  function toggleItem(item: DataItem, on: boolean) {
    set({ dataItems: on ? [...value.dataItems, item] : value.dataItems.filter((i) => i !== item) })
  }

  return (
    <FormPanel
      title={t.title}
      hint={
        <>
          <span className="font-medium text-foreground">(선택)</span> {t.intro}
        </>
      }
    >
      <Group label={t.studentData.label}>
        <Radios
          name="safety-student-data"
          options={t.studentData.options}
          value={value.studentData}
          onChange={(v) => set({ studentData: v })}
          disabled={disabled}
        />
        {stored && (
          <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-sm text-muted-foreground">{t.dataItems.label}</p>
            {DATA_ITEM_ORDER.map((item) => {
              const opt = t.dataItems.options[item]
              return (
                <label key={item} className="inline-flex items-start gap-2 text-base">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={value.dataItems.includes(item)}
                    onChange={(e) => toggleItem(item, e.target.checked)}
                    disabled={disabled}
                  />
                  <span>
                    {opt.name}
                    {opt.example && <span className="text-muted-foreground"> ({opt.example})</span>}
                  </span>
                </label>
              )
            })}
            {value.dataItems.includes("other") && (
              <input
                className={fieldInput}
                aria-label={t.dataItems.options.other.name}
                maxLength={100}
                value={value.dataOther}
                onChange={(e) => set({ dataOther: e.target.value })}
                disabled={disabled}
              />
            )}
          </div>
        )}
      </Group>

      <Group label={t.studentAi.label}>
        <Radios
          name="safety-student-ai"
          options={{ no: t.studentAi.no, yes: t.studentAi.yes }}
          value={value.studentAi === null ? null : value.studentAi ? "yes" : "no"}
          onChange={(v) => set({ studentAi: v === "yes" })}
          disabled={disabled}
        />
        {ai && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3">
            <label htmlFor="safety-ai-service" className="text-sm text-muted-foreground">
              {t.studentAi.serviceLabel}
            </label>
            <input
              id="safety-ai-service"
              className={fieldInput}
              maxLength={100}
              value={value.aiService}
              onChange={(e) => set({ aiService: e.target.value })}
              disabled={disabled}
            />
          </div>
        )}
      </Group>

      {(stored || ai) && (
        <Group label={t.targetAge.label}>
          <Radios
            name="safety-target-age"
            options={t.targetAge.options}
            value={value.targetAge}
            onChange={(v) => set({ targetAge: v })}
            disabled={disabled}
          />
          {needsGuardianConsent(value) && <GuardianNotice className="mt-3" />}
        </Group>
      )}

      <Group label={t.copyright.label}>
        <Radios
          name="safety-copyright"
          options={t.copyright.options}
          value={value.copyright}
          onChange={(v) => set({ copyright: v })}
          disabled={disabled}
        />
      </Group>
    </FormPanel>
  )
}

/** 보호자 동의 안내 한 줄 — 입력란과 상세 카드가 함께 쓴다 */
export function GuardianNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground ${className}`}>
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      {t.guardianNotice}
    </p>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold">{label}</legend>
      {children}
    </fieldset>
  )
}

function Radios<T extends string>({
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  name: string
  options: Record<T, string>
  value: T | null
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 text-base">
      {(Object.keys(options) as T[]).map((key) => (
        <label key={key} className="inline-flex items-center gap-2">
          <input
            type="radio"
            name={name}
            className="size-4"
            checked={value === key}
            onChange={() => onChange(key)}
            disabled={disabled}
          />
          {options[key]}
        </label>
      ))}
    </div>
  )
}
