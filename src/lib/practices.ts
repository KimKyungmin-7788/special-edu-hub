import { supabase } from "@/lib/supabase"
import { charCount } from "@/lib/apps"

/**
 * 수업실천사례 데이터 접근 (PRD §13, 31_practices.sql).
 * 읽기는 뷰 practices_catalog(잠금 마스킹), 쓰기는 practices 테이블(RLS: 인증교사·본인·운영진).
 * 사례 ↔ 앱 연결은 practice_apps. 첨부파일은 공개 버킷 practice-files.
 */

const CATALOG = "practices_catalog"
const FILE_BUCKET = "practice-files"

/** DB check 와 같은 값(31_practices.sql). */
export const PRACTICE_TITLE_MAX = 100
export const PRACTICE_SUMMARY_MAX = 60
export const PRACTICE_TARGET_MAX = 30
export const PRACTICE_LINKS_MAX = 10
export const PRACTICE_FILES_MAX = 5
export const PRACTICE_APPS_MAX = 10
export const PRACTICE_APP_NOTE_MAX = 60
export const PRACTICE_FILE_MAX_BYTES = 10 * 1024 * 1024 // 10MB (버킷 정책과 동일)

export type PracticeStatus = "published" | "hidden"
export type PracticeVisibility = "public" | "teachers"

export type PracticeLink = { title: string; url: string }

export type PracticeFile = {
  name: string // 원래 파일 이름(표시용)
  path: string // 버킷 안 경로 <uid>/<uuid>.<ext> (삭제용)
  url: string // 공개 주소(내려받기)
  size: number
  mime: string
}

export type Practice = {
  id: string
  ownerId: string
  title: string
  summary: string
  coverUrl: string
  categoryIds: string[]
  target: string
  lessonCount: number | null
  body: string // HTML. 잠긴 사례는 ''
  links: PracticeLink[] // 잠긴 사례는 []
  files: PracticeFile[] // 잠긴 사례는 []
  fileCount: number // 잠겨도 실제 첨부 수
  visibility: PracticeVisibility
  status: PracticeStatus
  viewCount: number
  likeCount: number
  bookmarkCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  locked: boolean
  ownerNickname: string | null
  ownerAvatarUrl: string | null
}

type PracticeRow = {
  id: string
  owner_id: string
  title: string
  summary: string
  cover_url: string
  category_ids: string[] | null
  target: string
  lesson_count: number | null
  body: string
  links: PracticeLink[] | null
  files: PracticeFile[] | null
  file_count?: number
  visibility: PracticeVisibility
  status: PracticeStatus
  view_count: number
  like_count: number
  bookmark_count: number
  comment_count: number
  created_at: string
  updated_at: string
  locked?: boolean // 뷰에만 있음
  owner_nickname?: string | null
  owner_avatar_url?: string | null
}

function mapRow(row: PracticeRow): Practice {
  const files = row.files ?? []
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    summary: row.summary,
    coverUrl: row.cover_url,
    categoryIds: row.category_ids ?? [],
    target: row.target,
    lessonCount: row.lesson_count,
    body: row.body,
    links: row.links ?? [],
    files,
    fileCount: row.file_count ?? files.length,
    visibility: row.visibility,
    status: row.status,
    viewCount: row.view_count,
    likeCount: row.like_count,
    bookmarkCount: row.bookmark_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locked: row.locked ?? false,
    ownerNickname: row.owner_nickname ?? null,
    ownerAvatarUrl: row.owner_avatar_url ?? null,
  }
}

/** 오류 → 보여줄 문장. Supabase 오류는 Error 가 아닌 객체({ message })일 수 있어 따로 꺼낸다. */
export function errorText(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message // 입력 검사 문장·저장소 오류
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : ""
  return msg ? `${fallback} (${msg})` : fallback
}

/**
 * 본문에서 "내용 없는 소제목"을 뺀다 — 소제목 틀을 채우지 않고 올렸을 때 빈 제목만 남지 않게.
 * 소제목(h2) 다음부터 다음 h2 전까지 글자·이미지·구분선이 하나도 없으면 그 h2 와 빈 문단을 지운다.
 * 남은 게 없으면 "" (상세에서 "본문이 없습니다").
 */
export function stripEmptySections(html: string): string {
  if (!html.includes("<h2")) return html
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html")
  const root = doc.body.firstElementChild as HTMLElement
  const nodes = Array.from(root.childNodes)
  const hasContent = (n: Node) =>
    (n.textContent ?? "").trim() !== "" ||
    (n instanceof Element && (n.matches("img, hr") || n.querySelector("img, hr") !== null))

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!(n instanceof Element) || n.tagName !== "H2") continue
    let j = i + 1
    while (j < nodes.length && !(nodes[j] instanceof Element && (nodes[j] as Element).tagName === "H2")) j++
    const section = nodes.slice(i + 1, j)
    if (!section.some(hasContent)) [n, ...section].forEach((x) => x.parentNode?.removeChild(x))
  }
  const out = root.innerHTML.trim()
  return hasContent(root) ? out : ""
}

// ── 읽기 ─────────────────────────────────────────────────

