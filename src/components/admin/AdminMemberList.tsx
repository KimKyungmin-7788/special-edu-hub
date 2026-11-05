import { useEffect, useMemo, useState } from "react"
import { BadgeCheck, BookOpen, X } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  listMembers,
  setTeacherVerified,
  setUserRole,
  setResearchMember,
  type Member,
  type Role,
} from "@/lib/profile"
import { listMemberSchools } from "@/lib/account"
import { cn } from "@/lib/utils"

/**
 * 관리자 "회원" — 전체 회원 목록 + 회원 상세 패널 (묶음 B-2 · 운영진 등급 · 2026-11-03 개편).
 * 표는 상태만 보여 주고(한 줄, 넘치면 …), 행을 누르면 오른쪽 상세 패널에서 권한·인증·연구회원을 바꾼다.
 * 걸러보기(전체·인증교사·미인증·운영진·연구회원), 정렬, 50명씩 나눠 보기는 화면에서 한다.
 * 조회는 운영진(staff) 가능, 권한 변경은 관리자(admin)만(select 노출 + DB RPC 가 강제).
 * 교사인증 부여/회수는 운영진 가능(25 의 set_teacher_verified RPC).
 */

type Filter = "all" | "verified" | "unverified" | "staff" | "research"
type Sort = "newest" | "oldest" | "nickname"

const FILTERS: { id: Filter; label: string; match: (m: Member) => boolean }[] = [
  { id: "all", label: "전체", match: () => true },
  { id: "verified", label: "인증교사", match: (m) => m.isTeacherVerified },
  { id: "unverified", label: "미인증", match: (m) => !m.isTeacherVerified },
  { id: "staff", label: "운영진", match: (m) => m.role === "manager" || m.role === "admin" },
  { id: "research", label: "연구회원", match: (m) => m.isResearchMember },
]

const SORTS: { id: Sort; label: string }[] = [
  { id: "newest", label: "가입일 최신순" },
  { id: "oldest", label: "가입일 오래된순" },
  { id: "nickname", label: "닉네임순" },
]

const PAGE_SIZE = 50

