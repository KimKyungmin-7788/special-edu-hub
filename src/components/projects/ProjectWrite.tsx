import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { projectPath, projects } from "@/config/projects"
import { useAuth } from "@/lib/auth"
import { uploadThumbnail, charCount } from "@/lib/apps"
import { createProject, getProject, PROJECT_BODY_MAX, PROJECT_NEEDED_MAX, PROJECT_TITLE_MAX, PROJECT_VISION_MAX, projectError, updateProject, type Project } from "@/lib/projects"
import { CoverField, type CoverValue } from "@/components/practice/CoverField"

const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

/** 프로젝트 열기(/write)·고치기(/:id/edit). 교사인증 회원만 — DB 가 다시 막는다. */
export function ProjectWrite() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile, loading, isStaff } = useAuth()
  const f = projects.form
  const [original, setOriginal] = useState<Project | null>(null)
  const [title, setTitle] = useState("")
  const [vision, setVision] = useState("")
  const [needed, setNeeded] = useState(2)
  const [mockup, setMockup] = useState("")
  const [cover, setCover] = useState<CoverValue>({ file: null, url: "" })
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!id) return
    getProject(id).then((p) => {
      if (!p) return setError("프로젝트를 찾을 수 없어요.")
      setOriginal(p); setTitle(p.title); setVision(p.vision); setNeeded(p.needed); setMockup(p.mockup_url); setCover({ file: null, url: p.cover_url }); setBody(p.body)
    }).catch((e) => setError(projectError(e)))
  }, [id])

  if (loading || (user && !profile)) return <p role="status">확인하고 있어요…</p>
  if (!user || !profile?.isTeacherVerified) return <div role="alert" className="max-w-3xl rounded-xl border bg-card p-6">
    <h1 className="font-semibold">{user ? "교사인증이 필요해요" : "로그인이 필요해요"}</h1>
    <Link to={user ? "/verify" : "/login"} className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{user ? "교사인증하기" : "로그인하기"}</Link>
  </div>
  if (id && original && original.leader_id !== user.id && !isStaff) return <p role="alert">리더만 고칠 수 있어요.</p>

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !vision.trim()) return setError(`${f.title}과 ${f.vision}을 써 주세요.`)
    if (mockup.trim() && !/^https:\/\//.test(mockup.trim())) return setError("목업 링크는 https:// 로 시작하는 주소만 넣을 수 있어요.")
    setBusy(true); setError("")
    try {
      const coverUrl = cover.file ? await uploadThumbnail(cover.file) : cover.url
      if (cover.file) setCover({ file: null, url: coverUrl })
      const data = { title: title.trim(), vision: vision.trim(), body: body.trim(), cover_url: coverUrl, mockup_url: mockup.trim(), needed }
      const target = id ?? await createProject(user!.id, data)
      if (id) await updateProject(id, data)
      navigate(projectPath(target))
    } catch (err) {
      setError(err instanceof Error && !("code" in err) ? err.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.")
    } finally { setBusy(false) }
  }

  return <form onSubmit={submit} className="max-w-3xl">
    <Link to={id ? projectPath(id) : projects.listPath} className="mb-5 inline-block text-sm text-muted-foreground hover:text-primary">← {projects.title}</Link>
    <h1 className="mb-2 text-2xl font-bold">{id ? f.editHeading : f.heading}</h1>
    <p className="mb-6 text-sm text-muted-foreground">{f.guard}</p>
    <div className="flex flex-col gap-5">
      <Field label={f.title} count={`${charCount(title)}/${PROJECT_TITLE_MAX}`}><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={PROJECT_TITLE_MAX} required placeholder={f.titlePlaceholder} className={input} /></Field>
      <Field label={f.vision} count={`${charCount(vision)}/${PROJECT_VISION_MAX}`}><input value={vision} onChange={(e) => setVision(e.target.value)} maxLength={PROJECT_VISION_MAX} required placeholder={f.visionPlaceholder} className={input} /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={f.needed}><select value={needed} onChange={(e) => setNeeded(Number(e.target.value))} className={input}>{Array.from({ length: PROJECT_NEEDED_MAX }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{f.neededOption(n)}</option>)}</select></Field>
        <Field label={f.mockup}><input type="url" value={mockup} onChange={(e) => setMockup(e.target.value)} placeholder="https://" className={input} /></Field>
      </div>
      <Field label={f.cover}><CoverField value={cover} onChange={setCover} disabled={busy} /></Field>
      <Field label={f.body} count={`${charCount(body)}/${PROJECT_BODY_MAX}`}><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={PROJECT_BODY_MAX} rows={8} placeholder={f.bodyPlaceholder} className={input} /></Field>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <button type="submit" disabled={busy} className="mt-6 rounded-lg bg-cta px-6 py-3 text-sm font-semibold whitespace-nowrap text-cta-foreground disabled:opacity-60">{busy ? "저장하는 중…" : id ? f.save : f.submit}</button>
  </form>
}

function Field({ label, count, children }: { label: string; count?: string; children: React.ReactNode }) {
  return <label className="block">
    <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-semibold"><span>{label}</span>{count && <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">{count}</span>}</span>
    {children}
  </label>
}
