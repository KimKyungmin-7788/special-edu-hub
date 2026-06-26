import DOMPurify from "dompurify"

/**
 * 본문(HTML) 렌더링 (묶음 G-2b) — DOMPurify 로 정화 후 표시.
 * 콘텐츠 스타일은 .richtext (index.css) — 에디터와 동일, 전부 중립 토큰.
 * 시드앱의 평문 description(태그 없음)은 줄바꿈 유지해 안전하게 텍스트로 렌더.
 */
export function RichTextViewer({ html }: { html: string }) {
  const looksHtml = /<[a-z][\s\S]*>/i.test(html)

  if (!looksHtml) {
    // 평문(시드 등) — innerHTML 안 쓰고 텍스트로(React 가 이스케이프). 줄바꿈 보존.
    return (
      <div className="richtext">
        <p style={{ whiteSpace: "pre-wrap" }}>{html}</p>
      </div>
    )
  }

  const clean = DOMPurify.sanitize(html)
  return (
    <div className="richtext" dangerouslySetInnerHTML={{ __html: clean }} />
  )
}
