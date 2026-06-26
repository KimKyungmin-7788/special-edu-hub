import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react"
import { Link, useNavigate } from "react-router-dom"
import { ImagePlus, X } from "lucide-react"
import { getCategory, getSubcategories } from "@/config/categories"
import { createApp, uploadThumbnail, THUMBNAIL_MIME } from "@/lib/apps"
import { SubcategorySelect } from "@/components/app/SubcategorySelect"
import { MarkdownEditor } from "@/components/app/MarkdownEditor"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
const labelClass = "text-sm font-medium"

const THUMB_MAX_BYTES = 2 * 1024 * 1024 // 2MB (버킷·lib 와 동일)

/**
 * 글쓰기 폼 (3단계 묶음 G-1).
 * 상위 분류(categoryId)는 진입 시 정해져 생략 — 세부 분류만 제목 다음에 고른다.
 * 저장되는 category_ids = [categoryId, ...선택한 세부분류].
 * 내용은 G-1 에선 textarea, G-2 에서 블로그형 에디터로 교체 예정.
 * 제출 성공 시 방금 만든 글(/app/:id)로 이동.
 */
export function WriteForm({
  categoryId,
  defaultAuthorName,
}: {
  categoryId: string
  defaultAuthorName: string
}) {
  const navigate = useNavigate()
  const hasSubs = getSubcategories(categoryId).length > 0
  // "목록" → 이 카테고리의 목록 페이지로 돌아가기.
  const listTo =
    getCategory(categoryId)?.type === "work"
      ? "/apps/work"
      : `/apps/subject/${categoryId}`

  const [title, setTitle] = useState("")
  const [subIds, setSubIds] = useState<string[]>([])
  const [appUrl, setAppUrl] = useState("")
  const [authorName, setAuthorName] = useState(defaultAuthorName)
  const [content, setContent] = useState("")
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [thumbError, setThumbError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)

  function acceptImage(file: File | null) {
    setThumbError(null)
    if (!file) return
    if (!THUMBNAIL_MIME.includes(file.type)) {
      setThumbError("이미지(PNG·JPG·WebP·GIF) 파일만 넣을 수 있습니다.")
      return
    }
    if (file.size > THUMB_MAX_BYTES) {
      setThumbError("썸네일은 2MB 이하만 넣을 수 있습니다.")
      return
    }
    const url = URL.createObjectURL(file)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setThumbFile(file)
    setThumbPreview(url)
  }

  function clearThumb() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setThumbFile(null)
    setThumbPreview(null)
    setThumbError(null)
  }

  // 스크린샷 붙여넣기(Ctrl·⌘+V) — 클립보드 이미지를 썸네일로.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile()
          if (f) {
            e.preventDefault()
            acceptImage(f)
          }
          return
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [])

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    acceptImage(e.dataTransfer.files?.[0] ?? null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (title.trim() === "") {
      setSubmitError("제목을 입력하세요.")
      return
    }
    if (hasSubs && subIds.length === 0) {
      setSubmitError("세부 분류를 한 개 이상 선택하세요.")
      return
    }
    if (appUrl.trim() === "") {
      setSubmitError("앱 URL 을 입력하세요.")
      return
    }

    setSubmitting(true)
    try {
      let thumbnailUrl = ""
      if (thumbFile) thumbnailUrl = await uploadThumbnail(thumbFile)
      const app = await createApp({
        title,
        appUrl,
        thumbnailUrl,
        authorName,
        description: content,
        categoryIds: [categoryId, ...subIds],
      })
      navigate(`/app/${app.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* 제목 */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>
          제목 <span className="text-destructive">*</span>
        </label>
        <input
          className={inputClass}
          placeholder="예: 날짜 저요저요!"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      {/* 세부 분류 (제목 다음) */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>
          세부 분류 {hasSubs && <span className="text-destructive">*</span>}
        </label>
        {hasSubs ? (
          <>
            <p className="text-xs text-muted-foreground">
              한 개 이상 선택하세요. 여러 개 고를 수 있습니다.
            </p>
            <div className="mt-1">
              <SubcategorySelect
                parentId={categoryId}
                value={subIds}
                onChange={setSubIds}
                disabled={submitting}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            이 분류는 세부 분류가 없어요. 바로 등록할 수 있습니다.
          </p>
        )}
      </div>

      {/* 앱 URL */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>
          앱 URL <span className="text-destructive">*</span>
        </label>
        <input
          className={inputClass}
          type="url"
          placeholder="https://..."
          value={appUrl}
          onChange={(e) => setAppUrl(e.target.value)}
          required
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground">
          앱은 새 탭으로 열립니다. https:// 로 시작하는 전체 주소를 넣어주세요.
        </p>
      </div>

      {/* 썸네일 */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>썸네일</label>
        <p className="text-xs text-muted-foreground">
          넣으면 목록에서 훨씬 잘 보여요 (선택이지만 권장). 스크린샷을 복사해
          붙여넣기(Ctrl·⌘+V) 하거나, 파일을 끌어다 놓아도 됩니다. PNG·JPG·WebP·GIF /
          최대 2MB.
        </p>

        {thumbPreview ? (
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md border border-border">
            <img
              src={thumbPreview}
              alt="썸네일 미리보기"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={clearThumb}
              disabled={submitting}
              aria-label="썸네일 제거"
              className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            disabled={submitting}
            className="flex aspect-video w-full max-w-sm flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-surface text-muted-foreground transition-colors hover:border-foreground/30 disabled:opacity-50"
          >
            <ImagePlus className="size-7" aria-hidden />
            <span className="text-sm">클릭해서 선택 · 끌어다 놓기 · 붙여넣기</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => acceptImage(e.target.files?.[0] ?? null)}
          disabled={submitting}
        />
        {thumbError && <p className="text-xs text-destructive">{thumbError}</p>}
      </div>

      {/* 개발자 표시명 */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>개발자 표시명</label>
        <input
          className={inputClass}
          placeholder="앱 상세에 보일 이름"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          disabled={submitting}
        />
      </div>

      {/* 내용 — 블로그형 에디터(Markdown 저장) */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>내용</label>
        <MarkdownEditor onChange={setContent} />
      </div>

      {/* 에러 */}
      {submitError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* 하단 액션: 좌측 목록(카테고리로 돌아가기) · 우측 글쓰기(제출) */}
      <div className="flex items-center justify-between">
        <Link
          to={listTo}
          className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          목록
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "등록 중…" : "글쓰기"}
        </button>
      </div>
    </form>
  )
}
