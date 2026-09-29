import { useEffect, useState } from "react"
import { lookupStandards, type StandardLite } from "@/lib/standards"

/**
 * 상세 페이지 — 관련 성취기준 표시 (35의 InfoBlock 과 같은 모양).
 * codes: 고른 성취기준 코드(순서대로). memo: 목록에 없는 성취기준 등 자유 입력(기존 achievement_standards).
 * 둘 다 비면 아무것도 그리지 않는다.
 */
export function StandardsInfoBlock({ codes, memo }: { codes: string[]; memo: string }) {
  const [list, setList] = useState<StandardLite[] | null>(codes.length ? null : [])

  useEffect(() => {
    let alive = true
    if (codes.length === 0) {
      setList([])
      return
    }
    lookupStandards(codes)
      .then((l) => alive && setList(l))
      .catch(() => alive && setList([]))
    return () => {
      alive = false
    }
  }, [codes])

  if (codes.length === 0 && !memo.trim()) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">관련 성취기준</h2>
      {codes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {(list ?? codes.map((code) => ({ code }) as Partial<StandardLite> & { code: string })).map((s) => (
            <li key={s.code} className="flex flex-col gap-0.5">
              <span className="text-sm">
                <span className="font-mono font-semibold">{s.code}</span>
                {s.subject && (
                  <span className="text-muted-foreground">
                    {" "}
                    {s.school_level} {s.grade_band} · {s.subject}
                  </span>
                )}
              </span>
              <span className="text-base leading-relaxed">{s.text ?? "불러오는 중…"}</span>
            </li>
          ))}
        </ul>
      )}
      {memo.trim() && (
        <p className={codes.length ? "mt-3 whitespace-pre-wrap border-t border-border pt-3 text-base leading-relaxed" : "mt-2 whitespace-pre-wrap text-base leading-relaxed"}>
          {memo}
        </p>
      )}
    </div>
  )
}
