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
import {
  createApp,
  updateApp,
  uploadThumbnail,
  THUMBNAIL_MIME,
  type App,
} from "@/lib/apps"
import { SubcategorySelect } from "@/components/app/SubcategorySelect"
import { RichTextEditor } from "@/components/app/RichTextEditor"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
const labelClass = "text-sm font-medium"

const THUMB_MAX_BYTES = 2 * 1024 * 1024 // 2MB (버킷·lib 와 동일)

/**
 * 글쓰기/수정 폼 (3단계 묶음 G-1, 수정은 5단계 추가).
 * 상위 분류(categoryId)는 진입 시 정해져 생략 — 세부 분류만 제목 다음에 고른다.
 * 저장되는 category_ids = [categoryId, ...선택한 세부분류].
 * app 이 주어지면 수정 모드(기존 값 프리필 + updateApp). 없으면 등록 모드(createApp).
 * 제출 성공 시 해당 글(/app/:id)로 이동.
 */
export function WriteForm({
  categoryId,
  defaultAuthorName = "",
  app,
}: {
  categoryId: string
  defaultAuthorName?: string
  /** 주어지면 수정 모드. */
  app?: App
}) {
  const navigate = useNavigate()
  const isEdit = app != null
  const hasSubs = getSubcategories(categoryId).length > 0
  // "목록"/"취소" → 수정이면 해당 글로, 등록이면 카테고리 목록으로.
  const listTo = isEdit
    ? `/app/${app.id}`
    : getCategory(categoryId)?.type === "work"
      ? "/apps/work"
      : `/apps/subject/${categoryId}`

  const [title, setTitle] = useState(app?.title ?? "")
  const [subIds, setSubIds] = useState<string[]>(
    app ? app.categoryIds.filter((id) => id !== categoryId) : [],
  )
  const [appUrl, setAppUrl] = useState(app?.appUrl ?? "")
  const [authorName, setAuthorName] = useState(app?.authorName ?? defaultAuthorName)
  const [content, setContent] = useState(app?.description ?? "")
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  // 수정 모드 초기 미리보기 = 기존 썸네일(원격 URL). blob: 이 아니면 "유지"로 본다.
  const [thumbPreview, setThumbPreview] = useState<string | null>(
    app?.thumbnailUrl ? app.thumbnailUrl : null,
  )
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
      // 썸네일: 새 파일이면 업로드 / 기존 원격 URL 이면 유지 / 비웠으면 "".
      let thumbnailUrl = ""
      if (thumbFile) thumbnailUrl = await uploadThumbnail(thumbFile)
      else if (thumbPreview && !thumbPreview.startsWith("blob:"))
        thumbnailUrl = thumbPreview

      const payload = {
        title,
        appUrl,
        thumbnailUrl,
        authorName,
        description: content,
        categoryIds: [categoryId, ...subIds],
      }
      const saved = app
        ? await updateApp(app.id, payload)
        : await createApp(payload)
      navigate(`/app/${saved.id}`)
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

      {/* 작성자 */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>작성자</label>
        <input
          className={inputClass}
          placeholder="앱 상세에 보일 이름"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          disabled={submitting}
        />
      </div>

      {/* 내용 — 블로그형 에디터(HTML 저장) */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>내용</label>
        <RichTextEditor value={content} onChange={setContent} />
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
          {isEdit ? "취소" : "목록"}
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? "저장 중…"
              : "등록 중…"
            : isEdit
              ? "수정 저장"
              : "글쓰기"}
        </button>
      </div>
    </form>
  )
}
