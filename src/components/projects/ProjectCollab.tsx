import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Lock, MessageCircle } from "lucide-react"
import { projects } from "@/config/projects"
import { useAuth } from "@/lib/auth"
import {
  cancelRequest, decideRequest, extendRecruit, formProject, isRecruitClosed, todayLocal, KAKAO_URL, REQUEST_GOAL_MAX, REQUEST_MESSAGE_MAX, REQUEST_WORK_MAX,
  rpcError, sendRequest, setTeamLink, type CollabRequest, type Member, type Project, type RequestStatus,
} from "@/lib/projects"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { PersonAvatar } from "@/components/projects/PersonAvatar"
import { cn } from "@/lib/utils"

const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
const cta = "rounded-lg bg-cta px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-cta-foreground disabled:opacity-60"
const plain = "rounded-md border px-3 py-2 text-sm whitespace-nowrap hover:bg-accent disabled:opacity-60"

export function RequestBadge({ status }: { status: RequestStatus }) {
  return <span className={cn("w-fit rounded px-2 py-1 text-xs whitespace-nowrap",
    status === "accepted" ? "bg-brand-soft text-primary" : "bg-muted text-muted-foreground")}>{projects.request.status[status]}</span>
}

/** 신청자 칸: 보내기 전 폼 / 보낸 뒤 상태. 로그인·교사인증 전이면 그 안내. */
export function RequestPanel({ project: p, mine, onChange }: { project: Project; mine?: CollabRequest; onChange: () => void }) {
  const { user, profile } = useAuth()
  const t = projects.request
  const [work, setWork] = useState("")
  const [message, setMessage] = useState("")
  const [goal, setGoal] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (mine) return <div>
    <RequestBadge status={mine.status} />
    <p className="mt-3 text-sm break-keep text-muted-foreground">{mine.message}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <ProfileTrigger userId={p.leader_id} className={plain}>{t.messageLeader}</ProfileTrigger>
      {p.status === "recruiting" && <button type="button" disabled={busy} className={plain} onClick={async () => {
        if (!confirm("요청을 취소할까요?")) return
        setBusy(true)
        try { await cancelRequest(mine.id); onChange() } catch (e) { alert(rpcError(e)) } finally { setBusy(false) }
      }}>{t.cancel}</button>}
    </div>
  </div>
  if (p.status !== "recruiting") return null
  if (isRecruitClosed(p)) return <p className="text-sm text-muted-foreground">{t.closed}</p>
  if (!user || !profile?.isTeacherVerified) return <Link to={user ? "/verify" : "/login"} state={{ from: location.pathname }} className={cn(cta, "block text-center")}>{user ? "교사인증하고 요청하기" : "로그인하고 요청하기"}</Link>

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!work.trim() || !message.trim()) return setError(`${t.work}과 ${t.message}를 써 주세요.`)
    setBusy(true); setError("")
    try { await sendRequest(p.id, work, message, goal); onChange() } catch (err) { setError(rpcError(err)) } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="flex flex-col gap-3">
    <label className="text-sm font-semibold">{t.work}<input value={work} onChange={(e) => setWork(e.target.value)} maxLength={REQUEST_WORK_MAX} required placeholder={t.workPlaceholder} className={cn(input, "mt-1 font-normal")} /></label>
    <label className="text-sm font-semibold">{t.message}<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={REQUEST_MESSAGE_MAX} required rows={3} placeholder={t.messagePlaceholder} className={cn(input, "mt-1 font-normal")} /></label>
    <label className="text-sm font-semibold">{t.goal}<input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={REQUEST_GOAL_MAX} placeholder={t.goalPlaceholder} className={cn(input, "mt-1 font-normal")} /></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <button type="submit" disabled={busy} className={cn(cta, "w-full")}>{busy ? "보내는 중…" : t.send}</button>
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5 shrink-0" aria-hidden />{t.privacy}</p>
  </form>
}

