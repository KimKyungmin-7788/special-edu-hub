import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { formatDraftTime } from "@/lib/practiceDrafts"

/**
 * 작성 중인 글(86) — 자료 등록·게시글·협업 프로젝트 쓰기 화면이 자동으로 저장해 두고, 다시 들어오면 이어 쓴다.
 * 수업실천사례(73, practiceDrafts.ts)와 같은 방식. 본인만 읽고 쓴다(RLS). 올리기에 성공하면 지운다.
 */

export type DraftKind = "app" | "post" | "project"
export type Draft<T> = { id: string; title: string; data: T; updatedAt: string }

const TABLE = "writing_drafts"
export { formatDraftTime }

export async function listDrafts<T>(kind: DraftKind, scope: string): Promise<Draft<T>[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, title, data, updated_at")
    .eq("kind", kind)
    .eq("scope", scope)
    .order("updated_at", { ascending: false })
  if (error) {
    console.error("[drafts] 목록 실패:", error.message)
    return []
  }
  return (data as { id: string; title: string; data: T; updated_at: string }[]).map((r) => ({
    id: r.id, title: r.title, data: r.data, updatedAt: r.updated_at,
  }))
}

async function saveDraft<T>(kind: DraftKind, scope: string, id: string | null, title: string, data: T) {
  const row = { kind, scope, title: Array.from(title.trim()).slice(0, 100).join(""), data }
  const q = id
    ? supabase.from(TABLE).update(row).eq("id", id).select("id, updated_at").single()
    : supabase.from(TABLE).insert(row).select("id, updated_at").single()
  const { data: saved, error } = await q
  if (error) throw error
  const r = saved as { id: string; updated_at: string }
  return { id: r.id, updatedAt: r.updated_at }
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) console.error("[drafts] 삭제 실패:", error.message)
}

/**
 * 쓰기 화면용 자동 임시 저장. 내용이 바뀌고 1.5초 멈추면 저장, 탭을 떠날 때도 저장.
 * 저장은 하나씩 차례로 — 같은 글이 두 번 생기지 않게. enabled 가 false 면(수정 화면·비로그인) 아무것도 안 한다.
 */
export function useAutoDraft<T>({ kind, scope, enabled, data, title, hasContent, paused }: {
  kind: DraftKind
  scope: string
  enabled: boolean
  data: T
  title: string
  hasContent: (d: T) => boolean
  /** 올리는 중에는 저장하지 않는다 */
  paused?: boolean
}) {
  const [drafts, setDrafts] = useState<Draft<T>[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const idRef = useRef<string | null>(null)
  const lastSnap = useRef("")
  const chain = useRef<Promise<void>>(Promise.resolve())
  const latest = useRef({ data, title, hasContent })
  latest.current = { data, title, hasContent }
  const snapshot = JSON.stringify(data)

  useEffect(() => {
    if (enabled) listDrafts<T>(kind, scope).then(setDrafts)
  }, [enabled, kind, scope])

  function saveNow(): Promise<void> {
    chain.current = chain.current.then(async () => {
      if (!enabled) return
      const { data: d, title: t, hasContent: has } = latest.current
      const snap = JSON.stringify(d)
      if (snap === lastSnap.current || !has(d)) return
      try {
        const r = await saveDraft(kind, scope, idRef.current, t, d)
        idRef.current = r.id
        lastSnap.current = snap
        setCurrentId(r.id)
        setSavedAt(r.updatedAt)
        setSaveError(null)
      } catch (err) {
        const msg = (err as { message?: string })?.message ?? ""
        setSaveError(/[가-힣]/.test(msg) ? msg : "임시 저장하지 못했어요.")
      }
    })
    return chain.current
  }

  useEffect(() => {
    if (!enabled || paused) return
    const t = setTimeout(() => void saveNow(), 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, enabled, paused])

  useEffect(() => {
    if (!enabled) return
    const onHide = () => document.visibilityState === "hidden" && void saveNow()
    document.addEventListener("visibilitychange", onHide)
    return () => document.removeEventListener("visibilitychange", onHide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  /** 카드를 누르면: 지금 쓰던 것은 저장해 카드로 남기고, 고른 것의 내용을 돌려준다(화면이 칸에 채운다). */
  async function open(d: Draft<T>): Promise<T> {
    await saveNow()
    idRef.current = d.id
    lastSnap.current = JSON.stringify(d.data)
    setCurrentId(d.id)
    setSavedAt(d.updatedAt)
    setDrafts(await listDrafts<T>(kind, scope))
    return d.data
  }

  async function discard(d: Draft<T>) {
    if (!window.confirm(`'${d.title || "제목 없음"}' 작성 중인 글을 지울까요? 되돌릴 수 없어요.`)) return
    await deleteDraft(d.id)
    setDrafts((cur) => cur.filter((x) => x.id !== d.id))
  }

  /** 올리기에 성공한 뒤 부른다 — 이 글의 임시 저장을 지운다 */
  async function clear() {
    await chain.current
    if (idRef.current) await deleteDraft(idRef.current)
  }

  const others = drafts.filter((d) => d.id !== currentId)
  return { others, savedAt, saveError, open, discard, clear }
}
