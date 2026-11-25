import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, X } from "lucide-react"
import { projects } from "@/config/projects"
import { getApp, getMyApps, type App } from "@/lib/apps"
import {
  addUpdate, deleteUpdate, extendDue, finishProject, NOTE_MAX, REVIEW_MAX, rpcError, setNote, stopProject, todayLocal, UPDATE_MAX,
  type CollabNote, type CollabUpdate, type Member, type Project,
} from "@/lib/projects"
import { cn } from "@/lib/utils"

const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
const plain = "rounded-md border px-3 py-2 text-sm whitespace-nowrap hover:bg-accent disabled:opacity-60"
const md = (d: string) => { const [, m, day] = d.split("-"); return `${Number(m)}월 ${Number(day)}일` }
const dot = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(/\s/g, "").replace(/\.$/, "")

/** 진행 소식: 누구나 봄, 작업 중이면 리더가 한 줄씩 남김 */
export function UpdatesSection({ project: p, updates, isLeader, isStaff, onChange }: { project: Project; updates: CollabUpdate[]; isLeader: boolean; isStaff: boolean; onChange: () => void }) {
  const t = projects.updates
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const canWrite = isLeader && p.status === "working"
  if (!canWrite && updates.length === 0) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true); setError("")
    try { await addUpdate(p.id, body); setBody(""); onChange() } catch (err) { setError(rpcError(err)) } finally { setBusy(false) }
  }
  return <section aria-labelledby="collab-updates" className="mt-8 border-t pt-6">
    <h2 id="collab-updates" className="mb-3 font-semibold">{t.heading}</h2>
    {canWrite && <form onSubmit={submit} className="mb-4 flex gap-2">
      <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={UPDATE_MAX} placeholder={t.placeholder} aria-label={t.heading} className={cn(input, "min-w-0 flex-1")} />
      <button type="submit" disabled={busy || !body.trim()} className={plain}>{t.add}</button>
    </form>}
    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
    {updates.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : <ul className="divide-y text-sm">
      {updates.map((u) => <li key={u.id} className="flex items-start gap-3 py-2">
        <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{dot(u.created_at)}</span>
        <span className="min-w-0 flex-1 break-keep">{u.body}</span>
        {(isLeader || isStaff) && <button type="button" aria-label="소식 지우기" className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive" onClick={async () => {
          if (!confirm("이 소식을 지울까요?")) return
          try { await deleteUpdate(u.id); onChange() } catch (err) { alert(rpcError(err)) }
        }}><X className="size-4" aria-hidden /></button>}
      </li>)}
    </ul>}
  </section>
}

/** 마감 지남(리더만, 상세 맨 위): 기한 늘리기 / 완성으로 바꾸기 / 그만두기 */
export function OverduePanel({ project: p, onFinish, onChange }: { project: Project; onFinish: () => void; onChange: () => void }) {
  const t = projects.overdue
  const [extending, setExtending] = useState(false)
  const [due, setDue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function extend(e: FormEvent) {
    e.preventDefault()
    if (!due) return
    setBusy(true); setError("")
    try { await extendDue(p.id, due); onChange() } catch (err) { setError(rpcError(err)) } finally { setBusy(false) }
  }
  async function stop() {
    if (!confirm("프로젝트를 그만둘까요? 함께한 사람에게 알림이 가요.")) return
    setBusy(true)
    try { await stopProject(p.id); onChange() } catch (err) { alert(rpcError(err)) } finally { setBusy(false) }
  }
  return <section aria-label={t.heading(md(p.due_date!))} className="mb-6 rounded-xl border-2 border-cta bg-card p-5">
    <h2 className="font-semibold">{t.heading(md(p.due_date!))}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t.question}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => setExtending((v) => !v)} className={plain}>{t.extend}</button>
      <button type="button" disabled={busy} onClick={onFinish} className={cn(plain, "border-primary font-semibold text-primary")}>{t.finish}</button>
      <button type="button" disabled={busy} onClick={stop} className={plain}>{t.stop}</button>
    </div>
    {extending && <form onSubmit={extend} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="text-sm">{t.newDue}<input type="date" min={todayLocal()} value={due} onChange={(e) => setDue(e.target.value)} required className={cn(input, "mt-1")} /></label>
      <button type="submit" disabled={busy} className={plain}>{t.save}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </section>
}

