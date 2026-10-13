/**
 * 프로필 사진이 없을 때 첫 글자 동그라미의 색 (토큰 --avatar-1~6, src/styles/tokens.css).
 * 이름으로 색을 정해, 같은 사람은 어디서나 같은 색으로 보인다.
 * Tailwind 가 클래스를 찾을 수 있도록 클래스 이름을 그대로 적어 둔다.
 */
const TONES = [
  "bg-avatar-1 text-avatar-1-foreground",
  "bg-avatar-2 text-avatar-2-foreground",
  "bg-avatar-3 text-avatar-3-foreground",
  "bg-avatar-4 text-avatar-4-foreground",
  "bg-avatar-5 text-avatar-5-foreground",
  "bg-avatar-6 text-avatar-6-foreground",
]

/** 첫 글자 동그라미에 줄 클래스(배경·글자색·굵기·테두리 없음). */
export function avatarTone(name: string | null | undefined): string {
  const s = (name ?? "").trim()
  let h = 0
  for (const ch of s) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return `border-transparent font-semibold ${TONES[h % TONES.length]}`
}

/** 사진이 있을 때의 동그라미 클래스(기존 중립). */
export const AVATAR_PHOTO = "border-border bg-surface text-muted-foreground"