/** 공개 사례 목록(최신순). categoryId 를 주면 그 교과가 들어간 사례만. */
export async function getPractices(categoryId?: string): Promise<Practice[]> {
  let q = supabase
    .from(CATALOG)
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
  if (categoryId) q = q.contains("category_ids", [categoryId])

  const { data, error } = await q
  if (error) {
    console.error("[practices] getPractices 실패:", error.message)
    return []
  }
  return (data as PracticeRow[]).map(mapRow)
}

/** 사례 한 건(숨김은 본인·운영진만 보임 — 뷰 조건). 없으면 null. */
export async function getPractice(id: string): Promise<Practice | null> {
  const { data, error } = await supabase
    .from(CATALOG)
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) {
    console.error("[practices] getPractice 실패:", error.message)
    return null
  }
  return data ? mapRow(data as PracticeRow) : null
}

/** 내가 쓴 사례(숨김 포함, 최신순) — 마이페이지용. */
export async function getMyPractices(): Promise<Practice[]> {
  const uid = await currentUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from(CATALOG)
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[practices] getMyPractices 실패:", error.message)
    return []
  }
  return (data as PracticeRow[]).map(mapRow)
}

export type PracticeAppLink = { appId: string; note: string }

/** 사례에 연결된 앱(순서대로). 앱 내용은 lib/apps getAppsByIds 로 따로 불러온다. */
export async function getPracticeApps(practiceId: string): Promise<PracticeAppLink[]> {
  const { data, error } = await supabase
    .from("practice_apps")
    .select("app_id, note")
    .eq("practice_id", practiceId)
    .order("sort", { ascending: true })
  if (error) {
    console.error("[practices] getPracticeApps 실패:", error.message)
    return []
  }
  return (data as { app_id: string; note: string }[]).map((r) => ({
    appId: r.app_id,
    note: r.note,
  }))
}

/** 이 앱을 활용한 공개 사례(최신순) — 앱 상세 역링크용. */
export async function getPracticesByApp(appId: string): Promise<Practice[]> {
  const { data, error } = await supabase
    .from("practice_apps")
    .select("practice_id")
    .eq("app_id", appId)
  if (error) {
    console.error("[practices] getPracticesByApp 실패:", error.message)
    return []
  }
  const ids = (data as { practice_id: string }[]).map((r) => r.practice_id)
  if (ids.length === 0) return []

  const res = await supabase
    .from(CATALOG)
    .select("*")
    .in("id", ids)
    .eq("status", "published")
    .order("created_at", { ascending: false })
  if (res.error) {
    console.error("[practices] getPracticesByApp 실패:", res.error.message)
    return []
  }
  return (res.data as PracticeRow[]).map(mapRow)
}

// ── 쓰기 ─────────────────────────────────────────────────

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** 등록/수정 입력. id·owner·status·집계수는 코드/RLS 가 정한다. */
export type PracticeInput = {
  title: string
  summary: string
  coverUrl: string
  categoryIds: string[]
  target: string
  lessonCount: number | null
  body: string
  links: PracticeLink[]
  files: PracticeFile[]
  visibility: PracticeVisibility
  privacyConfirmed: boolean
}

/** 입력 검사 + DB 모양 변환. 문제가 있으면 사용자에게 보여줄 문장으로 throw. */
function toRow(input: PracticeInput) {
  const title = input.title.trim()
  const summary = input.summary.trim()
  const target = input.target.trim()
  if (title === "") throw new Error("제목을 입력하세요.")
  if (charCount(title) > PRACTICE_TITLE_MAX)
    throw new Error(`제목은 ${PRACTICE_TITLE_MAX}자 이하로 써 주세요.`)
  if (summary === "") throw new Error("한 줄 요약을 입력하세요.")
  if (charCount(summary) > PRACTICE_SUMMARY_MAX)
    throw new Error(`한 줄 요약은 ${PRACTICE_SUMMARY_MAX}자 이하로 써 주세요.`)
  if (input.coverUrl === "") throw new Error("대표 사진을 올려 주세요.")
  if (input.categoryIds.length === 0) throw new Error("교과를 한 개 이상 선택하세요.")
  if (charCount(target) > PRACTICE_TARGET_MAX)
    throw new Error(`대상은 ${PRACTICE_TARGET_MAX}자 이하로 써 주세요.`)
  if (!input.privacyConfirmed)
    throw new Error("학생 개인정보 확인란에 체크해 주세요.")

  const links = input.links
    .map((l) => ({ title: l.title.trim(), url: l.url.trim() }))
    .filter((l) => l.url !== "")
  if (links.length > PRACTICE_LINKS_MAX)
    throw new Error(`링크는 ${PRACTICE_LINKS_MAX}개까지 넣을 수 있습니다.`)
  for (const l of links)
    if (!/^https?:\/\//i.test(l.url))
      throw new Error("링크 주소는 http:// 또는 https:// 로 시작해야 합니다.")
  if (input.files.length > PRACTICE_FILES_MAX)
    throw new Error(`첨부파일은 ${PRACTICE_FILES_MAX}개까지 올릴 수 있습니다.`)

  return {
    title,
    summary,
    cover_url: input.coverUrl,
    category_ids: input.categoryIds,
    target,
    lesson_count: input.lessonCount,
    body: input.body,
    links,
    files: input.files,
    visibility: input.visibility,
    privacy_confirmed: input.privacyConfirmed,
  }
}

/** 새 사례 등록(RLS: 인증교사 + 본인 명의). 등록된 사례 id 반환. */
export async function createPractice(input: PracticeInput): Promise<string> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")
  const id = crypto.randomUUID()
  // 컬럼 권한상 insert 후 select 반환은 뷰에서 다시 읽는다.
  const { error } = await supabase
    .from("practices")
    .insert({ id, owner_id: uid, status: "published", ...toRow(input) })
  if (error) throw error
  return id
}

