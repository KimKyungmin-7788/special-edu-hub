import { supabase } from "@/lib/supabase"
import { THUMBNAIL_MAX_BYTES, THUMBNAIL_MIME } from "@/lib/apps"

/**
 * 연구회게시판 비공개 사진 (supabase/44_research_images.sql).
 *  - 사진은 비공개 버킷 research-images 의 <uid>/<uuid>.<ext> 에 올린다(연구회회원만, RLS).
 *  - 본문에는 주소 대신 위치만 저장: <img data-research-path="…"> (src 없음, DB 저장 규칙이 강제).
 *  - 볼 때·고칠 때마다 1시간짜리 서명 주소를 받아 src 로 채운다. 회원이 아니면 발급이 거절된다.
 */
const BUCKET = "research-images"
export const RESEARCH_IMAGE_TTL = 60 * 60
export const RESEARCH_PATH_ATTR = "data-research-path"

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }

export async function uploadResearchImage(file: File): Promise<{ src: string; researchPath: string }> {
  const { data: session } = await supabase.auth.getSession()
  const uid = session.session?.user.id
  if (!uid) throw new Error("로그인이 필요합니다.")
  if (!THUMBNAIL_MIME.includes(file.type)) throw new Error("이미지(PNG·JPG·WebP·GIF) 파일만 업로드할 수 있습니다.")
  if (file.size > THUMBNAIL_MAX_BYTES) throw new Error("사진은 2MB 이하만 업로드할 수 있습니다.")

  const path = `${uid}/${crypto.randomUUID()}.${EXT[file.type]}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type })
  if (error) throw new Error("연구회 사진을 올리지 못했습니다. 연구회회원인지 확인해 주세요.")
  const src = (await signResearchImages([path])).get(path)
  if (!src) throw new Error("올린 사진을 불러오지 못했습니다.")
  return { src, researchPath: path }
}

/** 위치 여러 개를 한 번에 서명 주소로. 권한이 없거나 없는 파일은 결과에서 빠진다. */
export async function signResearchImages(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)]
  const result = new Map<string, string>()
  if (!unique.length) return result
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, RESEARCH_IMAGE_TTL)
  if (error) return result
  for (const item of data ?? []) if (item.path && item.signedUrl) result.set(item.path, item.signedUrl)
  return result
}

/** 수정 화면용: 저장된 본문의 위치 사진에 서명 주소를 채운다. */
export async function resolveResearchImages(html: string): Promise<string> {
  if (!html.includes(RESEARCH_PATH_ATTR)) return html
  const doc = new DOMParser().parseFromString(html, "text/html")
  const images = Array.from(doc.querySelectorAll<HTMLImageElement>(`img[${RESEARCH_PATH_ATTR}]`))
  const urls = await signResearchImages(images.map((img) => img.getAttribute(RESEARCH_PATH_ATTR) ?? ""))
  for (const img of images) {
    const url = urls.get(img.getAttribute(RESEARCH_PATH_ATTR) ?? "")
    if (url) img.setAttribute("src", url)
  }
  return doc.body.innerHTML
}

/** 저장용: 위치 사진의 임시 주소(src)를 지운다. 위치만 남아야 DB 저장 규칙을 통과한다. */
export function stripResearchImageSrc(html: string): string {
  if (!html.includes(RESEARCH_PATH_ATTR)) return html
  const doc = new DOMParser().parseFromString(html, "text/html")
  for (const img of Array.from(doc.querySelectorAll(`img[${RESEARCH_PATH_ATTR}]`))) {
    img.removeAttribute("src")
    img.removeAttribute("srcset")
  }
  return doc.body.innerHTML
}
