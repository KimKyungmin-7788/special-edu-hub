import { supabase } from "@/lib/supabase"

/**
 * 수업실천사례 실천 기록 활동사진 (supabase/78_practice_photos.sql).
 *  - 비공개 버킷 practice-photos 의 <uid>/<uuid>.jpg. 사례에는 위치(path)만 저장한다.
 *  - 올리기 전에 화면에서 canvas 로 다시 그려 JPG 로 만든다 → 위치정보(GPS)·기기 정보(EXIF)가 남지 않는다.
 *  - 볼 때마다 1시간짜리 서명 주소. 사례를 볼 수 없는 사람에게는 DB 가 발급을 거절한다.
 */
const BUCKET = "practice-photos"
export const PRACTICE_PHOTOS_MAX = 2
const MAX_DIM = 1600
const TTL = 60 * 60

export type PracticePhoto = { path: string }

/** 고른 사진을 긴 변 1600px 이하 canvas 로 그린다(휴대폰 사진의 회전 정보는 반영해서 바로 세움). */
export async function photoToCanvas(file: File): Promise<HTMLCanvasElement> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 올릴 수 있습니다.")
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error("이 사진은 열 수 없어요. JPG·PNG 사진으로 다시 골라 주세요.")
  }
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

/** canvas 를 JPG 로 본인 폴더에 올리고 위치를 돌려준다. */
export async function uploadPracticePhoto(canvas: HTMLCanvasElement): Promise<PracticePhoto> {
  const { data: session } = await supabase.auth.getSession()
  const uid = session.session?.user.id
  if (!uid) throw new Error("로그인이 필요합니다.")
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85))
  if (!blob) throw new Error("사진을 저장하지 못했어요.")
  const path = `${uid}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" })
  if (error) throw new Error("사진을 올리지 못했어요. 인증교사로 로그인했는지 확인해 주세요.")
  return { path }
}

/** 위치 여러 개를 서명 주소로. 볼 권한이 없거나 없는 파일은 결과에서 빠진다. */
export async function signPracticePhotos(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (!paths.length) return result
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, TTL)
  if (error) return result
  for (const item of data ?? []) if (item.path && item.signedUrl) result.set(item.path, item.signedUrl)
  return result
}

/** 사진 지우기(본인 폴더만). 실패해도 글 저장·삭제는 막지 않는다. */
export async function removePracticePhotos(paths: string[]): Promise<void> {
  if (!paths.length) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) console.error("[practicePhotos] 삭제 실패:", error.message)
}
