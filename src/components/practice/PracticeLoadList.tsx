import { useEffect, useState } from "react"
import type { Practice } from "@/lib/practices"
import { PracticeRow } from "@/components/practice/PracticeCard"

/**
 * 마이페이지용 사례 목록 — loader 로 받은 사례를 목록 보기(PracticeRow)로.
 * "담은 수업 사례"(즐겨찾기)와 "내가 쓴 수업 사례"(내 활동)에서 공용.
 */
export function PracticeLoadList({
  load,
  emptyText,
}: {
  /** 모듈 함수처럼 안정적인 참조를 넘긴다(처음 한 번만 부름). */
  load: () => Promise<Practice[]>
  emptyText: string
}) {
  const [items, setItems] = useState<Practice[] | null>(null)

  useEffect(() => {
    let active = true
    load().then((d) => {
      if (active) setItems(d)
    })
    return () => {
      active = false
    }
  }, [load])

  if (items === null) return <p className="text-sm text-muted-foreground">불러오는 중…</p>
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((p) => (
        <li key={p.id}>
          <PracticeRow practice={p} />
        </li>
      ))}
    </ul>
  )
}
