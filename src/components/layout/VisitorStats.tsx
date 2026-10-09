import { site } from "@/config/site"
import { useVisitorStats } from "@/lib/visits"

/** 숫자 한 칸 — 아직 못 불러왔으면 '–'. */
function Stat({ value, label, live }: { value: number | null; label: string; live?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-bold tracking-tight text-primary tabular-nums sm:text-3xl">
        {value === null ? "–" : value.toLocaleString("ko-KR")}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
        {live && <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary motion-safe:animate-pulse" />}
        <span className="truncate">{label}</span>
      </p>
    </div>
  )
}

/** 푸터 맨 위 방문자 수 띠 — 지금 / 오늘 / 지금까지. */
export function VisitorStats() {
  const { online, today, total } = useVisitorStats()
  return (
    <section aria-label="방문자 수" className="grid grid-cols-3 gap-4 rounded-2xl border bg-surface px-5 py-4 sm:px-8 sm:py-5">
      <Stat value={online} label="지금 함께 보는 사람" live />
      <Stat value={today} label="오늘 다녀간 사람" />
      <Stat value={total === null ? null : total + site.visitors.baseTotal} label="지금까지 다녀간 사람" />
    </section>
  )
}
