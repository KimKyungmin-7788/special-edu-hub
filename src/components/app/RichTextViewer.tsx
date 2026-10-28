import { useEffect, useRef } from "react"
import DOMPurify from "dompurify"
import { RESEARCH_PATH_ATTR, signResearchImages } from "@/lib/researchImages"

/**
 * 본문(HTML) 렌더링 (묶음 G-2b) — DOMPurify 로 정화 후 표시.
 * 콘텐츠 스타일은 .richtext (index.css) — 에디터와 동일, 전부 중립 토큰.
 * 시드앱의 평문 description(태그 없음)은 줄바꿈 유지해 안전하게 텍스트로 렌더.
 * 연구회 비공개 사진(data-research-path)은 보통 부르는 쪽이 미리 서명 주소를 채워 넘긴다(BoardDetail).
 * 주소가 비어 있는 사진만 여기서 다시 받아 채운다(권한 없으면 빈 자리).
 */
export function RichTextViewer({ html }: { html: string }) {
  const looksHtml = /<[a-z][\s\S]*>/i.test(html)
  const clean = looksHtml ? DOMPurify.sanitize(html) : ""
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const images = Array.from(ref.current?.querySelectorAll<HTMLImageElement>(`img[${RESEARCH_PATH_ATTR}]:not([src])`) ?? [])
    if (!images.length) return
    let active = true
    void signResearchImages(images.map((img) => img.getAttribute(RESEARCH_PATH_ATTR) ?? "")).then((urls) => {
      if (!active) return
      for (const img of images) {
        const url = urls.get(img.getAttribute(RESEARCH_PATH_ATTR) ?? "")
        if (url) img.src = url
      }
    })
    return () => { active = false }
  }, [clean])

  if (!looksHtml) {
    // 평문(시드 등) — innerHTML 안 쓰고 텍스트로(React 가 이스케이프). 줄바꿈 보존.
    return (
      <div className="richtext">
        <p style={{ whiteSpace: "pre-wrap" }}>{html}</p>
      </div>
    )
  }

  return (
    <div ref={ref} className="richtext" dangerouslySetInnerHTML={{ __html: clean }} />
  )
}
