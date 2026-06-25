import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import {
  getInbox,
  getSent,
  markRead,
  deleteMessage,
  type Message,
} from "@/lib/messages"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"

/**
 * 쪽지함 (2단계 묶음 E-2) — 마이페이지 "쪽지함" 탭의 본문.
 * 안쪽 탭(받은함·보낸함) · 목록 · 펼쳐 읽기 · 안 읽음 표시 · 삭제(소프트).
 *
 * 데이터·보안은 lib/messages 와 DB(RLS·RPC)가 책임진다. 여기는 표시·상호작용만.
 *  - 받은함의 안 읽은 쪽지를 펼치면 읽음 처리(markRead)한다.
 *  - 삭제는 내 쪽에서만 사라진다(상대 사본 유지). 낙관적으로 목록에서 뺀다.
 *  - 받은함의 안 읽음 개수가 바뀌면 onUnreadChange 로 알려, 상단 탭 뱃지가 동기화된다.
 *
 * 로그인 상태에서만 렌더된다(마이페이지가 보장).
 */

type Tab = "inbox" | "sent"

type MessageBoxProps = {
  /** 받은함 안 읽음 개수가 바뀔 때 호출(상단 탭 뱃지 동기화용). */
  onUnreadChange?: (count: number) => void
}

/** 같은 날이면 시:분, 아니면 연.월.일 로 간단히 표시. */
function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function MessageBox({ onUnreadChange }: MessageBoxProps) {
  const [tab, setTab] = useState<Tab>("inbox")

  const [inbox, setInbox] = useState<Message[] | null>(null)
  const [sent, setSent] = useState<Message[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 받은함은 처음에, 보낸함은 탭을 처음 누를 때 로드(이미 있으면 재요청 안 함).
  useEffect(() => {
    if (tab === "inbox" && inbox !== null) return
    if (tab === "sent" && sent !== null) return

    let active = true
    setLoading(true)
    setError(null)
    const load = tab === "inbox" ? getInbox() : getSent()
    load
      .then((rows) => {
        if (!active) return
        if (tab === "inbox") setInbox(rows)
        else setSent(rows)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "불러오지 못했습니다.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tab, inbox, sent])

  const list = tab === "inbox" ? inbox : sent
  const unreadCount = (inbox ?? []).filter((m) => m.readAt === null).length

  // 받은함 안 읽음 개수가 바뀌면 부모(상단 탭 뱃지)에 알린다.
  useEffect(() => {
    if (inbox !== null) onUnreadChange?.(unreadCount)
  }, [inbox, unreadCount, onUnreadChange])

  async function handleToggle(m: Message) {
    const next = expandedId === m.id ? null : m.id
    setExpandedId(next)

    // 받은함의 안 읽은 쪽지를 펼치면 읽음 처리.
    if (next && tab === "inbox" && m.readAt === null) {
      // 먼저 화면을 읽음으로(낙관적), 실패하면 되돌린다.
      setInbox((prev) =>
        (prev ?? []).map((x) =>
          x.id === m.id ? { ...x, readAt: new Date().toISOString() } : x,
        ),
      )
      try {
        await markRead(m.id)
      } catch {
        setInbox((prev) =>
          (prev ?? []).map((x) => (x.id === m.id ? { ...x, readAt: null } : x)),
        )
      }
    }
  }

  async function handleDelete(id: string) {
    // 낙관적 제거. 실패 시 새로고침으로 복구(드문 경우).
    const setList = tab === "inbox" ? setInbox : setSent
    const prev = tab === "inbox" ? inbox : sent
    setList((cur) => (cur ?? []).filter((m) => m.id !== id))
    if (expandedId === id) setExpandedId(null)
    try {
      await deleteMessage(id)
    } catch {
      setList(prev) // 롤백
      setError("삭제하지 못했습니다. 다시 시도해 주세요.")
    }
  }

  return (
    <div>
      {/* 안쪽 탭(받은함/보낸함) */}
      <div
        role="tablist"
        aria-label="쪽지함"
        className="inline-flex rounded-lg border border-border p-0.5"
      >
        <TabButton selected={tab === "inbox"} onClick={() => setTab("inbox")}>
          받은함
        </TabButton>
        <TabButton selected={tab === "sent"} onClick={() => setTab("sent")}>
          보낸함
        </TabButton>
      </div>

      {/* 목록 */}
      <div className="mt-4">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && list === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : !list || list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {tab === "inbox" ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((m) => {
              const other = tab === "inbox" ? m.sender : m.recipient
              const name = other.nickname?.trim() || "이름 없음"
              const initial = name.charAt(0).toUpperCase()
              const unread = tab === "inbox" && m.readAt === null
              const expanded = expandedId === m.id

              return (
                <li
                  key={m.id}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* 상대 아바타 → 클릭 시 프로필 미리보기(묶음 C) */}
                    <ProfileTrigger userId={other.id} className="shrink-0">
                      <span className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-medium text-muted-foreground">
                        {other.avatarUrl ? (
                          <img
                            src={other.avatarUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          initial
                        )}
                      </span>
                    </ProfileTrigger>

                    {/* 본문 미리보기 — 누르면 펼쳐 읽기 */}
                    <button
                      type="button"
                      onClick={() => handleToggle(m)}
                      aria-expanded={expanded}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {unread && (
                          <span
                            className="size-2 shrink-0 rounded-full bg-primary"
                            aria-label="안 읽음"
                          />
                        )}
                        <span
                          className={
                            "truncate text-sm " +
                            (unread ? "font-semibold text-foreground" : "text-foreground")
                          }
                        >
                          {tab === "inbox" ? name : `${name} 님에게`}
                        </span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                      {!expanded && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {m.body}
                        </p>
                      )}
                    </button>

                    {/* 삭제(소프트) */}
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      title="삭제"
                      aria-label="쪽지 삭제"
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {/* 펼친 본문 */}
                  {expanded && (
                    <div className="border-t border-border px-3 py-3">
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                        {m.body}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function TabButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={
        "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
        (selected
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  )
}
