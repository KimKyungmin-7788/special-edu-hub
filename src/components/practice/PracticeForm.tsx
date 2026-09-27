import { useRef, useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getCategory, getSubcategories, subjectCategories } from "@/config/categories"
import {
  practiceBodyTemplate,
  practicePrivacyCheck,
  practiceSections,
  practiceTargets,
} from "@/config/practice"
import { uploadThumbnail, charCount, getApps } from "@/lib/apps"
import {
  createPractice,
  updatePractice,
  setPracticeApps,
  removePracticeFile,
  errorText,
  stripEmptySections,
  PRACTICE_SUMMARY_MAX,
  PRACTICE_TITLE_MAX,
  PRACTICE_FILES_MAX,
  PRACTICE_LINKS_MAX,
  PRACTICE_APPS_MAX,
  type Practice,
  type PracticeAppLink,
  type PracticeDraft,
  type PracticeFile,
  type PracticeLink,
  type PracticeVisibility,
} from "@/lib/practices"
import { SubcategorySelect } from "@/components/app/SubcategorySelect"
import { RichTextEditor } from "@/components/app/RichTextEditor"
import { CoverField, type CoverValue } from "@/components/practice/CoverField"
import { AppLinkPicker } from "@/components/practice/AppLinkPicker"
import { LinkListField } from "@/components/practice/LinkListField"
import { FileListField } from "@/components/practice/FileListField"
import { DraftFromPlan } from "@/components/practice/DraftFromPlan"
import { cn } from "@/lib/utils"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

const SUBJECTS_MAX = 2 // 대표 교과 + 관련 교과 1개(앱 글쓰기와 같은 규칙)

const VISIBILITY_OPTIONS: { value: PracticeVisibility; label: string }[] = [
  { value: "public", label: "전체 공개" },
  { value: "teachers", label: "인증교사만" },
]

/** 주소 비교용 — 프로토콜·www·끝 슬래시·대소문자 차이를 없앤다. */
function normalizeUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .toLowerCase()
}

/** 저장된 category_ids → [고른 교과(순서대로)], {교과: 세부분류[]} */
function splitCategories(ids: string[]) {
  const subjects = ids.filter((id) => {
    const c = getCategory(id)
    return c && !c.parentId
  })
  const subs: Record<string, string[]> = {}
  for (const s of subjects)
    subs[s] = ids.filter((id) => getCategory(id)?.parentId === s)
  return { subjects, subs }
}

/**
 * 수업실천사례 글쓰기/수정 폼 (PRD §13, 묶음 P-2).
 * 1) 기본 정보(제목·요약·대표사진·교과 필수, 대상·차시 선택)
 * 2) 본문(소제목 틀이 미리 들어간 에디터)
 * 3) 이 수업에서 쓴 학습자료(앱 연결)
 * 4) 첨부(파일·링크)
 * 5) 공개 범위 + 학생 개인정보 확인(필수)
 * practice 가 주어지면 수정 모드. 저장 성공 시 상세(/practices/:id)로 이동.
 */
