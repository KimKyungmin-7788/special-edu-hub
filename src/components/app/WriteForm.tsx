import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react"
import { Link, useNavigate } from "react-router-dom"
import { Crop, ImagePlus, Search, Sparkles, X } from "lucide-react"
import {
  getCategory,
  getSubcategories,
  subjectCategories,
  workCategories,
} from "@/config/categories"
import {
  createApp,
  updateApp,
  uploadThumbnail,
  THUMBNAIL_MIME,
  type App,
  type AppVisibility,
  type UseCaseType,
  SUMMARY_MAX,
  charCount,
} from "@/lib/apps"
import { SubcategorySelect } from "@/components/app/SubcategorySelect"
import { RichTextEditor } from "@/components/app/RichTextEditor"
import { ThumbnailCropper } from "@/components/app/ThumbnailCropper"
import { StandardsFinderModal } from "@/components/app/StandardsFinderModal"
import { SelectedStandards } from "@/components/app/SelectedStandards"
import { StandardsManualModal } from "@/components/app/StandardsManualModal"
import {
  CharCounter,
  FormField,
  FormPanel,
  SelectBox,
  fieldInput,
  fieldTextarea,
} from "@/components/form/FormParts"

const VISIBILITY_OPTIONS: { value: AppVisibility; label: string }[] = [
  { value: "public", label: "전체 공개" },
  { value: "teachers", label: "인증교사만" },
]

/** 활용사례 안내 — '예상되는 현장 변화'는 2026-10-05 폼에서 뺐다(기존 자료의 값은 그대로 둔다). */
const USE_CASE_HINT =
  "수업이나 업무에서 실제로 써 보니 어땠는지, 학생 반응과 함께 구체적으로 적어 주세요."

const INTENT_MAX = 1000
const USE_CASE_MAX = 2000
const THUMB_MAX_BYTES = 2 * 1024 * 1024 // 2MB — 올라가는 결과물 한도(버킷·lib 와 동일)
const THUMB_SOURCE_MAX_BYTES = 20 * 1024 * 1024 // 원본 사진 한도 — 자르기 창에서 1280×720 으로 줄인 뒤 올린다

/** 글자 수 제한까지만 받는다(유니코드 기준). */
const clip = (text: string, max: number) => Array.from(text).slice(0, max).join("")

