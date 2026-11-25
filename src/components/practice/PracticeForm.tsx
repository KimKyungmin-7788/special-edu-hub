import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import { ClipboardList, FileDown, History, ListOrdered, NotebookPen, Users, X } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import {
  getCategory,
  getSubcategories,
  subjectCategories,
  subcategoriesEnabledFor,
} from "@/config/categories"
import {
  practiceBodyTemplate,
  practicePrivacyCheck,
  practiceSections,
  practiceTargets,
  planText,
  practiceCopy,
  practiceDraftEnabled,
} from "@/config/practice"
import { uploadThumbnail, charCount, getApps, type App } from "@/lib/apps"
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
  PLAN_LEVELS,
  PLAN_LESSONS_MAX,
  emptyLesson,
  emptyPlan,
  type PlanStep,
  type PracticePlan,
  type Practice,
  type PracticeAppLink,
  type PracticeDraft,
  type PracticeFile,
  type PracticeLink,
  type PracticeVisibility,
} from "@/lib/practices"
import { SubcategorySelect } from "@/components/app/SubcategorySelect"
import { RichTextEditor } from "@/components/app/RichTextEditor"
import { type CoverValue } from "@/components/practice/CoverField"
import { CoverChoice } from "@/components/practice/CoverChoice"
import {
  PlanBar,
  PlanDivider,
  PlanGoalsFields,
  PlanGroupsFields,
  PlanLessonsFields,
  PlanRow,
  PlanTable,
  PlanToolNames,
  cellInput,
  type ToolOption,
} from "@/components/practice/PlanTable"
import { SelectedStandards } from "@/components/app/SelectedStandards"
import { RichTextViewer } from "@/components/app/RichTextViewer"
import { PlanView } from "@/components/practice/PlanView"
import { useAuth } from "@/lib/auth"
import {
  deleteWritingDraft,
  formatDraftTime,
  listWritingDrafts,
  saveWritingDraft,
  type WritingDraft,
  type WritingDraftData,
} from "@/lib/practiceDrafts"
import { StandardsFinderModal } from "@/components/app/StandardsFinderModal"
import { StandardsManualModal } from "@/components/app/StandardsManualModal"
import { AppLinkPicker } from "@/components/practice/AppLinkPicker"
import { LinkListField } from "@/components/practice/LinkListField"
import { FileListField } from "@/components/practice/FileListField"
import { PracticePhotoField } from "@/components/practice/PracticePhotoField"
import { removePracticePhotos } from "@/lib/practicePhotos"
import { DraftFromPlan } from "@/components/practice/DraftFromPlan"
import { FormField, FormPanel, chipClass, fieldInput } from "@/components/form/FormParts"

const inputClass = fieldInput

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

type Format = "plan" | "free"

/** 저장된 지도안을 빈 틀에 덮어 빠진 칸을 채운다(예전 형태·초안 대비). */
function normalizePlan(p: Partial<PracticePlan> | null | undefined): PracticePlan {
  const base = emptyPlan()
  if (!p) return base
  return {
    ...base,
    ...p,
    goals: { ...base.goals, ...(p.goals ?? {}) },
    groups: base.groups.map((g) => {
      const { method, ...saved } = p.groups?.find((x) => x.level === g.level) ?? g
      // 예전 '조정된 방법' 칸은 '조정된 내용 또는 학습과정'에 합친다.
      return { ...g, ...saved, content: [saved.content, method].map((x) => x?.trim()).filter(Boolean).join("\n") }
    }),
    lessons: p.lessons?.length
      ? p.lessons.map((l) => ({ ...emptyLesson(), ...l }))
      : base.lessons,
    standards: p.standards ?? [],
    tools: p.tools ?? [],
    photos: p.photos ?? [],
  }
}