/** 사례 내용 수정(RLS: 본인·운영진). */
export async function updatePractice(id: string, input: PracticeInput): Promise<void> {
  const { error } = await supabase.from("practices").update(toRow(input)).eq("id", id)
  if (error) throw error
}

/** 숨김/복구(삭제 대신). */
export async function setPracticeStatus(id: string, status: PracticeStatus): Promise<void> {
  const { error } = await supabase.from("practices").update({ status }).eq("id", id)
  if (error) throw error
}

/** 연결 앱 목록을 통째로 교체(순서 = 배열 순서). */
export async function setPracticeApps(
  practiceId: string,
  links: PracticeAppLink[],
): Promise<void> {
  if (links.length > PRACTICE_APPS_MAX)
    throw new Error(`연결 자료는 ${PRACTICE_APPS_MAX}개까지 고를 수 있습니다.`)
  const del = await supabase.from("practice_apps").delete().eq("practice_id", practiceId)
  if (del.error) throw del.error
  if (links.length === 0) return
  const { error } = await supabase.from("practice_apps").insert(
    links.map((l, i) => ({
      practice_id: practiceId,
      app_id: l.appId,
      sort: i,
      note: l.note.trim().slice(0, PRACTICE_APP_NOTE_MAX),
    })),
  )
  if (error) throw error
}

// ── 첨부파일 ─────────────────────────────────────────────

/** 확장자 → 올릴 때 지정할 형식. 버킷 allowed_mime_types(31)와 같은 목록. */
const FILE_MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  hwp: "application/x-hwp",
  hwpx: "application/vnd.hancom.hwpx",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

/** 파일 고르기 창 accept 값. */
export const PRACTICE_FILE_ACCEPT = Object.keys(FILE_MIME_BY_EXT)
  .map((e) => `.${e}`)
  .join(",")

/** 첨부파일 업로드 → PracticeFile 반환. 경로 <uid>/<uuid>.<ext>(원래 이름은 표시용으로만 보관). */
export async function uploadPracticeFile(file: File): Promise<PracticeFile> {
  const uid = await currentUserId()
  if (!uid) throw new Error("로그인이 필요합니다.")
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const mime = FILE_MIME_BY_EXT[ext]
  if (!mime)
    throw new Error("PDF·한글·워드·파워포인트·엑셀·이미지 파일만 올릴 수 있습니다.")
  if (file.size > PRACTICE_FILE_MAX_BYTES)
    throw new Error("첨부파일은 한 개에 10MB 이하만 올릴 수 있습니다.")

  const path = `${uid}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(FILE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: mime })
  if (error) throw error

  const { data } = supabase.storage.from(FILE_BUCKET).getPublicUrl(path)
  // 맥에서 고른 파일 이름은 한글 자모가 풀린 형태(NFD)라 윈도우에서 깨져 보인다 → NFC 로 합친다.
  return { name: file.name.normalize("NFC"), path, url: data.publicUrl, size: file.size, mime }
}

/** 첨부 빼기 — 저장소에서 지운다(본인 폴더만 가능). 실패해도 글 저장은 막지 않는다. */
export async function removePracticeFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(FILE_BUCKET).remove([path])
  if (error) console.error("[practices] 첨부 삭제 실패:", error.message)
}

// ── 설계안 AI 초안 (PRD §13.4, api/practice-draft.ts) ─────────────

/** 서버가 돌려주는 초안. 학생 반응·돌아보며는 없다(실제 수업 모습이라 AI가 쓰지 않음). */
export type PracticeDraft = {
  title: string
  summary: string
  subjectIds: string[]
  subcategoryIds: string[]
  target: string
  lessonCount: number // 0 = 알 수 없음
  overviewHtml: string
  flowHtml: string
  links: PracticeLink[]
  personalInfoWarnings: string[] // 학생 실명 등 개인정보가 보인 위치
}

/** 올려 둔 설계안 PDF(practice-files 본인 폴더)로 초안을 받는다. 30초~1분 걸릴 수 있다. */
export async function requestPracticeDraft(fileUrl: string): Promise<PracticeDraft> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("로그인이 필요합니다.")

  let res: Response
  try {
    res = await fetch("/api/practice-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileUrl }),
    })
  } catch {
    throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.")
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? "초안을 만들지 못했습니다.")
  return body as PracticeDraft
}