export function AdminMemberList() {
  const { isAdmin, isStaff, user } = useAuth()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [sort, setSort] = useState<Sort>("newest")
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [schools, setSchools] = useState<Map<string, string>>(new Map()) // 소속 학교(52, 운영진만 읽힘)

  useEffect(() => {
    let active = true
    listMembers().then((data) => {
      if (active) setMembers(data)
    })
    listMemberSchools().then((map) => {
      if (active) setSchools(map)
    })
    return () => {
      active = false
    }
  }, [])

  // 검색·걸러보기·정렬이 바뀌면 첫 쪽으로
  useEffect(() => setPage(0), [query, filter, sort])

  const shown = useMemo(() => {
    if (!members) return []
    const q = query.trim().toLowerCase()
    const match = FILTERS.find((f) => f.id === filter)!.match
    const list = members.filter(
      (m) =>
        match(m) &&
        (!q ||
          m.email?.toLowerCase().includes(q) ||
          m.nickname?.toLowerCase().includes(q) ||
          m.realName?.toLowerCase().includes(q) ||
          m.googleName?.toLowerCase().includes(q) ||
          schools.get(m.id)?.toLowerCase().includes(q)),
    )
    if (sort === "oldest") list.reverse()
    if (sort === "nickname") list.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko"))
    return list
  }, [members, schools, query, filter, sort])

  function update(id: string, patch: Partial<Member>) {
    setMembers((list) => list?.map((m) => (m.id === id ? { ...m, ...patch } : m)) ?? null)
  }

  if (members === null) {
    return <p className="mt-2 text-sm text-muted-foreground">불러오는 중…</p>
  }

  if (members.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        회원이 없습니다.
      </p>
    )
  }

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const pageItems = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selected = members.find((m) => m.id === selectedId) ?? null

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임·이메일·학교 검색"
          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="회원 걸러보기">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.id
                  ? "border-transparent bg-brand-muted text-brand-muted-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label} {members.filter(f.match).length}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="정렬"
          className="ml-auto rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {/* 상세 카드: 아주 넓은 화면(3xl)은 본문 바깥 왼쪽 빈자리, 그보다 좁으면 표 오른쪽 칸 */}
      <div
        className={cn(
          "relative grid items-start gap-4",
          selected && "lg:grid-cols-[minmax(0,1fr)_18rem] 3xl:grid-cols-1",
        )}
      >
        {selected && (
          <div className="lg:sticky lg:top-20 3xl:absolute 3xl:inset-y-0 3xl:right-full 3xl:mr-6 3xl:w-72">
            <MemberPanel
              member={selected}
              school={schools.get(selected.id)}
              isMe={selected.id === user?.id}
              isAdmin={isAdmin}
              isStaff={isStaff}
              onUpdate={(patch) => update(selected.id, patch)}
              onError={setError}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
        <div className={cn("min-w-0", selected && "lg:order-first")}>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            {/* 고정 칸 합이 54rem — 소속 학교 칸이 0으로 눌리지 않게 최소 폭을 두고, 좁으면 가로 스크롤 */}
            <table className="w-full min-w-5xl table-fixed text-sm">
              <colgroup>
                <col className="w-36" />
                <col className="w-28" />
                <col className="w-48" />
                <col />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-surface text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">닉네임</th>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">이메일</th>
                  <th className="px-3 py-2 font-medium">소속 학교</th>
                  <th className="px-3 py-2 font-medium">권한</th>
                  <th className="px-3 py-2 font-medium">인증</th>
                  <th className="px-3 py-2 font-medium">연구회</th>
                  <th className="px-3 py-2 font-medium">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageItems.map((m) => {
                  const school = schools.get(m.id)
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                      aria-selected={m.id === selectedId}
                      className={cn(
                        "cursor-pointer transition-colors",
                        m.id === selectedId ? "bg-brand-soft" : "hover:bg-accent",
                      )}
                    >
                      <td className="truncate px-3 py-2">
                        <button
                          type="button"
                          className="max-w-full truncate text-left font-medium hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(m.id === selectedId ? null : m.id)
                          }}
                        >
                          {m.nickname || <span className="text-muted-foreground">(없음)</span>}
                        </button>
                        {m.id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(나)</span>}
                      </td>
                      <td className="truncate px-3 py-2">
                        <MemberName member={m} />
                      </td>
                      <td className="truncate px-3 py-2 text-muted-foreground" title={m.email ?? undefined}>
                        {m.email || "—"}
                      </td>
                      <td className="truncate px-3 py-2 text-muted-foreground" title={school}>
                        {school || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="px-3 py-2">
                        <VerifiedBadge verified={m.isTeacherVerified} />
                      </td>
                      <td className="px-3 py-2">
                        <ResearchBadge member={m.isResearchMember} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(m.createdAt)}</td>
                    </tr>
                  )
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      조건에 맞는 회원이 없어요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {shown.length}명 중 {shown.length === 0 ? 0 : page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, shown.length)} · 행을 누르면 권한·인증을 바꿀 수 있어요
            </span>
            {pages > 1 && (
              <span className="flex items-center gap-1">
                <PageButton disabled={page === 0} onClick={() => setPage(page - 1)}>
                  이전
                </PageButton>
                <span className="px-1">
                  {page + 1} / {pages}
                </span>
                <PageButton disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                  다음
                </PageButton>
              </span>
            )}
          </div>
          {isAdmin && (
            <p className="mt-1 text-xs text-muted-foreground">
              운영진은 앱 숨김·교사인증 부여/회수를 할 수 있어요. 권한 부여는 관리자만 가능합니다.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-border px-2 py-1 font-medium text-foreground hover:bg-accent disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/** 회원 상세 패널 — 기본 정보와 권한·교사인증·연구회원 바꾸기. 넓은 화면은 표 오른쪽, 좁으면 표 위. */
function MemberPanel({
  member,
  school,
  isMe,
  isAdmin,
  isStaff,
  onUpdate,
  onError,
  onClose,
}: {
  member: Member
  school: string | undefined
  isMe: boolean
  isAdmin: boolean
  isStaff: boolean
  onUpdate: (patch: Partial<Member>) => void
  onError: (msg: string) => void
  onClose: () => void
}) {
  return (
    <aside
      aria-label="회원 상세"
      className="rounded-lg border border-border bg-background p-4 text-sm 3xl:sticky 3xl:top-20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">
            {member.nickname || "(닉네임 없음)"}
            {isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(나)</span>}
          </p>
          <p className="mt-0.5 break-all text-xs text-muted-foreground">{member.email || "이메일 —"}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="상세 닫기"
          className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted-foreground">실명</dt>
          <dd className="break-keep">
            {member.realName || <span className="text-muted-foreground">{member.isTeacherVerified ? "인증 신청에 성함 없음" : "교사인증 전"}</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted-foreground">구글 이름</dt>
          <dd className="break-keep">{member.googleName || <span className="text-muted-foreground">—</span>}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted-foreground">소속 학교</dt>
          <dd className="break-keep">{school || "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-muted-foreground">가입일</dt>
          <dd>{formatDate(member.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">권한</span>
          {isAdmin ? (
            <RoleSelect member={member} onChanged={(role) => onUpdate({ role })} onError={onError} />
          ) : (
            <RoleBadge role={member.role} />
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">교사인증</span>
          {isStaff ? (
            <VerifiedToggle
              member={member}
              onChanged={(v) => onUpdate({ isTeacherVerified: v })}
              onError={onError}
            />
          ) : (
            <VerifiedBadge verified={member.isTeacherVerified} />
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">연구회원</span>
          <ResearchToggle
            member={member}
            editable={isAdmin}
            onChanged={(enabled) => onUpdate({ isResearchMember: enabled })}
            onError={onError}
          />
        </div>
      </div>
    </aside>
  )
}

const ROLE_LABEL: Record<Role, string> = {
  member: "일반",
  teacher: "교사",
  manager: "운영진",
  admin: "관리자",
}

/** 부여 가능한 권한(teacher 는 미사용이라 제외). */
const ASSIGNABLE: Role[] = ["member", "manager", "admin"]

/** 관리자 전용 권한 변경 select. 민감 변경(관리자 부여/강등)은 확인 후 RPC 호출. */
function RoleSelect({
  member,
  onChanged,
  onError,
}: {
  member: Member
  onChanged: (role: Role) => void
  onError: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)
  // teacher 등 비표준 값이면 옵션에 현재 값도 포함해 표시.
  const options = ASSIGNABLE.includes(member.role)
    ? ASSIGNABLE
    : [member.role, ...ASSIGNABLE]

  async function change(next: Role) {
    if (next === member.role) return
    const name = member.nickname || member.email || "이 회원"
    if (next === "admin" || member.role === "admin") {
      const ok = window.confirm(
        `${name} 의 권한을 '${ROLE_LABEL[member.role]}' → '${ROLE_LABEL[next]}' 로 변경할까요?`,
      )
      if (!ok) return
    }
    setBusy(true)
    onError("")
    try {
      await setUserRole(member.id, next)
      onChanged(next)
    } catch (err) {
      onError(err instanceof Error ? err.message : "권한 변경에 실패했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <select
      value={member.role}
      disabled={busy}
      onChange={(e) => change(e.target.value as Role)}
      className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      {options.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  )
}

/** 운영진 전용 교사인증 부여/회수 버튼. 확인 후 RPC 호출. */
function VerifiedToggle({
  member,
  onChanged,
  onError,
}: {
  member: Member
  onChanged: (verified: boolean) => void
  onError: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const verified = member.isTeacherVerified

  async function toggle() {
    const name = member.nickname || member.email || "이 회원"
    const ok = window.confirm(
      verified
        ? `${name} 의 교사인증을 회수할까요? 자료 등록 등 교사 전용 기능이 막힙니다.`
        : `${name} (${member.email ?? "이메일 없음"}) 에게 교사인증을 부여할까요?`,
    )
    if (!ok) return
    setBusy(true)
    onError("")
    try {
      await setTeacherVerified(member.id, !verified)
      onChanged(!verified)
    } catch (err) {
      onError(err instanceof Error ? err.message : "인증 변경에 실패했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <VerifiedBadge verified={verified} />
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          "rounded-md border px-2 py-0.5 text-xs font-medium disabled:opacity-50 " +
          (verified
            ? "border-destructive/40 text-destructive hover:bg-destructive/5"
            : "border-border hover:bg-muted")
        }
      >
        {busy ? "처리 중…" : verified ? "회수" : "인증"}
      </button>
    </div>
  )
}

/** 교사인증 표시 — 인증이면 초록 꼬리표, 아니면 옅은 글자. */
function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return <span className="text-xs text-muted-foreground">미인증</span>
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-primary">
      <BadgeCheck className="size-3.5" aria-hidden />
      인증교사
    </span>
  )
}

/** 연구회원 표시 — 인증교사(초록)와 구분되는 보라 꼬리표. */
function ResearchBadge({ member }: { member: boolean }) {
  if (!member) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-research px-2 py-0.5 text-xs font-semibold text-research-foreground">
      <BookOpen className="size-3.5" aria-hidden />
      연구회원
    </span>
  )
}

/** 표의 이름 칸 — 인증 실명이 있으면 그것을, 없으면 구글 이름을 옅게. */
function MemberName({ member }: { member: Member }) {
  if (member.realName) return <span title="교사인증 때 적은 성함">{member.realName}</span>
  if (member.googleName)
    return (
      <span className="text-muted-foreground" title="구글 계정 이름">
        {member.googleName}
      </span>
    )
  return <span className="text-muted-foreground">—</span>
}

function RoleBadge({ role }: { role: Role }) {
  const emphasized = role === "admin" || role === "manager"
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-xs " +
        (emphasized
          ? "bg-secondary text-secondary-foreground"
          : "border border-border text-muted-foreground")
      }
    >
      {ROLE_LABEL[role]}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function ResearchToggle({ member, editable, onChanged, onError }: { member: Member; editable: boolean; onChanged: (enabled: boolean) => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function toggle() {
    if (busy) return
    if (!window.confirm(`${member.nickname || "이 회원"}의 연구회회원 등급을 ${member.isResearchMember ? "회수" : "부여"}할까요? 연구회게시판 접근 권한이 변경됩니다.`)) return
    setBusy(true)
    try { await setResearchMember(member.id, !member.isResearchMember); onChanged(!member.isResearchMember); window.dispatchEvent(new Event("profile-permissions-changed")) }
    catch { onError("연구회회원 등급을 변경하지 못했습니다. SQL 적용 여부와 관리자 권한을 확인해 주세요.") }
    finally { setBusy(false) }
  }
  return <div className="flex items-center gap-2 whitespace-nowrap"><ResearchBadge member={member.isResearchMember} />{editable && <button type="button" disabled={busy} onClick={toggle} className="rounded-md border px-2 py-1 text-xs disabled:opacity-50">{busy ? "처리 중…" : member.isResearchMember ? "회수" : "부여"}</button>}</div>
}