/** 임시 저장할 만큼 뭔가 썼는지 — 빈 화면을 열기만 해도 카드가 생기지 않게. */
function draftHasContent(d: WritingDraftData): boolean {
  const p = d.plan
  return (
    d.title.trim() !== "" ||
    d.summary.trim() !== "" ||
    d.apps.length > 0 ||
    d.files.length > 0 ||
    (d.format === "free" && stripEmptySections(d.body) !== "") ||
    (d.format === "plan" &&
      (p.unit.trim() !== "" ||
        PLAN_LEVELS.some((l) => p.goals[l].trim() !== "") ||
        p.groups.some((g) => g.performance || g.content || g.highTouch) ||
        p.lessons.some((l) => l.intro.text || l.main.text || l.wrap.text) ||
        p.evaluation.trim() !== "" ||
        p.reaction.trim() !== "" ||
        p.reflection.trim() !== "" ||
        !!p.photos?.length))
  )
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
  const [photoOk, setPhotoOk] = useState(isEdit)
  const [fileBusy, setFileBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 에디터는 처음 값만 읽으므로, 초안으로 본문을 바꿀 때 key 를 바꿔 다시 그린다.
  const [editorKey, setEditorKey] = useState(0)
  const [draftApplied, setDraftApplied] = useState<{ warnings: string[] } | null>(null)
  // 새 글은 지도안이 기본. 예전 글(plan 없음)은 자유 본문.
  const [format, setFormat] = useState<Format>(practice && !practice.plan ? "free" : "plan")
  const [plan, setPlan] = useState<PracticePlan>(() => normalizePlan(practice?.plan))
  const [finderOpen, setFinderOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [allApps, setAllApps] = useState<App[]>([])

  useEffect(() => {
    getApps().then(setAllApps)
  }, [])

  const linkedApps = useMemo(() => {
    const byId = new Map(allApps.map((a) => [a.id, a]))
    return apps.map((l) => byId.get(l.appId)).filter((a): a is App => !!a)
  }, [allApps, apps])

  const toolOptions: ToolOption[] = [
    ...linkedApps.map((a) => ({ value: `app:${a.id}`, label: a.title })),
    ...plan.tools.map((t) => ({ value: `tool:${t}`, label: t })),
  ]
  const patchPlan = (patch: Partial<PracticePlan>) => setPlan((cur) => ({ ...cur, ...patch }))

  // 이번 편집에서 저장소에 있던/올린 파일 경로 — 저장 후 목록에서 빠진 것만 지운다.
  const knownPaths = useRef(new Set((practice?.files ?? []).map((f) => f.path)))
  const knownPhotos = useRef(new Set((practice?.plan?.photos ?? []).map((p) => p.path)))
  // 새 글 저장이 중간(앱 연결)에서 실패했을 때 다시 누르면 중복 등록 대신 수정으로.
  const savedId = useRef<string | null>(practice?.id ?? null)

  // ── 작성 중인 사례(73): 새 글은 쓰는 동안 자동 저장, 다시 들어오면 카드로 이어 쓰기 ──
  const { session } = useAuth()
  const draftsOn = !isEdit && !!session
  const [drafts, setDrafts] = useState<WritingDraft[]>([])
  const [draftId, setDraftId] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const draftIdRef = useRef<string | null>(null)
  const lastSnap = useRef("")
  const saveChain = useRef<Promise<void>>(Promise.resolve())
  const draftData: WritingDraftData = {
    format,
    title,
    summary,
    coverUrl: cover.url,
    subjects,
    subs,
    target,
    lessonCount,
    body,
    apps,
    links,
    files,
    visibility,
    plan,
  }
  const dataRef = useRef(draftData)
  dataRef.current = draftData
  const snapshot = JSON.stringify(draftData)

  useEffect(() => {
    if (draftsOn) listWritingDrafts().then(setDrafts)
  }, [draftsOn])

  /** 지금 내용을 임시 저장(내용이 있고 바뀌었을 때만). 저장은 하나씩 차례로 — 같은 글이 두 번 생기지 않게. */
  function saveNow(): Promise<void> {
    saveChain.current = saveChain.current.then(async () => {
      if (!draftsOn) return
      const d = dataRef.current
      const snap = JSON.stringify(d)
      if (snap === lastSnap.current || !draftHasContent(d)) return
      try {
        const r = await saveWritingDraft(draftIdRef.current, d.title, d)
        draftIdRef.current = r.id
        lastSnap.current = snap
        setDraftId(r.id)
        setSavedAt(r.updatedAt)
        setSaveError(null)
      } catch (err) {
        setSaveError(errorText(err, "임시 저장하지 못했어요."))
      }
    })
    return saveChain.current
  }

  useEffect(() => {
    if (!draftsOn || submitting) return
    const t = setTimeout(() => void saveNow(), 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, draftsOn, submitting])

  useEffect(() => {
    if (!draftsOn) return
    const onHide = () => document.visibilityState === "hidden" && void saveNow()
    document.addEventListener("visibilitychange", onHide)
    return () => document.removeEventListener("visibilitychange", onHide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftsOn])

  /** 카드를 누르면: 지금 쓰던 것은 저장해 카드로 남기고, 고른 것을 불러와 이어 쓴다. */
  async function openDraft(d: WritingDraft) {
    await saveNow()
    const x = d.data
    setFormat(x.format)
    setTitle(x.title)
    setSummary(x.summary)
    setCover({ file: null, url: x.coverUrl })
    setSubjects(x.subjects)
    setSubs(x.subs)
    setTarget(x.target)
    setLessonCount(x.lessonCount)
    setBody(x.body)
    setApps(x.apps)
    setLinks(x.links)
    setFiles(x.files)
    for (const f of x.files) knownPaths.current.add(f.path)
    setVisibility(x.visibility)
    setPlan(normalizePlan(x.plan))
    for (const p of x.plan.photos ?? []) knownPhotos.current.add(p.path)
    setEditorKey((k) => k + 1)
    draftIdRef.current = d.id
    lastSnap.current = JSON.stringify(x)
    setDraftId(d.id)
    setSavedAt(d.updatedAt)
    setDrafts(await listWritingDrafts())
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function discardDraft(d: WritingDraft) {
    if (!window.confirm(`'${d.title || "제목 없음"}' 작성 중인 사례를 지울까요? 되돌릴 수 없어요.`)) return
    await deleteWritingDraft(d.id)
    setDrafts((cur) => cur.filter((x) => x.id !== d.id))
  }

  /** 지금까지 쓴 내용을 인쇄 창으로 — 'PDF로 저장'을 고르면 PDF 파일이 된다. */
  function printSheet() {
    const prevTitle = document.title
    document.title = title.trim() || "수업 사례"
    document.body.classList.add("printing-sheet")
    const done = () => {
      document.body.classList.remove("printing-sheet")
      document.title = prevTitle
      window.removeEventListener("afterprint", done)
    }
    window.addEventListener("afterprint", done)
    window.print()
  }

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
    const planTouched =
      PLAN_LEVELS.some((l) => plan.goals[l].trim() !== "") ||
      plan.lessons.some((l) => l.intro.text || l.main.text || l.wrap.text)
    const hasInput =
      title.trim() !== "" ||
      (format === "plan" ? planTouched : summary.trim() !== "" || stripEmptySections(body) !== "")
    if (hasInput && !window.confirm("이미 쓴 내용을 초안으로 바꿀까요?")) {
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
            subcategoriesEnabledFor(sid)
              ? draft.subcategoryIds.filter((id) => getCategory(id)?.parentId === sid)
              : [],
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

    // 지도안 칸: 단계별 도구 이름은 연결한 자료 제목이면 그 자료로, 아니면 바깥 도구로.
    if (draft.plan) {
      const d = draft.plan
      const linked = nextApps.map((x) => allApps.find((a) => a.id === x.appId)).filter((a): a is App => !!a)
      const tools = [...new Set(d.tools.map((t) => t.trim()).filter(Boolean))]
      const toolValue = (name: string): string => {
        const n = name.trim()
        if (!n) return ""
        const app = linked.find((a) => a.title.includes(n) || n.includes(a.title))
        if (app) return `app:${app.id}`
        if (!tools.includes(n)) tools.push(n)
        return `tool:${n}`
      }
      const step = (s: { text: string; tool: string }): PlanStep => ({ text: s.text, tool: toolValue(s.tool) })
      setPlan(
        normalizePlan({
          unit: d.unit,
          standards: plan.standards,
          goals: d.goals,
          groups: d.groups,
          lessons: d.lessons.slice(0, PLAN_LESSONS_MAX).map((l) => ({
            minutes: l.minutes > 0 ? l.minutes : 40,
            intro: step(l.intro),
            main: step(l.main),
            wrap: step(l.wrap),
          })),
          evaluation: d.evaluation,
          tools: tools.slice(0, 10),
          reaction: plan.reaction,
          reflection: plan.reflection,
          photos: plan.photos,
        }),
      )
    }
    onFilesChange([...files, planFile])
    setDraftApplied({ warnings: draft.personalInfoWarnings })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!cover.file && !cover.url)
      return setError(format === "plan" ? "표지를 골라 주세요." : "대표 사진을 올려 주세요.")
    if (subjects.length === 0) return setError("교과를 한 개 이상 선택하세요.")
    const isPlan = format === "plan"
    // 빠진 자료를 가리키는 단계 도구는 비운다.
    const valid = new Set(toolOptions.map((o) => o.value))
    const clean = (st: PlanStep): PlanStep => ({ text: st.text.trim(), tool: valid.has(st.tool) ? st.tool : "" })
    const savedPlan: PracticePlan | null = isPlan
      ? {
          ...plan,
          lessons: plan.lessons.map((l) => ({ ...l, intro: clean(l.intro), main: clean(l.main), wrap: clean(l.wrap) })),
        }
      : null
    if (isPlan && plan.photos?.length && !photoOk) return setError(planText.photos.checkRequired)
    const lesson = isPlan ? plan.lessons.length : lessonCount.trim() === "" ? null : Number(lessonCount)
    if (lesson !== null && !(Number.isInteger(lesson) && lesson >= 1 && lesson <= 99))
      return setError("차시는 1~99 사이 숫자로 써 주세요.")

    setSubmitting(true)
    try {
      const coverUrl = cover.file ? await uploadThumbnail(cover.file) : cover.url
      if (cover.file) setCover({ file: null, url: coverUrl }) // 다시 눌러도 재업로드 안 하게

      const input = {
        title,
        // 지도안 글은 한 줄 요약 대신 수업 목표 '가'를 목록 카드에 보여 준다.
        summary: isPlan ? Array.from(plan.goals.가.trim()).slice(0, PRACTICE_SUMMARY_MAX).join("") : summary,
        coverUrl,
        categoryIds: subjects.flatMap((s) => [s, ...(subs[s] ?? [])]),
        target,
        lessonCount: lesson,
        body: isPlan ? "" : stripEmptySections(body),
        links,
        files,
        visibility,
        privacyConfirmed: privacyOk,
        plan: savedPlan,
      }

      let id = savedId.current
      if (id) await updatePractice(id, input)
      else {
        id = await createPractice(input)
        savedId.current = id
      }
      await setPracticeApps(id, apps)

      // 목록에서 뺀 첨부는 저장소에서도 정리(실패해도 무시). 다른 작성 중인 사례가 쓰는 파일은 남긴다.
      const keep = new Set([
        ...files.map((f) => f.path),
        ...drafts.filter((d) => d.id !== draftIdRef.current).flatMap((d) => d.data.files.map((f) => f.path)),
      ])
      await Promise.all(
        [...knownPaths.current].filter((p) => !keep.has(p)).map(removePracticeFile),
      )
      const keepPhotos = new Set([
        ...(savedPlan?.photos ?? []).map((p) => p.path),
        ...drafts.filter((d) => d.id !== draftIdRef.current).flatMap((d) => (d.data.plan.photos ?? []).map((p) => p.path)),
      ])
      await removePracticePhotos([...knownPhotos.current].filter((p) => !keepPhotos.has(p)))

      if (draftIdRef.current) await deleteWritingDraft(draftIdRef.current)
      navigate(`/practices/${id}`, { replace: true })
    } catch (err) {
      setError(errorText(err, "저장하지 못했습니다."))
      console.error("[practices] 저장 실패:", err)
      setSubmitting(false)
    }
  }

  const busy = submitting

  const titleInput = (
    <input
      className={format === "plan" ? cellInput : inputClass}
      placeholder="예: 달력 앱으로 오늘 날짜 말하기"
      value={title}
      maxLength={PRACTICE_TITLE_MAX}
      onChange={(e) => setTitle(e.target.value)}
      aria-label={planText.title}
      required
      disabled={busy}
    />
  )

  const subjectPicker = (
    <>
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
              className={chipClass(on)}
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
        .filter((sid) => getSubcategories(sid).length > 0)
        .map((sid) => (
          <div key={sid} className="mt-1 rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              {getCategory(sid)?.name} {getCategory(sid)?.monthly ? "해당 월" : "세부 분류"} (선택)
            </p>
            <SubcategorySelect
              parentId={sid}
              value={subs[sid] ?? []}
              onChange={(v) => setSubs((cur) => ({ ...cur, [sid]: v }))}
              disabled={busy}
            />
          </div>
        ))}
    </>
  )

  const targetPicker = (
    <div className="flex flex-wrap gap-2">
      {practiceTargets.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTarget((cur) => (cur === t ? "" : t))}
          disabled={busy}
          aria-pressed={target === t}
          className={chipClass(target === t)}
        >
          {t}
        </button>
      ))}
    </div>
  )

  const coverChoice = <CoverChoice apps={linkedApps} value={cover} onChange={setCover} disabled={busy} />

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* ── 작성 중인 사례(이어 쓰기) ── */}
      {draftsOn && drafts.some((d) => d.id !== draftId) && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <History className="size-4" aria-hidden />
            아직 작성 중인 사례가 있습니다
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {drafts
              .filter((d) => d.id !== draftId)
              .map((d) => (
                <li key={d.id} className="relative">
                  <button
                    type="button"
                    onClick={() => openDraft(d)}
                    disabled={busy}
                    className="flex w-full flex-col items-start gap-1 rounded-lg border border-border bg-surface px-3 py-2.5 pr-9 text-left hover:border-primary hover:bg-accent"
                  >
                    <span className="line-clamp-1 text-sm font-medium">
                      {d.title || d.data.plan?.goals?.가 || "제목 없음"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {planText.formats[d.data.format]} · 마지막 작성 {formatDraftTime(d.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => discardDraft(d)}
                    aria-label={`${d.title || "제목 없음"} 지우기`}
                    title="지우기"
                    className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* ── 양식 고르기 + 저장 상태 + PDF ── */}
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="쓰는 양식">
        {(["plan", "free"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={format === f}
            onClick={() => setFormat(f)}
            disabled={busy}
            className={
              format === f
                ? "rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-full border border-border bg-card px-5 py-2 text-sm text-muted-foreground hover:bg-accent"
            }
          >
            {planText.formats[f]}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3">
          {draftsOn && (saveError || savedAt) && (
            <span className={saveError ? "text-xs text-destructive" : "text-xs text-muted-foreground"} role="status">
              {saveError ?? `임시 저장됨 · ${formatDraftTime(savedAt!)}`}
            </span>
          )}
          <button
            type="button"
            onClick={printSheet}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
          >
            <FileDown className="size-4" aria-hidden />
            PDF로 저장
          </button>
        </span>
      </div>
      {!isEdit && practiceDraftEnabled && (
        <DraftFromPlan
          onDraft={applyDraft}
          canAttach={files.length < PRACTICE_FILES_MAX}
          disabled={busy}
        />
      )}
      {draftApplied && (
        <div role="status" className="-mt-4 rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium">설계안으로 초안을 채웠어요. 올리기 전에 꼭 읽고 다듬어 주세요.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">학생 반응·돌아보며</span>는 실제 수업에서 본 모습이라
              AI가 도와드리기 어려워요. 비워 두었으니 직접 채워 주세요(비워 두면 올릴 때 빠집니다).
            </li>
            <li>{format === "plan" ? "표지를 골라 주세요." : "대표 사진은 직접 올려 주세요."}</li>
            {draftApplied.warnings.map((w, i) => (
              <li key={i} className="text-destructive">
                개인정보 확인: {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {format === "plan" ? (
        <PlanTable>
          <PlanBar icon={ClipboardList}>{planText.bars.head}</PlanBar>
          <PlanRow label={planText.subject} required>
            <div className="flex flex-col gap-2 p-3">{subjectPicker}</div>
          </PlanRow>
          <PlanRow label={planText.title} required>
            {titleInput}
          </PlanRow>
          <PlanRow label={planText.target}>
            <div className="p-3">{targetPicker}</div>
          </PlanRow>
          <PlanRow label={planText.unit}>
            <input
              className={cellInput}
              placeholder="예: 날짜와 요일"
              value={plan.unit}
              maxLength={60}
              onChange={(e) => patchPlan({ unit: e.target.value })}
              aria-label={planText.unit}
              disabled={busy}
            />
          </PlanRow>
          <PlanRow label={planText.standards}>
            <div className="p-3">
              <SelectedStandards
                codes={plan.standards}
                onChange={(standards) => patchPlan({ standards })}
                onOpenFinder={() => setFinderOpen(true)}
                onOpenManual={() => setManualOpen(true)}
                disabled={busy}
              />
            </div>
          </PlanRow>
          <PlanRow label={planText.goals} required>
            <PlanGoalsFields goals={plan.goals} onChange={(goals) => patchPlan({ goals })} disabled={busy} />
          </PlanRow>
          <PlanRow label={planText.tools}>
            <div className="flex flex-col gap-3 p-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{planText.toolsApps}</p>
                <AppLinkPicker value={apps} onChange={setApps} disabled={busy} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{planText.toolsOther}</p>
                <PlanToolNames value={plan.tools} onChange={(tools) => patchPlan({ tools })} disabled={busy} />
              </div>
            </div>
          </PlanRow>

          <PlanBar icon={Users}>{planText.bars.groups}</PlanBar>
          <PlanGroupsFields groups={plan.groups} onChange={(groups) => patchPlan({ groups })} disabled={busy} />

          <PlanBar icon={ListOrdered}>
            {planText.bars.lessons} · {plan.lessons.length}차시
          </PlanBar>
          <PlanLessonsFields
            lessons={plan.lessons}
            onChange={(lessons) => patchPlan({ lessons })}
            toolOptions={toolOptions}
            disabled={busy}
          />
          <PlanRow label={planText.evaluation}>
            <textarea
              className={cellInput + " min-h-[3.5rem] resize-y"}
              rows={2}
              placeholder={planText.evaluationPlaceholder}
              value={plan.evaluation}
              onChange={(e) => patchPlan({ evaluation: e.target.value })}
              aria-label={planText.evaluation}
              disabled={busy}
            />
          </PlanRow>

        </PlanTable>
      ) : null}
      {format === "plan" && (
        <>
          <PlanDivider>{planText.recordIntro}</PlanDivider>
          <PlanTable>
          <PlanBar icon={NotebookPen} tone="record">{planText.bars.record}</PlanBar>
          <PlanRow label={planText.reaction}>
            <textarea
              className={cellInput + " min-h-[5rem] resize-y"}
              rows={3}
              placeholder={planText.reactionPlaceholder}
              value={plan.reaction}
              onChange={(e) => patchPlan({ reaction: e.target.value })}
              aria-label={planText.reaction}
              disabled={busy}
            />
          </PlanRow>
          <PlanRow label={planText.reflection}>
            <textarea
              className={cellInput + " min-h-[5rem] resize-y"}
              rows={3}
              placeholder={planText.reflectionPlaceholder}
              value={plan.reflection}
              onChange={(e) => patchPlan({ reflection: e.target.value })}
              aria-label={planText.reflection}
              disabled={busy}
            />
          </PlanRow>
          <PlanRow
            label={
              <span>
                {planText.photos.label}
                <span className="block text-xs font-normal text-muted-foreground">{planText.photos.max}</span>
              </span>
            }
          >
            <PracticePhotoField
              value={plan.photos ?? []}
              onChange={(photos) => {
                for (const p of photos) knownPhotos.current.add(p.path)
                if (photos.length > (plan.photos?.length ?? 0)) setPhotoOk(false) // 새 사진은 다시 확인
                patchPlan({ photos })
              }}
              checked={photoOk}
              onCheckedChange={setPhotoOk}
              onBusyChange={setFileBusy}
              disabled={busy}
            />
          </PlanRow>

          </PlanTable>
          <Section title={planText.cover}>{coverChoice}</Section>
        </>
      )}
      {format === "free" && (
        <>
          {/* ── 1. 기본 정보 ── */}
          <Section title="기본 정보">
            <Field label="제목" required>
              {titleInput}
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
              {coverChoice}
            </Field>

            <Field
              label="교과"
              required
              hint={`${SUBJECTS_MAX}개까지 고를 수 있어요. 처음 고른 교과가 대표 교과입니다. 다시 누르면 해제돼요.`}
            >
              {subjectPicker}
            </Field>

            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
              <Field label="대상 (선택)">{targetPicker}</Field>
              <Field label="차시 (선택)">
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass + " w-24"}
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
              {practiceSections.map((sec) => (
                <li key={sec.title}>
                  <span className="font-medium text-foreground">{sec.title}</span> — {sec.guide}
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
        </>
      )}

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

        <label className="flex items-start gap-2.5 rounded-md border border-border bg-card p-3 text-sm">
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
          className="rounded-xl border border-border bg-card px-6 py-3 text-base font-medium text-foreground hover:bg-accent"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={busy || fileBusy || !privacyOk}
          className="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "저장 중…" : fileBusy ? "파일 올리는 중…" : isEdit ? "수정 저장" : "올리기"}
        </button>
      </div>

      {/* 인쇄본(화면에는 숨김) — 'PDF로 저장'을 누르면 이것만 인쇄된다 */}
      <div className="print-sheet" aria-hidden>
        {format === "plan" ? (
          <PlanView
            plan={plan}
            apps={linkedApps}
            full
            head={{
              subject: subjects.map((sid) => getCategory(sid)?.name).join("·"),
              title,
              target,
            }}
          />
        ) : (
          <PlanTable>
            <PlanBar icon={ClipboardList}>{practiceCopy.writeTitle}</PlanBar>
            <PlanRow label="제목">
              <p className="min-h-[2.75rem] px-3 py-2.5">{title}</p>
            </PlanRow>
            <PlanRow label="한 줄 요약">
              <p className="min-h-[2.75rem] px-3 py-2.5">{summary}</p>
            </PlanRow>
            <PlanRow label={planText.subject}>
              <p className="min-h-[2.75rem] px-3 py-2.5">{subjects.map((sid) => getCategory(sid)?.name).join("·")}</p>
            </PlanRow>
            <PlanRow label={planText.target}>
              <p className="min-h-[2.75rem] px-3 py-2.5">{target}</p>
            </PlanRow>
            <PlanRow label="차시">
              <p className="min-h-[2.75rem] px-3 py-2.5">{lessonCount && `${lessonCount}차시`}</p>
            </PlanRow>
            <PlanRow label="수업 이야기">
              <div className="min-h-[12rem] px-3 py-2.5">
                <RichTextViewer html={body} />
              </div>
            </PlanRow>
          </PlanTable>
        )}
      </div>

      <StandardsFinderModal
        open={finderOpen}
        onClose={() => setFinderOpen(false)}
        initialApp={plan.goals.가.trim() || title.trim()}
        selected={plan.standards}
        onConfirm={(standards) => patchPlan({ standards })}
      />
      <StandardsManualModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        selected={plan.standards}
        onAdd={(code) =>
          setPlan((cur) => (cur.standards.includes(code) ? cur : { ...cur, standards: [...cur.standards, code] }))
        }
      />
    </form>
  )
}

/** 구역 — 공용 패널(FormPanel)로 감싼다. */
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <FormPanel title={title} hint={hint}>
      {children}
    </FormPanel>
  )
}

/** 칸 — 공용 FormField. 라벨의 "(선택)" 은 optional 로 표시. */
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
  const optional = label.endsWith(" (선택)")
  return (
    <FormField
      label={optional ? label.replace(" (선택)", "") : label}
      required={required}
      optional={optional}
      hint={hint}
    >
      {children}
    </FormField>
  )
}
