import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import {
  listMembers,
  setTeacherVerified,
  setUserRole,
  type Member,
  type Role,
} from "@/lib/profile"

/**
 * 관리자 "회원" — 전체 회원 목록 + (관리자 전용) 권한 부여 (묶음 B-2 · 운영진 등급).
 * 조회는 운영진(staff) 가능, 권한 변경은 관리자(admin)만(select 노출 + DB RPC 가 강제).
 * 교사인증 부여/회수는 운영진 가능(25 의 set_teacher_verified RPC). 인증 메일을 받으면
 * 이메일로 검색해 [인증] 을 누른다.
 * 강제 탈퇴 등 처리는 신고 시스템과 함께 후속.
 */
export function AdminMemberList() {
  const { isAdmin, isStaff, user } = useAuth()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let active = true
    listMembers().then((data) => {
      if (active) setMembers(data)
    })
    return () => {
      active = false
    }
  }, [])

  function applyRole(id: string, role: Role) {
    setMembers((list) => list?.map((m) => (m.id === id ? { ...m, role } : m)) ?? null)
  }

  function applyVerified(id: string, isTeacherVerified: boolean) {
    setMembers(
      (list) => list?.map((m) => (m.id === id ? { ...m, isTeacherVerified } : m)) ?? null,
    )
  }

  if (members === null) {
    return <p className="mt-2 text-sm text-muted-foreground">불러오는 중…</p>
  }

  if (members.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        회원이 없습니다.
      </p>
    )
  }

  const verified = members.filter((m) => m.isTeacherVerified).length
  const staff = members.filter(
    (m) => m.role === "manager" || m.role === "admin",
  ).length

  const q = query.trim().toLowerCase()
  const shown = q
    ? members.filter(
        (m) =>
          m.email?.toLowerCase().includes(q) || m.nickname?.toLowerCase().includes(q),
      )
    : members

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">
        전체 {members.length}명 · 인증교사 {verified}명 · 운영진 {staff}명
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이메일 또는 닉네임 검색"
        className="mb-3 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">닉네임</th>
              <th className="px-3 py-2 font-medium">이메일</th>
              <th className="px-3 py-2 font-medium">권한</th>
              <th className="px-3 py-2 font-medium">인증</th>
              <th className="px-3 py-2 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2">
                  {m.nickname || (
                    <span className="text-muted-foreground">(없음)</span>
                  )}
                  {m.id === user?.id && (
                    <span className="ml-1 text-xs text-muted-foreground">(나)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {m.email || "—"}
                </td>
                <td className="px-3 py-2">
                  {isAdmin ? (
                    <RoleSelect
                      member={m}
                      onChanged={(role) => applyRole(m.id, role)}
                      onError={setError}
                    />
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                </td>
                <td className="px-3 py-2">
                  {isStaff ? (
                    <VerifiedToggle
                      member={m}
                      onChanged={(v) => applyVerified(m.id, v)}
                      onError={setError}
                    />
                  ) : m.isTeacherVerified ? (
                    <span className="text-foreground">✓</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDate(m.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <p className="mt-2 text-xs text-muted-foreground">
          운영진은 앱 숨김·교사인증 부여/회수를 할 수 있어요. 권한 부여는 관리자만 가능합니다.
        </p>
      )}
    </>
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
      <span className={verified ? "text-foreground" : "text-muted-foreground"}>
        {verified ? "✓" : "—"}
      </span>
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
