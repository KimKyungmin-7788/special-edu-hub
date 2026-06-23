import { seedApps, type App } from "@/data/seed"

/**
 * 데이터 접근 일원화 지점.
 * 0단계: 목업(seed)에서 읽는다.
 * 1단계: 이 함수들의 "내부 구현만" Supabase 호출로 교체한다.
 *        (호출하는 컴포넌트·화면은 그대로 — BUILD.md 7)
 * Supabase가 비동기이므로 지금부터 async 로 둔다.
 */

export type { App }

/** 전체 앱 목록 (최신순). */
export async function getApps(): Promise<App[]> {
  return [...seedApps].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  )
}

/** id 로 단일 앱. */
export async function getApp(id: string): Promise<App | undefined> {
  return seedApps.find((a) => a.id === id)
}
