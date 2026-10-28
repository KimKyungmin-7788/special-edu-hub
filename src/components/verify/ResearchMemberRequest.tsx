import { useEffect, useRef, useState, type FormEvent } from "react"
import { useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { submitInquiry } from "@/lib/inquiries"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
const labelClass = "text-sm font-medium"

/** 게시판 '권한 요청하기'가 여는 주소. */
export const RESEARCH_REQUEST_PATH = "/verify#research"

/**
 * 연구회원 권한 요청 — 교사인증센터(/verify) 아래 칸.
 * 운영진 문의(submit_inquiry, 유형=요청사항)로 보낸다. 운영진이 확인 후 관리 → 회원에서 연구회원을 부여한다.
 * 교사인증과 별개(연구회원은 교사인증 없이도 될 수 있음). 로그인한 사람만, 이미 연구회원이면 안내만.
 */
export function ResearchMemberRequest() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const ref = useRef<HTMLElement>(null)
  const [school, setSchool] = useState("")
  const [name, setName] = useState("")
  const [nickname, setNickname] = useState(profile?.nickname ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 게시판에서 '권한 요청하기'로 왔으면 이 칸으로 바로 내려온다.
  useEffect(() => {
    if (location.hash === "#research") ref.current?.scrollIntoView({ block: "start" })
  }, [location.hash])
  useEffect(() => { if (profile?.nickname) setNickname((v) => v || profile.nickname || "") }, [profile?.nickname])

  if (!user) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!school.trim() || !name.trim() || !nickname.trim()) {
      setError("소속, 이름(실명), 누리집 별명을 모두 입력하세요.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await submitInquiry({
        type: "request",
        subject: `[연구회원 권한 요청] ${name.trim()}`,
        body: `소속: ${school.trim()}\n이름(실명): ${name.trim()}\n누리집 별명: ${nickname.trim()}`,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section ref={ref} id="research" className="mt-12 scroll-mt-24 border-t border-border pt-8">
      <h2 className="text-lg font-semibold">연구회원 권한 요청</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        연구회게시판은 연구회원만 볼 수 있어요. 아래 내용을 보내 주시면 운영진이 확인한 뒤 권한을 드려요.
      </p>

      {profile?.isResearchMember ? (
        <p className="mt-5 rounded-md border border-border bg-card p-4 text-sm">이미 연구회원이에요. 메뉴의 게시판에서 연구회게시판을 이용할 수 있어요.</p>
      ) : done ? (
        <div role="status" className="mt-5 rounded-md border border-border bg-card p-4 text-sm">
          <p className="font-semibold">요청을 보냈어요</p>
          <p className="mt-1 text-muted-foreground">운영진이 확인해 권한을 드리면 메뉴의 게시판에 연구회게시판이 나타나요. 답변은 계정 이메일({user.email})로 받을 수 있어요.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="research-school" className={labelClass}>소속 <span className="text-destructive">*</span></label>
            <input id="research-school" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={60} placeholder="예: ○○학교" disabled={submitting} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="research-name" className={labelClass}>이름(실명) <span className="text-destructive">*</span></label>
            <input id="research-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="name" disabled={submitting} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="research-nickname" className={labelClass}>누리집 별명 <span className="text-destructive">*</span></label>
            <input id="research-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} disabled={submitting} className={inputClass} />
            <p className="text-xs text-muted-foreground">누리집에서 쓰는 닉네임이에요. 지금 계정의 닉네임을 미리 넣어 두었어요.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting} className="self-start rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {submitting ? "보내는 중…" : "권한 요청 보내기"}
          </button>
        </form>
      )}
    </section>
  )
}