/** 리더 칸: 받은 요청 목록 + 결성 확정 */
export function LeaderPanel({ project: p, requests, accepted, onChange }: { project: Project; requests: CollabRequest[]; accepted: number; onChange: () => void }) {
  const t = projects.leader
  const [busy, setBusy] = useState(false)
  const [due, setDue] = useState(p.due_date ?? "")
  const [until, setUntil] = useState("")
  const [kakao, setKakao] = useState("")
  const [error, setError] = useState("")
  const today = todayLocal()
  const closed = isRecruitClosed(p)

  async function decide(r: CollabRequest, accept: boolean) {
    setBusy(true)
    try { await decideRequest(r.id, accept); onChange() } catch (e) { alert(rpcError(e)) } finally { setBusy(false) }
  }
  async function extend(e: FormEvent) {
    e.preventDefault()
    if (!until) return
    setBusy(true); setError("")
    try { await extendRecruit(p.id, until); onChange() } catch (err) { setError(rpcError(err)) } finally { setBusy(false) }
  }
  async function form(e: FormEvent) {
    e.preventDefault()
    if (!due) return setError(`${t.due}을 골라 주세요.`)
    if (!KAKAO_URL.test(kakao.trim())) return setError("카카오톡 오픈채팅 주소(https://open.kakao.com/…)를 넣어 주세요.")
    if (!confirm("결성을 확정할까요? 기다리는 요청은 모집 마감으로 바뀌어요.")) return
    setBusy(true); setError("")
    try { await formProject(p.id, due, kakao.trim()); onChange() } catch (err) { setError(rpcError(err)) } finally { setBusy(false) }
  }

  return <section aria-labelledby="leader-requests" className="rounded-lg border p-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 id="leader-requests" className="font-semibold">{t.heading} {requests.length}</h3>
      <p className="text-sm whitespace-nowrap text-muted-foreground">{projects.detail.members} {accepted}명 · 필요 {p.needed}명</p>
      <p className="flex w-full items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5 shrink-0" aria-hidden />{t.private}</p>
    </div>
    {closed && <form onSubmit={extend} className="mb-4 rounded-lg border-2 border-cta p-4">
      <p className="text-sm font-semibold break-keep">{t.recruitClosed}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">{t.newRecruit}<input type="date" min={today} value={until} onChange={(e) => setUntil(e.target.value)} required className={cn(input, "mt-1")} /></label>
        <button type="submit" disabled={busy} className={plain}>{t.extendRecruit}</button>
      </div>
      {error && accepted === 0 && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </form>}
    {requests.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : <ul className="flex flex-col gap-3">
      {requests.map((r) => <li key={r.id} className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-2 text-sm"><PersonAvatar name={r.requester?.nickname} url={r.requester?.avatar_url} className="size-7" /><span className="min-w-0"><span className="font-semibold">{r.requester?.nickname || "사용자"}</span><span className="text-muted-foreground"> · {r.work}</span></span></p>
          {r.status !== "pending" && <RequestBadge status={r.status} />}
        </div>
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-line break-keep">{r.message}</p>
        {r.goal && <p className="mt-1 text-sm break-keep text-muted-foreground">이루고 싶은 것: {r.goal}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {r.status === "pending" && p.status === "recruiting" && <button type="button" disabled={busy || accepted >= p.needed} onClick={() => decide(r, true)} className={cn(plain, "border-primary font-semibold text-primary")}>{t.accept}</button>}
          <ProfileTrigger userId={r.user_id} className={plain}>{t.message}</ProfileTrigger>
          {r.status === "pending" && p.status === "recruiting" && <button type="button" disabled={busy} onClick={() => decide(r, false)} className={plain}>{t.decline}</button>}
        </div>
      </li>)}
    </ul>}
    {p.status === "recruiting" && accepted > 0 && <form onSubmit={form} className="mt-6 border-t pt-5">
      <h3 className="mb-3 font-semibold">{t.formHeading}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">{t.due}<input type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} required className={cn(input, "mt-1")} /></label>
        <label className="text-sm">{t.kakao}<input type="url" value={kakao} onChange={(e) => setKakao(e.target.value)} required placeholder={t.kakaoPlaceholder} className={cn(input, "mt-1")} /></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className={cn(cta, "mt-4")}>{t.form}</button>
      <p className="mt-2 text-xs text-muted-foreground">{t.formNote}</p>
    </form>}
  </section>
}

/** 팀 공간: 리더·함께하는 사람만. 작업 중일 때 맨 위 */
export function TeamSpace({ project: p, members, link, isLeader, onChange }: { project: Project; members: Member[]; link: string | null; isLeader: boolean; onChange: () => void }) {
  const t = projects.team
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(link ?? "")
  const [error, setError] = useState("")
  async function save(e: FormEvent) {
    e.preventDefault()
    if (!KAKAO_URL.test(value.trim())) return setError("카카오톡 오픈채팅 주소(https://open.kakao.com/…)를 넣어 주세요.")
    try { await setTeamLink(p.id, value.trim()); setEditing(false); setError(""); onChange() } catch (err) { setError(rpcError(err)) }
  }
  return <section aria-label={t.heading} className="rounded-lg border border-primary p-4">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h3 className="font-semibold">{t.heading}</h3>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5"><PersonAvatar name={p.leader?.nickname} url={p.leader?.avatar_url} />{p.leader?.nickname || "사용자"}(리더)</li>
          {members.map((m) => <li key={m.user_id} className="flex items-center gap-1.5"><PersonAvatar name={m.nickname} url={m.avatar_url} />{m.nickname || "사용자"}</li>)}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isLeader && <button type="button" onClick={() => setEditing((v) => !v)} className={plain}>{t.changeLink}</button>}
        {link && <a href={link} target="_blank" rel="noopener" className={cn(cta, "inline-flex items-center gap-2")}><MessageCircle className="size-4" aria-hidden />{t.join}</a>}
      </div>
    </div>
    {editing && <form onSubmit={save} className="mt-4 flex flex-wrap gap-2">
      <input type="url" value={value} onChange={(e) => setValue(e.target.value)} placeholder={projects.leader.kakaoPlaceholder} className={cn(input, "min-w-0 flex-1")} />
      <button type="submit" className={plain}>저장</button>
      {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
    </form>}
  </section>
}
