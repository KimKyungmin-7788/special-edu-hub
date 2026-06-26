import { useEffect, useRef } from "react"
import Viewer from "@toast-ui/editor/dist/toastui-editor-viewer"
import "@toast-ui/editor/dist/toastui-editor-viewer.css"

/**
 * 본문(Markdown) 렌더링 (묶음 G-2) — Toast UI Viewer 코어 래퍼.
 * Toast UI 자체 XSS 정화가 내장되어 별도 sanitizer 불필요.
 * 시드앱의 평문 description 도 Markdown 으로 무리 없이 렌더된다.
 * 위젯 내부 스타일은 Toast UI 기본 테마(중립) 그대로 — 토큰 테마화 예외(합의).
 */
export function MarkdownViewer({ content }: { content: string }) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const viewer = new Viewer({ el, initialValue: content || "" })
    return () => viewer.destroy()
  }, [content])

  return <div ref={elRef} />
}