export function PracticeForm({
  practice,
  initialApps = [],
}: {
  practice?: Practice
  initialApps?: PracticeAppLink[]
}) {
  const navigate = useNavigate()
  const isEdit = practice != null
  const initialCats = splitCategories(practice?.categoryIds ?? [])

  const [title, setTitle] = useState(practice?.title ?? "")
  const [summary, setSummary] = useState(practice?.summary ?? "")
  const [cover, setCover] = useState<CoverValue>({ file: null, url: practice?.coverUrl ?? "" })
  const [subjects, setSubjects] = useState<string[]>(initialCats.subjects)
  const [subs, setSubs] = useState<Record<string, string[]>>(initialCats.subs)
  const [target, setTarget] = useState(practice?.target ?? "")
  const [lessonCount, setLessonCount] = useState(
    practice?.lessonCount != null ? String(practice.lessonCount) : "",
  )
  const [body, setBody] = useState(practice?.body ?? practiceBodyTemplate)
  const [apps, setApps] = useState<PracticeAppLink[]>(initialApps)
  const [links, setLinks] = useState<PracticeLink[]>(practice?.links ?? [])
  const [files, setFiles] = useState<PracticeFile[]>(practice?.files ?? [])
  const [visibility, setVisibility] = useState<PracticeVisibility>(
    practice?.visibility ?? "public",
  )
  const [privacyOk, setPrivacyOk] = useState(isEdit)
  const [fileBusy, setFileBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 에디터는 처음 값만 읽으므로, 초안으로 본문을 바꿀 때 key 를 바꿔 다시 그린다.
  const [editorKey, setEditorKey] = useState(0)
  const [draftApplied, setDraftApplied] = useState<{ warnings: string[] } | null>(null)

  // 이번 편집에서 저장소에 있던/올린 파일 경로 — 저장 후 목록에서 빠진 것만 지운다.
  const knownPaths = useRef(new Set((practice?.files ?? []).map((f) => f.path)))
  // 새 글 저장이 중간(앱 연결)에서 실패했을 때 다시 누르면 중복 등록 대신 수정으로.
  const savedId = useRef<string | null>(practice?.id ?? null)

  const cancelTo = isEdit ? `/practices/${practice.id}` : "/practices"

  function toggleSubject(id: string) {
    setSubjects((cur) => {
      if (cur.includes(id)) return cur.filter((s) => s !== id)
      if (cur.length >= SUBJECTS_MAX) return cur
      return [...cur, id]
    })
    setSubs((cur) => ({ ...cur, [id]: [] }))
  }

  function onFilesChange(next: PracticeFile[]) {
    for (const f of next) knownPaths.current.add(f.path)
    setFiles(next)
  }

  /** AI 초안 → 폼 칸 채우기. 학생 반응·돌아보며는 비워 둔다(실제 수업 모습이라). */
  async function applyDraft(draft: PracticeDraft, planFile: PracticeFile) {
    const hasInput =
      title.trim() !== "" ||
      summary.trim() !== "" ||
      stripEmptySections(body) !== ""
    if (hasInput && !window.confirm("이미 쓴 제목·요약·본문을 초안으로 바꿀까요?")) {
      onFilesChange([...files, planFile]) // 설계안 첨부는 그대로 둔다
      return
    }

    setTitle(Array.from(draft.title).slice(0, PRACTICE_TITLE_MAX).join(""))
    setSummary(Array.from(draft.summary).slice(0, PRACTICE_SUMMARY_MAX).join(""))
    const pickedSubjects = draft.subjectIds
      .filter((id) => subjectCategories.some((c) => c.id === id))
      .slice(0, SUBJECTS_MAX)
    if (pickedSubjects.length > 0) {
      setSubjects(pickedSubjects)
      setSubs(
        Object.fromEntries(
          pickedSubjects.map((sid) => [
            sid,
            draft.subcategoryIds.filter((id) => getCategory(id)?.parentId === sid),
          ]),
        ),
      )
    }
    if ((practiceTargets as readonly string[]).includes(draft.target)) setTarget(draft.target)
    if (draft.lessonCount >= 1 && draft.lessonCount <= 99) setLessonCount(String(draft.lessonCount))

    const [overview, flow, reaction, reflection] = practiceSections
    setBody(
      `<h2>${overview.title}</h2>${draft.overviewHtml}` +
        `<h2>${flow.title}</h2>${draft.flowHtml}` +
        `<h2>${reaction.title}</h2><p></p><h2>${reflection.title}</h2><p></p>`,
    )
    setEditorKey((k) => k + 1)

    // 설계안 속 주소: 등록된 자료면 "쓴 학습자료"로 연결, 아니면 링크로.
    const allApps = await getApps()
    const byUrl = new Map(allApps.map((a) => [normalizeUrl(a.appUrl), a.id]))
    const nextApps = [...apps]
    const nextLinks = [...links]
    for (const l of draft.links) {
      const appId = byUrl.get(normalizeUrl(l.url))
      if (appId) {
        if (!nextApps.some((x) => x.appId === appId)) nextApps.push({ appId, note: "" })
      } else if (!nextLinks.some((x) => normalizeUrl(x.url) === normalizeUrl(l.url))) {
        nextLinks.push({ title: l.title, url: l.url })
      }
    }
    setApps(nextApps.slice(0, PRACTICE_APPS_MAX))
    setLinks(nextLinks.slice(0, PRACTICE_LINKS_MAX))
    onFilesChange([...files, planFile])
    setDraftApplied({ warnings: draft.personalInfoWarnings })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!cover.file && !cover.url) return setError("대표 사진을 올려 주세요.")
    if (subjects.length === 0) return setError("교과를 한 개 이상 선택하세요.")
    const lesson = lessonCount.trim() === "" ? null : Number(lessonCount)
    if (lesson !== null && !(Number.isInteger(lesson) && lesson >= 1 && lesson <= 99))
      return setError("차시는 1~99 사이 숫자로 써 주세요.")

    setSubmitting(true)
    try {
      const coverUrl = cover.file ? await uploadThumbnail(cover.file) : cover.url
      if (cover.file) setCover({ file: null, url: coverUrl }) // 다시 눌러도 재업로드 안 하게

      const input = {
        title,
        summary,
        coverUrl,
        categoryIds: subjects.flatMap((s) => [s, ...(subs[s] ?? [])]),
        target,
        lessonCount: lesson,
        body: stripEmptySections(body),
        links,
        files,
        visibility,
        privacyConfirmed: privacyOk,
      }

      let id = savedId.current
      if (id) await updatePractice(id, input)
      else {
        id = await createPractice(input)
        savedId.current = id
      }
      await setPracticeApps(id, apps)

      // 목록에서 뺀 첨부는 저장소에서도 정리(실패해도 무시).
      const keep = new Set(files.map((f) => f.path))
      await Promise.all(
        [...knownPaths.current].filter((p) => !keep.has(p)).map(removePracticeFile),
      )

      navigate(`/practices/${id}`, { replace: true })
    } catch (err) {
      setError(errorText(err, "저장하지 못했습니다."))
      console.error("[practices] 저장 실패:", err)
      setSubmitting(false)
    }
  }

  const busy = submitting

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      {/* ── 0. 설계안으로 초안 채우기 (새 글) ── */}
      {!isEdit && (
        <DraftFromPlan
          onDraft={applyDraft}
          canAttach={files.length < PRACTICE_FILES_MAX}
          disabled={busy}
        />
      )}
      {draftApplied && (
        <div role="status" className="-mt-4 rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="font-medium">설계안으로 초안을 채웠어요. 올리기 전에 꼭 읽고 다듬어 주세요.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">학생 반응·돌아보며</span>는 실제 수업에서 본 모습이라
              AI가 도와드리기 어려워요. 비워 두었으니 직접 채워 주세요(비워 두면 올릴 때 빠집니다).
            </li>
            <li>대표 사진은 직접 올려 주세요.</li>
            {draftApplied.warnings.map((w, i) => (
              <li key={i} className="text-destructive">
                개인정보 확인: {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 1. 기본 정보 ── */}
      <Section title="기본 정보">
        <Field label="제목" required>
          <input
            className={inputClass}
            placeholder="예: 달력 앱으로 오늘 날짜 말하기"
            value={title}
            maxLength={PRACTICE_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={busy}
          />
        </Field>

        <Field label="한 줄 요약" required>
          <input
            className={inputClass}
            placeholder="예: 매일 아침 활동으로 날짜·요일 말하기를 익힌 3주간의 기록"
            value={summary}
            onChange={(e) =>
              setSummary(Array.from(e.target.value).slice(0, PRACTICE_SUMMARY_MAX).join(""))
            }
            required
            disabled={busy}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>목록 카드에서 제목 아래에 보여요.</span>
            <span className="shrink-0 tabular-nums">
              {charCount(summary)} / {PRACTICE_SUMMARY_MAX}
            </span>
          </div>
        </Field>

        <Field
          label="대표 사진"
          required
          hint="목록 카드에 보이는 사진이에요. 16:9(1280×720)로 맞춰 올립니다. 학생 얼굴이 보이지 않는 사진을 권해요."
        >
          <CoverField value={cover} onChange={setCover} disabled={busy} />
        </Field>

        <Field
          label="교과"
          required
          hint={`${SUBJECTS_MAX}개까지 고를 수 있어요. 처음 고른 교과가 대표 교과입니다. 다시 누르면 해제돼요.`}
        >
          <div className="flex flex-wrap gap-2">
            {subjectCategories.map((c) => {
              const on = subjects.includes(c.id)
              const order = subjects.indexOf(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleSubject(c.id)}
                  disabled={busy || (!on && subjects.length >= SUBJECTS_MAX)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-40",
                    on
                      ? "border-foreground bg-accent font-medium text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {c.name}
                  {on && order === 0 && subjects.length > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">대표</span>
                  )}
                </button>
              )
            })}
          </div>
          {subjects
            .filter((s) => getSubcategories(s).length > 0)
            .map((s) => (
              <div key={s} className="mt-2 rounded-md border border-border bg-surface p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  {getCategory(s)?.name} 세부 분류 (선택)
                </p>
                <SubcategorySelect
                  parentId={s}
                  value={subs[s] ?? []}
                  onChange={(v) => setSubs((cur) => ({ ...cur, [s]: v }))}
                  disabled={busy}
                />
              </div>
            ))}
        </Field>

        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <Field label="대상 (선택)">
            <div className="flex flex-wrap gap-2">
              {practiceTargets.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTarget((cur) => (cur === t ? "" : t))}
                  disabled={busy}
                  aria-pressed={target === t}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50",
                    target === t
                      ? "border-foreground bg-accent font-medium text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="차시 (선택)">
            <div className="flex items-center gap-2">
              <input
                className={inputClass + " w-20"}
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={lessonCount}
                onChange={(e) => setLessonCount(e.target.value)}
                disabled={busy}
              />
              <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">차시</span>
            </div>
          </Field>
        </div>
      </Section>

      {/* ── 2. 본문 ── */}
      <Section
        title="수업 이야기"
        hint="소제목 틀이 미리 들어가 있어요. 지우거나 바꿔서 자유롭게 쓰셔도 됩니다. 사진은 본문 중간에 넣을 수 있어요."
      >
        <ul className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
          {practiceSections.map((s) => (
            <li key={s.title}>
              <span className="font-medium text-foreground">{s.title}</span> — {s.guide}
            </li>
          ))}
        </ul>
        <RichTextEditor key={editorKey} value={body} onChange={setBody} />
      </Section>

      {/* ── 3. 앱 연결 ── */}
      <Section
        title="이 수업에서 쓴 학습자료 (선택)"
        hint="누리집에 등록된 자료를 붙이면, 그 자료 상세에도 이 사례가 함께 보여요."
      >
        <AppLinkPicker value={apps} onChange={setApps} disabled={busy} />
      </Section>

      {/* ── 4. 첨부 ── */}
      <Section title="첨부 (선택)">
        <Field
          label="파일"
          hint={`수업 설계안·활동지 등. PDF·한글·워드·파워포인트·엑셀·이미지, 한 개 10MB까지 ${PRACTICE_FILES_MAX}개.`}
        >
          <FileListField
            value={files}
            onChange={onFilesChange}
            onBusyChange={setFileBusy}
            disabled={busy}
          />
        </Field>
        <Field
          label="링크"
          hint={`수업 영상·패들렛·구글 문서 등. ${PRACTICE_LINKS_MAX}개까지. 영상은 파일 대신 링크로 넣어 주세요.`}
        >
          <LinkListField value={links} onChange={setLinks} disabled={busy} />
        </Field>
      </Section>

      {/* ── 5. 공개 범위 · 개인정보 확인 ── */}
      <Section title="공개">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium">공개 범위</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {VISIBILITY_OPTIONS.map((opt) => (
              <label key={opt.value} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value)}
                  disabled={busy}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            '인증교사만'으로 하면 인증 안 한 방문자에게는 제목·요약·대표 사진만 보여요.
          </p>
        </fieldset>

        <label className="flex items-start gap-2.5 rounded-md border border-border bg-surface p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={privacyOk}
            onChange={(e) => setPrivacyOk(e.target.checked)}
            disabled={busy}
          />
          <span>
            <span className="font-medium">학생 개인정보 확인 (필수)</span>
            <span className="mt-0.5 block text-muted-foreground">{practicePrivacyCheck}</span>
          </span>
        </label>
      </Section>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link
          to={cancelTo}
          replace
          className="rounded-md border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={busy || fileBusy || !privacyOk}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "저장 중…" : fileBusy ? "파일 올리는 중…" : isEdit ? "수정 저장" : "올리기"}
        </button>
      </div>
    </form>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="border-b border-border pb-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}
