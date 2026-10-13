import { supabase } from "@/lib/supabase"

/**
 * 댓글 멘션(@닉네임) 도우미 (트랙 E).
 *
 * 저장 형식: 본문 안 토큰 `@[닉네임](사용자id)`.
 *  - 입력창에는 사람이 읽는 `@닉네임` 만 보이고, 등록할 때 encodeMentions 가 토큰으로 바꾼다.
 *  - 표시할 때 parseMentions 로 조각을 나눠 멘션은 ProfileTrigger 로 연결한다.
 *  - 닉네임은 바뀔 수 있으므로 표시 이름은 조회 시 profiles 의 현재 닉네임을 우선한다.
 *  - 알림은 보내지 않는다(표시·프로필 연결만).
 */

/** 멘션 대상 한 명. */
export type MentionUser = {
  id: string
  nickname: string
  avatarUrl: string | null
}

/** 본문 조각 — 일반 글자 또는 멘션. */
export type BodyPart =
  | { kind: "text"; text: string }
  | { kind: "mention"; userId: string; name: string }

const TOKEN_RE = /@\[([^\]\n]{1,40})\]\(([0-9a-f-]{36})\)/gi

/** 저장된 본문을 표시용 조각으로 나눈다. */
export function parseMentions(body: string): BodyPart[] {
  const parts: BodyPart[] = []
  let last = 0
  for (const m of body.matchAll(TOKEN_RE)) {
    const at = m.index ?? 0
    if (at > last) parts.push({ kind: "text", text: body.slice(last, at) })
    parts.push({ kind: "mention", name: m[1], userId: m[2] })
    last = at + m[0].length
  }
  if (last < body.length) parts.push({ kind: "text", text: body.slice(last) })
  return parts
}

/** 본문에 들어 있는 멘션 사용자 id 들(중복 제거). */
export function mentionedIds(body: string): string[] {
  return [...new Set(parseMentions(body).flatMap((p) => (p.kind === "mention" ? [p.userId] : [])))]
}

/** 토큰을 `@닉네임` 으로 풀어 사람이 읽는 글로 만든다(글자 수 세기 등). */
export function plainMentions(body: string): string {
  return body.replace(TOKEN_RE, (_, name: string) => `@${name}`)
}

/**
 * 입력창 글의 `@닉네임` 을 고른 사람 목록 기준으로 토큰으로 바꾼다.
 * 긴 닉네임부터 바꿔, '김선생'·'김선생님' 같은 앞부분 겹침을 피한다.
 * 고른 뒤 글에서 지운 멘션은 자연히 빠진다.
 */
export function encodeMentions(text: string, picked: MentionUser[]): string {
  const byLength = [...picked].sort((a, b) => b.nickname.length - a.nickname.length)
  let out = text
  const placeholders: string[] = []
  for (const u of byLength) {
    const token = `@[${u.nickname}](${u.id})`
    const needle = `@${u.nickname}`
    if (!out.includes(needle)) continue
    // 이미 바꾼 자리를 다시 건드리지 않도록 임시 자리표시로 치환
    const ph = `\uE000${placeholders.length}\uE001`
    placeholders.push(token)
    out = out.split(needle).join(ph)
  }
  return out.replace(/\uE000(\d+)\uE001/g, (_, i: string) => placeholders[Number(i)])
}

/** like/ilike 특수문자 이스케이프. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/** 닉네임 앞부분으로 사용자 찾기(자동완성). 공개 프로필 컬럼만 읽는다. */
export async function searchMentionUsers(query: string, limit = 6): Promise<MentionUser[]> {
  const q = query.trim()
  if (q === "") return []
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url")
    .ilike("nickname", `${escapeLike(q)}%`)
    .order("nickname", { ascending: true })
    .limit(limit)
  if (error) {
    console.error("[mentions] searchMentionUsers 실패:", error.message)
    return []
  }
  return (data as { id: string; nickname: string | null; avatar_url: string | null }[])
    .map((r) => ({ id: r.id, nickname: (r.nickname ?? "").trim(), avatarUrl: r.avatar_url }))
    // 토큰 형식에 넣을 수 없는 닉네임(비었거나 ']'·줄바꿈 포함, 40자 초과)은 제외
    .filter((u) => u.nickname !== "" && u.nickname.length <= 40 && !/[\]\n]/.test(u.nickname))
}

/** 멘션된 사용자들의 현재 닉네임(id → 닉네임). 닉네임 변경을 표시에 반영하기 위함. */
export async function getCurrentNicknames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (ids.length === 0) return map
  const { data, error } = await supabase.from("profiles").select("id, nickname").in("id", ids)
  if (error) {
    console.error("[mentions] getCurrentNicknames 실패:", error.message)
    return map
  }
  for (const r of data as { id: string; nickname: string | null }[]) {
    if (r.nickname && r.nickname.trim() !== "") map.set(r.id, r.nickname.trim())
  }
  return map
}
