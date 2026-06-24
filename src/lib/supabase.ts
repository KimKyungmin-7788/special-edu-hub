import { createClient } from "@supabase/supabase-js"

/**
 * Supabase 클라이언트 (1단계).
 * 값은 .env.local 에서 불러온다(VITE_ 접두만 프론트에 노출됨).
 * - VITE_SUPABASE_URL      : 프로젝트 URL
 * - VITE_SUPABASE_ANON_KEY : anon public 키 (공개 가능, RLS로 읽기만 허용)
 *
 * 이번 단계는 공개 읽기(SELECT)만 사용한다.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // 값이 비어 있으면 일찍, 명확하게 알려준다(.env.local 채웠는지 확인).
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 비어 있습니다. .env.local 을 확인하세요.",
  )
}

export const supabase = createClient(url ?? "", anonKey ?? "")
