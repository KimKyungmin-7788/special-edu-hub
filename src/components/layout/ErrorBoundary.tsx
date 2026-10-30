import { Component, type ReactNode } from "react"
import { CONTAINER } from "@/config/layout"
import { isChunkLoadError, reloadForNewVersion } from "@/lib/lazyPage"

/**
 * 페이지를 그리다 오류가 나면 흰 화면 대신 안내를 보여 준다(헤더·푸터는 그대로).
 * 새 버전 배포 뒤 예전 조각 파일을 못 찾은 경우는 대부분 lazyPage 가 먼저 새로고침한다.
 * 그래도 여기까지 오면 한 번 더 새로고침을 시도하고, 그래도 안 되면(진짜 오류) 안내를 보여 준다.
 * Layout 이 주소를 key 로 줘서, 다른 페이지로 옮기면 다시 정상 화면을 시도한다.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
    if (isChunkLoadError(error)) reloadForNewVersion()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className={`${CONTAINER} py-24 text-center`}>
        <h1 className="text-2xl font-semibold tracking-tight">화면을 불러오지 못했습니다</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          잠시 후 다시 시도해 주세요. 새로고침하면 대부분 해결됩니다.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            새로고침
          </button>
          <a href="/" className="rounded-md border bg-card px-4 py-2 text-sm font-medium">
            홈으로
          </a>
        </div>
      </div>
    )
  }
}
