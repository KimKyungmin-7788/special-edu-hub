import { Component, type ReactNode } from "react"
import { CONTAINER } from "@/config/layout"

/**
 * 페이지를 그리다 오류가 나면 흰 화면 대신 안내를 보여 준다(헤더·푸터는 그대로).
 * 새 버전이 배포된 뒤 예전 화면에서 페이지를 옮기면 조각 파일을 못 찾아 여기로 오는데, 새로고침하면 풀린다.
 * Layout 이 주소를 key 로 줘서, 다른 페이지로 옮기면 다시 정상 화면을 시도한다.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
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
