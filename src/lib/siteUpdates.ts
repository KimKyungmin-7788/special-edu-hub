import { supabase } from "@/lib/supabase"
import type { UpdateKind } from "@/config/updates"

/**
 * 새 소식 데이터 (54_site_updates.sql). 읽기는 누구나, 쓰기·고치기·지우기는 운영진(RLS is_staff).
 * "어디까지 봤는지"는 그 브라우저의 localStorage 에만 둔다(서버로 보내지 않음).
 */

export type SiteUpdate = {
  id: string
  kind: UpdateKind
  title: string
  body: string
  linkLabel: string | null
  linkTo: string | null
  /** 소식 아래 보여 줄 짧은 영상(55). 없으면 null */
  mediaUrl: string | null
  createdAt: string
}

export type SiteUpdateInput = {
  kind: UpdateKind
  title: string
  body: string
  linkLabel: string | null
  linkTo: string | null
  mediaUrl: string | null
}

type Row = {
  id: string
  kind: UpdateKind
  title: string
  body: string
  link_label: string | null
  link_to: string | null
  media_url: string | null
  created_at: string
}

const COLUMNS = "id, kind, title, body, link_label, link_to, media_url, created_at"

function mapRow(r: Row): SiteUpdate {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    linkLabel: r.link_label,
    linkTo: r.link_to,
    mediaUrl: r.media_url,
    createdAt: r.created_at,
  }
}

function toRow(i: SiteUpdateInput) {
  return {
    kind: i.kind,
    title: i.title.trim(),
    body: i.body.trim(),
    link_label: i.linkTo?.trim() ? i.linkLabel?.trim() || "자세히 보기" : null,
    link_to: i.linkTo?.trim() || null,
    media_url: i.mediaUrl,
  }
}

/** 최신순 목록. limit 를 주면 그만큼만 */
export async function listUpdates(limit?: number): Promise<SiteUpdate[]> {
  let q = supabase.from("site_updates").select(COLUMNS).order("created_at", { ascending: false })
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return (data as Row[]).map(mapRow)
}

export async function createUpdate(input: SiteUpdateInput): Promise<SiteUpdate> {
  const { data, error } = await supabase.from("site_updates").insert(toRow(input)).select(COLUMNS).single()
  if (error) throw error
  return mapRow(data as Row)
}

export async function updateUpdate(id: string, input: SiteUpdateInput): Promise<void> {
  const { error } = await supabase.from("site_updates").update(toRow(input)).eq("id", id)
  if (error) throw error
}

export async function deleteUpdate(id: string): Promise<void> {
  const { error } = await supabase.from("site_updates").delete().eq("id", id)
  if (error) throw error
}

// ── 어디까지 봤는지(이 브라우저만) ─────────────────────────
const SEEN_KEY = "updates_seen_at"

export function getSeenAt(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

/** 이 소식까지 봤다고 적는다(이미 더 최신을 봤으면 그대로) */
export function markSeen(createdAt: string) {
  try {
    const prev = localStorage.getItem(SEEN_KEY)
    if (!prev || Date.parse(prev) < Date.parse(createdAt)) localStorage.setItem(SEEN_KEY, createdAt)
  } catch {
    // 저장이 막힌 브라우저면 팝업이 다시 뜰 뿐
  }
}