/**
 * 자료 등록/수정 폼 (2026-09-29 개편).
 * 순서: 앱 이름 → 앱 링크 → 한줄 설명(+성취기준 찾기) → 카테고리(교과·하위 주제·관련 성취기준·연관 교과)
 *       → 교육적 의도(필수) → 활용사례(선택) → 자세한 설명 → 썸네일 → 공개 범위.
 * 관련 성취기준은 검색 모달·직접 입력 모달로 고른 코드 목록만 받는다(35의 자유 입력 메모 칸은 뺐다 —
 * 기존 메모 값은 수정 때 건드리지 않고 상세 페이지에는 그대로 보인다).
 * 교과는 진입 경로(categoryId)에서 미리 골라져 오지만 폼에서 바꿀 수 있다.
 * 저장되는 category_ids = [교과, ...하위 주제, (연관 교과, ...그 하위 주제)] — 첫 번째가 대표.
 * 작성자 이름은 계정 닉네임(defaultAuthorName)을 자동으로 쓴다(수정 때는 기존 이름 유지).
 * app 이 주어지면 수정 모드. 제출 성공 시 해당 글(/app/:id)로 이동.
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

  // ── 카테고리 ──
  const [primaryId, setPrimaryId] = useState(categoryId)
  const primary = getCategory(primaryId)
  const hasSubs = getSubcategories(primaryId).length > 0
  const [subIds, setSubIds] = useState<string[]>(
    app ? app.categoryIds.filter((id) => getCategory(id)?.parentId === categoryId) : [],
  )
  const canRelate = primary?.type === "subject"
  const relatedOptions = subjectCategories.filter((c) => c.id !== primaryId)
  const [relatedId, setRelatedId] = useState<string>(
    () =>
      app?.categoryIds.find(
        (id) => id !== categoryId && subjectCategories.some((c) => c.id === id),
      ) ?? "",
  )
  const [relatedSubIds, setRelatedSubIds] = useState<string[]>(
    app && relatedId
      ? app.categoryIds.filter((id) => getCategory(id)?.parentId === relatedId)
      : [],
  )
  const related = relatedId ? getCategory(relatedId) : undefined

  function changePrimary(id: string) {
    setPrimaryId(id)
    setSubIds([])
    if (id === relatedId || getCategory(id)?.type !== "subject") {
      setRelatedId("")
      setRelatedSubIds([])
    }
  }

  function changeRelated(id: string) {
    setRelatedId(id)
    setRelatedSubIds([])
  }

  // "목록"/"취소" → 수정이면 해당 글로, 등록이면 고른 교과 목록으로.
  const listTo = isEdit
    ? `/app/${app.id}`
    : primary?.type === "work"
      ? "/apps/work"
      : `/apps/subject/${primaryId}`

  // ── 내용 ──
  const [title, setTitle] = useState(app?.title ?? "")
  const [appUrl, setAppUrl] = useState(app?.appUrl ?? "")
  const [summary, setSummary] = useState(app?.summary ?? "")
  const [achievementCodes, setAchievementCodes] = useState<string[]>(app?.achievementCodes ?? [])
  const [finderOpen, setFinderOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [intent, setIntent] = useState(app?.educationalIntent ?? "")
  // 새 글은 항상 '현장 활용 사례'. 예전에 '예상되는 현장 변화'로 쓴 자료는 수정해도 그 종류를 유지.
  const useCaseType: Exclude<UseCaseType, ""> =
    app?.useCaseType === "expected" ? "expected" : "field"
  const [useCase, setUseCase] = useState(app?.useCase ?? "")
  const [content, setContent] = useState(app?.description ?? "")
  const [visibility, setVisibility] = useState<AppVisibility>(app?.visibility ?? "public")

  // ── 썸네일 ──
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  // 수정 모드 초기 미리보기 = 기존 썸네일(원격 URL). blob: 이 아니면 "유지"로 본다.
  const [thumbPreview, setThumbPreview] = useState<string | null>(
    app?.thumbnailUrl ? app.thumbnailUrl : null,
  )
  const [thumbError, setThumbError] = useState<string | null>(null)
  // 자르기 창에 띄울 원본(열림 = 값 있음) / 마지막으로 고른 원본(다시 맞추기용)
  const [cropSource, setCropSource] = useState<File | null>(null)
  const [thumbSource, setThumbSource] = useState<File | null>(null)
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
    if (file.size > THUMB_SOURCE_MAX_BYTES) {
      setThumbError("사진은 20MB 이하만 넣을 수 있습니다.")
      return
    }
    // 바로 올리지 않고 자르기 창으로 → 16:9 · 1280×720 으로 맞춘 결과를 쓴다.
    setThumbSource(file)
    setCropSource(file)
  }

  function applyCropped(result: File) {
    setCropSource(null)
    if (result.size > THUMB_MAX_BYTES) {
      setThumbError("변환한 썸네일이 2MB를 넘어요. 다른 사진으로 시도해 주세요.")
      return
    }
    const url = URL.createObjectURL(result)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setThumbFile(result)
    setThumbPreview(url)
  }

  function clearThumb() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setThumbFile(null)
    setThumbPreview(null)
    setThumbSource(null)
    setThumbError(null)
  }

  // 스크린샷 붙여넣기(Ctrl·⌘+V) — 클립보드 이미지를 썸네일로. 입력 칸·에디터 안에서는 제외.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest("[contenteditable=true], input, textarea")) return
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

    if (title.trim() === "") return setSubmitError("앱 이름을 입력하세요.")
    if (appUrl.trim() === "") return setSubmitError("앱 링크를 입력하세요.")
    if (!primary) return setSubmitError("교과를 선택하세요.")
    if (hasSubs && subIds.length === 0)
      return setSubmitError("하위 주제를 한 개 이상 선택하세요.")
    if (intent.trim() === "") return setSubmitError("교육적 의도를 입력하세요.")

    setSubmitting(true)
    try {
      // 썸네일: 새 파일이면 업로드 / 기존 원격 URL 이면 유지 / 비웠으면 "".
      let thumbnailUrl = ""
      if (thumbFile) thumbnailUrl = await uploadThumbnail(thumbFile)
      else if (thumbPreview && !thumbPreview.startsWith("blob:")) thumbnailUrl = thumbPreview

      const payload = {
        title,
        appUrl,
        summary,
        thumbnailUrl,
        description: content,
        categoryIds: [
          primaryId,
          ...subIds,
          ...(canRelate && relatedId ? [relatedId, ...relatedSubIds] : []),
        ],
        visibility,
        achievementCodes,
        educationalIntent: intent,
        useCaseType,
        useCase,
      }
      const saved = app
        ? await updateApp(app.id, payload) // 작성자 이름은 그대로 둔다
        : await createApp({ ...payload, authorName: defaultAuthorName, achievementStandards: "" })
      // replace: 폼 페이지를 히스토리에서 치워, 상세에서 "목록으로"가 폼으로 되돌아가지 않게.
      navigate(`/app/${saved.id}`, { replace: true })
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "오류가 발생했습니다."
      setSubmitError(msg)
      setSubmitting(false)
    }
  }


  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* ── 1. 기본 정보 ── */}
      <FormPanel title="기본 정보">
        <FormField label="앱 이름" htmlFor="app-title" required>
          <input
            id="app-title"
            className={fieldInput}
            placeholder="예: 날짜 저요저요!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={submitting}
          />
        </FormField>

        <FormField
          label="앱 링크"
          htmlFor="app-url"
          required
          hint="앱은 새 탭으로 열립니다. https:// 로 시작하는 전체 주소를 넣어 주세요."
        >
          <input
            id="app-url"
            className={fieldInput}
            type="url"
            placeholder="https://..."
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            required
            disabled={submitting}
          />
        </FormField>

        <FormField label="한줄 설명" htmlFor="app-summary" hint="목록 카드에서 제목 아래에 보이고, 관련 성취기준을 찾을 때도 쓰여요.">
          <input
            id="app-summary"
            className={fieldInput}
            placeholder="한 문장으로: 누가, 무엇에 쓰나요?"
            value={summary}
            onChange={(e) => setSummary(clip(e.target.value, SUMMARY_MAX))}
            disabled={submitting}
          />
          <CharCounter count={charCount(summary)} max={SUMMARY_MAX} />
          {/* 성취기준 찾기 안내 — 버튼만 두면 작성자가 못 알아채서, 무엇을 해 주는지 문장으로 보여 준다. */}
          <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                이 한줄 설명으로 관련 성취기준을 찾아 드려요
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {achievementCodes.length > 0
                  ? `지금 ${achievementCodes.length}개 골랐어요. 아래 '카테고리'에서 순서를 정리할 수 있어요.`
                  : "기본 교육과정 성취기준 가운데 비슷한 것을 골라 보여 줘요. 설명을 쓴 뒤 눌러 보세요."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFinderOpen(true)}
              disabled={submitting}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Search className="size-4" aria-hidden /> 성취기준 찾기
            </button>
          </div>
        </FormField>
      </FormPanel>

      {/* ── 2. 카테고리 ── */}
      <FormPanel title="카테고리" hint="고른 교과 목록에 이 자료가 보여요.">
        <FormField label="교과" htmlFor="app-primary" required>
          <SelectBox
            id="app-primary"
            value={primaryId}
            onChange={(e) => changePrimary(e.target.value)}
            disabled={submitting}
          >
            {!primary && <option value="">교과를 고르세요</option>}
            <optgroup label="교과">
              {subjectCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="업무">
              {workCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </SelectBox>
        </FormField>

        {hasSubs && (
          <FormField label="하위 주제" required hint="한 개 이상 고르세요. 여러 개 고를 수 있어요.">
            <SubcategorySelect
              parentId={primaryId}
              value={subIds}
              onChange={setSubIds}
              disabled={submitting}
            />
          </FormField>
        )}

        <FormField
          label="관련 성취기준"
          optional
          hint="2022 개정 특수교육 기본 교육과정에서 찾아 고르고, 중요한 순서대로 정리하세요."
        >
          <SelectedStandards
            codes={achievementCodes}
            onChange={setAchievementCodes}
            onOpenFinder={() => setFinderOpen(true)}
            onOpenManual={() => setManualOpen(true)}
            disabled={submitting}
          />
        </FormField>

        {canRelate && (
          <FormField
            label="연관 교과"
            htmlFor="app-related"
            optional
            hint="다른 교과에도 쓸 수 있다면 하나 더 고르세요. 그 교과 목록에도 함께 보여요."
          >
            <SelectBox
              id="app-related"
              value={relatedId}
              onChange={(e) => changeRelated(e.target.value)}
              disabled={submitting}
            >
              <option value="">없음</option>
              {relatedOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectBox>
            {related && getSubcategories(related.id).length > 0 && (
              <div className="mt-1 rounded-xl border border-border bg-surface p-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  {related.name} 하위 주제 (선택)
                </p>
                <SubcategorySelect
                  parentId={related.id}
                  value={relatedSubIds}
                  onChange={setRelatedSubIds}
                  disabled={submitting}
                />
              </div>
            )}
          </FormField>
        )}
      </FormPanel>

      {/* ── 3. 수업에서의 쓰임 ── */}
      <FormPanel title="수업에서의 쓰임">
        <FormField
          label="교육적 의도"
          htmlFor="app-intent"
          required
        >
          <textarea
            id="app-intent"
            rows={4}
            className={fieldTextarea}
            placeholder="이 자료로 학생이 무엇을 배우고, 무엇을 할 수 있게 되길 바라나요?"
            value={intent}
            onChange={(e) => setIntent(clip(e.target.value, INTENT_MAX))}
            required
            disabled={submitting}
          />
          <CharCounter count={charCount(intent)} max={INTENT_MAX} />
        </FormField>

        <FormField label="활용사례" optional>
          <textarea
            aria-label="활용사례 내용"
            rows={5}
            placeholder={USE_CASE_HINT}
            className={fieldTextarea}
            value={useCase}
            onChange={(e) => setUseCase(clip(e.target.value, USE_CASE_MAX))}
            disabled={submitting}
          />
          <CharCounter count={charCount(useCase)} max={USE_CASE_MAX} />
        </FormField>
      </FormPanel>

      {/* ── 4. 자세한 설명 ── */}
      <FormPanel title="자세한 설명">
        <div className="text-base">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder={"어떻게 사용하는지, 어떤 방식으로 운영하면 효과적인지 TIP과 다양한 정보를 자유롭게 적어주세요.\n사진과 링크도 넣을 수 있어요."}
          />
        </div>
      </FormPanel>

      {/* ── 5. 썸네일 ── */}
      <FormPanel
        title="썸네일"
        hint="넣으면 목록에서 훨씬 잘 보여요(선택이지만 권장). 스크린샷을 복사해 붙여넣기(Ctrl·⌘+V) 하거나 파일을 끌어다 놓아도 됩니다. 목록 카드와 같은 16:9(1280×720)로 맞춰 올려요. PNG·JPG·WebP·GIF / 최대 20MB."
      >
        <div className="flex flex-col gap-2">
          {thumbPreview ? (
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-border">
              <img src={thumbPreview} alt="썸네일 미리보기" className="h-full w-full object-cover" />
              {thumbSource && (
                <button
                  type="button"
                  onClick={() => setCropSource(thumbSource)}
                  disabled={submitting}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-background disabled:opacity-50"
                >
                  <Crop className="size-3.5" aria-hidden />
                  다시 맞추기
                </button>
              )}
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
              className="flex aspect-video w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-background text-muted-foreground transition-colors hover:border-foreground/30 disabled:opacity-50"
            >
              <ImagePlus className="size-8" aria-hidden />
              <span className="text-base">클릭해서 선택 · 끌어다 놓기 · 붙여넣기</span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              acceptImage(e.target.files?.[0] ?? null)
              e.target.value = "" // 같은 파일을 다시 골라도 자르기 창이 뜨게
            }}
            disabled={submitting}
          />
          {thumbError && <p className="text-sm text-destructive">{thumbError}</p>}
          <ThumbnailCropper
            file={cropSource}
            onCancel={() => setCropSource(null)}
            onDone={applyCropped}
          />
        </div>
      </FormPanel>

      {/* ── 6. 공개 범위 ── */}
      <FormPanel
        title="공개 범위"
        hint="'인증교사만'으로 하면 인증 안 한 방문자에게는 제목·썸네일만 보이고, 앱 열기·본문·댓글은 잠깁니다."
      >
        <fieldset className="flex flex-wrap gap-x-8 gap-y-3 text-base">
          <legend className="sr-only">공개 범위</legend>
          {VISIBILITY_OPTIONS.map((opt) => (
            <label key={opt.value} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                checked={visibility === opt.value}
                onChange={() => setVisibility(opt.value)}
                disabled={submitting}
                className="size-4"
              />
              {opt.label}
            </label>
          ))}
        </fieldset>
      </FormPanel>

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      {/* 하단 액션: 좌측 목록/취소 · 우측 등록 */}
      <div className="flex items-center justify-between">
        <Link
          to={listTo}
          replace
          className="rounded-xl border border-border bg-card px-6 py-3 text-base font-medium text-foreground hover:bg-accent"
        >
          {isEdit ? "취소" : "목록"}
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (isEdit ? "저장 중…" : "등록 중…") : isEdit ? "수정 저장" : "등록하기"}
        </button>
      </div>

      <StandardsFinderModal
        open={finderOpen}
        onClose={() => setFinderOpen(false)}
        initialApp={summary.trim() || title.trim()}
        selected={achievementCodes}
        onConfirm={setAchievementCodes}
      />
      <StandardsManualModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        selected={achievementCodes}
        onAdd={(code) => setAchievementCodes((prev) => (prev.includes(code) ? prev : [...prev, code]))}
      />
    </form>
  )
}
