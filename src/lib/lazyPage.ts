import { lazy, type ComponentType } from "react"

/**
 * 페이지 조각 파일 지연 불러오기 + 새 버전 배포 대응.
 * 배포하면 예전 조각 파일 이름이 사라진다. 배포 전에 열어 둔 화면에서 아직 안 받은 페이지로 가면
 * 파일을 못 찾아 실패하는데, 이때 한 번 새로고침해 새 버전을 받는다(30초 안에 또 실패하면 오류 안내).
 */
const RELOAD_KEY = "chunk-reload-at"
const RELOAD_WINDOW_MS = 30_000

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Importing a module script failed|module script|ChunkLoadError|Unable to preload CSS/i.test(message)
}

/** 새로고침했으면 true. 방금 새로고침했는데 또 실패한 경우(진짜 오류)는 false — 무한 새로고침 방지. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return false // 기록을 못 남기면 반복될 수 있어 새로고침하지 않는다
  }
  window.location.reload()
  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => load().catch((error: unknown) => {
    // 새로고침하는 동안은 로딩 화면을 유지한다(끝나지 않는 약속).
    if (isChunkLoadError(error) && reloadForNewVersion()) return new Promise<{ default: T }>(() => {})
    throw error
  }))
}
