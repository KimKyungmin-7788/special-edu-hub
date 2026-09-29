import type { ReactNode, SelectHTMLAttributes } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 글쓰기 폼 공용 부품 — 자료 등록(WriteForm)·수업실천사례(PracticeForm)가 같이 쓴다.
 * 구역마다 흰 패널(회색 바탕 위)로 나누고, 입력 칸·글자를 넉넉하게. 색·반경은 토큰만.
 */

/** 한 줄 입력 칸 */
export const fieldInput =
  "h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring disabled:opacity-60"

/** 여러 줄 입력 칸 */
export const fieldTextarea =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-base leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring disabled:opacity-60"

/** 드롭다운 — 기본 화살표 대신 아이콘을 얹는다. */
export function SelectBox({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "h-12 w-full appearance-none rounded-xl border border-input bg-background px-4 pr-11 text-base outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}

/** 선택 칩 */
export function chipClass(on: boolean) {
  return cn(
    "rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-40",
    on
      ? "border-foreground bg-accent font-semibold text-accent-foreground"
      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  )
}

/** 구역 패널 — 제목(+설명) 아래 칸들을 묶는다. */
export function FormPanel({
  title,
  hint,
  children,
  className,
}: {
  title: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8", className)}>
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
          {title}
        </h2>
        {hint && <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-col gap-7">{children}</div>
    </section>
  )
}

/** 칸 하나 — 굵은 라벨 + (필수 표시) + 설명 + 입력. */
export function FormField({
  label,
  htmlFor,
  required,
  optional,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  /** "(선택)" 표시 */
  optional?: boolean
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-base font-semibold">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
        {optional && <span className="ml-1.5 text-sm font-normal text-muted-foreground">(선택)</span>}
      </label>
      {hint && <p className="-mt-1 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

/** 글자 수 표시 (오른쪽 정렬). */
export function CharCounter({ count, max }: { count: number; max: number }) {
  return (
    <p className="text-right text-xs tabular-nums text-muted-foreground">
      {count} / {max}
    </p>
  )
}

/** 두 가지 중 하나 고르기(토글) — 활용사례 종류 등. */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl bg-accent p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          disabled={disabled}
          className={cn(
            "h-11 rounded-lg text-base transition-colors disabled:opacity-60",
            value === o.value
              ? "border border-primary bg-background font-semibold text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
