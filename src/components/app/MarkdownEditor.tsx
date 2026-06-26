import { useEffect, useRef } from "react"
import Editor from "@toast-ui/editor"
import "@toast-ui/editor/dist/toastui-editor.css"
import { uploadThumbnail } from "@/lib/apps"

/**
 * 블로그형 본문 에디터 (묶음 G-2) — Toast UI Editor 코어를 직접 마운트한 얇은 래퍼.
 * (React 19 라 공식 react 래퍼 대신 코어 + 수동 마운트.)
 *
 * - 저장 형식: Markdown (onChange 로 상위에 전달, apps.description 에 저장).
 * - 서식: 구조+강조만(제목·굵게·기울임·취소선·인용·구분선·목록·이미지·링크).
 *   폰트·색 등은 의도적으로 제외(중립 디자인 유지).
 * - 본문 이미지: app-thumbnails 공개 버킷에 업로드(uploadThumbnail 재사용).
 * - 위젯 내부 스타일은 Toast UI 기본 테마(중립) 그대로 — 토큰 테마화 예외(합의).
 */
export function MarkdownEditor({
  initialValue = "",
  onChange,
  height = "420px",
}: {
  initialValue?: string
  onChange: (markdown: string) => void
  height?: string
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const editor = new Editor({
      el,
      height,
      initialEditType: "wysiwyg",
      previewStyle: "vertical",
      initialValue,
      usageStatistics: false,
      autofocus: false,
      toolbarItems: [
        ["heading", "bold", "italic", "strike"],
        ["hr", "quote"],
        ["ul", "ol"],
        ["image", "link"],
      ],
      hooks: {
        addImageBlobHook: async (blob, callback) => {
          try {
            const file =
              blob instanceof File
                ? blob
                : new File([blob], `image-${Date.now()}.png`, {
                    type: blob.type || "image/png",
                  })
            const url = await uploadThumbnail(file)
            callback(url, file.name)
          } catch (e) {
            console.error("[editor] 본문 이미지 업로드 실패:", e)
          }
        },
      },
    })

    editor.on("change", () => onChangeRef.current(editor.getMarkdown()))

    return () => editor.destroy()
  }, []) // 마운트 시 1회 생성 (initialValue·height 는 생성 시점 값 사용)

  return <div ref={elRef} />
}