/** 완성하기 / 후기 고치기(리더): 협업 과정·후기 + 내 자료 하나 연결(선택) */
export function FinishForm({ project: p, onCancel, onChange }: { project: Project; onCancel: () => void; onChange: () => void }) {
  const t = projects.finish
  const editing = p.status === "done"
  const [review, setReview] = useState(p.review)
  const [appId, setAppId] = useState(p.app_id ?? "")
  const [apps, setApps] = useState<App[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { getMyApps().then(setApps) }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!review.trim()) return setError(`${t.review}을 써 주세요.`)
    if (!editing && !confirm("완성으로 바꿀까요? 함께한 사람에게 알림이 가요.")) return
    setBusy(true); setError("")
    try { await finishProject(p.id, review, appId); onChange() } catch (err) { setError(rpcError(err)) } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="mt-8 flex flex-col gap-3 rounded-xl border bg-card p-5">
    <h2 className="font-semibold">{editing ? t.editHeading : t.heading}</h2>
    <label className="text-sm font-semibold">{t.review}<textarea value={review} onChange={(e) => setReview(e.target.value)} maxLength={REVIEW_MAX} required rows={6} placeholder={t.reviewPlaceholder} className={cn(input, "mt-1 font-normal")} /></label>
    <label className="text-sm font-semibold">{t.app}
      <select value={appId} onChange={(e) => setAppId(e.target.value)} className={cn(input, "mt-1 font-normal")}>
        <option value="">{t.noApp}</option>
        {apps.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-primary-foreground disabled:opacity-60">{editing ? t.save : t.submit}</button>
      <button type="button" onClick={onCancel} className={plain}>취소</button>
    </div>
  </form>
}

/** 완성 상세: 후기, 연결한 자료, 함께한 사람의 한 줄(본인은 쓰고 고침) */
export function DoneSection({ project: p, members, notes, myId, onChange }: { project: Project; members: Member[]; notes: CollabNote[]; myId?: string; onChange: () => void }) {
  const t = projects.done
  const [app, setApp] = useState<App | undefined>()
  const mine = notes.find((n) => n.user_id === myId)
  const [note, setNoteText] = useState(mine?.body ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { if (p.app_id) getApp(p.app_id).then(setApp); else setApp(undefined) }, [p.app_id])
  useEffect(() => { setNoteText(mine?.body ?? "") }, [mine?.body])
  const isMember = !!myId && members.some((m) => m.user_id === myId)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError("")
    try { await setNote(p.id, note); onChange() } catch (err) { setError(rpcError(err)) } finally { setBusy(false) }
  }
  return <section aria-label={t.review} className="mt-8 border-t pt-6">
    <h2 className="font-semibold">{t.review}</h2>
    <p className="mt-2 leading-relaxed whitespace-pre-line break-keep">{p.review}</p>
    {app && <Link to={`/app/${app.id}`} className="mt-5 flex items-center gap-3 rounded-lg border p-3 hover:border-brand-line">
      {app.thumbnailUrl ? <img src={app.thumbnailUrl} alt="" className="h-12 w-16 shrink-0 rounded-md border object-cover" /> : <span className="h-12 w-16 shrink-0 rounded-md bg-brand-soft" />}
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{app.title}</span><span className="text-xs text-muted-foreground">{t.app}</span></span>
      <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
    </Link>}
    {members.length > 0 && <>
      <h3 className="mt-6 mb-2 font-semibold">{t.notes}</h3>
      <ul className="space-y-1 text-sm">
        {members.map((m) => { const n = notes.find((x) => x.user_id === m.user_id); return <li key={m.user_id} className="break-keep">
          <span className="font-semibold">{m.nickname || "사용자"}</span> <span className="text-muted-foreground">— {n?.body ?? t.noNote}</span>
        </li> })}
      </ul>
      {isMember && <form onSubmit={save} className="mt-3 flex gap-2 rounded-lg bg-muted p-2">
        <input value={note} onChange={(e) => setNoteText(e.target.value)} maxLength={NOTE_MAX} placeholder={t.notePlaceholder} aria-label={t.notePlaceholder} className={cn(input, "min-w-0 flex-1")} />
        <button type="submit" disabled={busy} className={cn(plain, "bg-background")}>{t.save}</button>
      </form>}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>}
  </section>
}
