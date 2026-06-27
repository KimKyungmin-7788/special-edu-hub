import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { ChevronLeft } from "lucide-react"
import {
  getConversations,
  getThread,
  sendMessage,
  markThreadRead,
  deleteThread,
  MESSAGE_MAX,
  type Conversation,
  type Message,
  type MessageParty,
} from "@/lib/messages"
import { useAuth } from "@/lib/auth"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { ReportDialog } from "@/components/report/ReportDialog"
import { reportMessage } from "@/lib/reports"
import { blockUser } from "@/lib/blocks"
import { BlockList } from "@/components/profile/BlockList"

/**
 * 쪽지함 (2단계 E-2 → 메신저식 개편) — 마이페이지 "쪽지함" 탭 본문.
 * 받은함/보낸함 평면 목록 대신 사람별 대화방으로 묶는다.
 *  - 대화 목록: 상대 1명 = 1행(마지막 메시지·시각·안 읽음 뱃지).
 *  - 대화방: 말풍선(내 것 오른쪽/상대 왼쪽) + 답장 입력창. 헤더에 신고·차단·나가기.
 *    열면 안 읽음을 일괄 읽음 처리한다.
 *
 * 데이터·보안은 lib/messages 와 DB(RLS·RPC)가 책임진다. 여기는 표시·상호작용만.
 * 로그인 상태에서만 렌더된다(마이페이지가 보장).
 */

type MessageBoxProps = {
  /** 안 읽음 총개수가 바뀔 때 호출(상단 탭 뱃지 동기화용). */
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
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [active, setActive] = useState<MessageParty | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    const rows = await getConversations()
    setConversations(rows)
    onUnreadChange?.(rows.reduce((sum, c) => sum + c.unreadCount, 0))
  }, [onUnreadChange])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  function openThread(other: MessageParty) {
    setActive(other)
  }

  function backToList() {
    setActive(null)
    // 목록 갱신(새 답장·읽음·나간 대화 반영).
    loadConversations()
  }

  if (active) {
    return (
      <Thread
        other={active}
        onBack={backToList}
        onError={setError}
        error={error}
      />
    )
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {conversations === null ? (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      ) : conversations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          주고받은 쪽지가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => {
            const name = c.other.nickname?.trim() || "이름 없음"
            const initial = name.charAt(0).toUpperCase()
            const preview = c.lastFromMe ? `나: ${c.lastBody}` : c.lastBody
            const hasUnread = c.unreadCount > 0
            return (
              <li key={c.other.id}>
                <button
                  type="button"
                  onClick={() => openThread(c.other)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-medium text-muted-foreground">
                    {c.other.avatarUrl ? (
                      <img
                        src={c.other.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          "truncate text-sm " +
                          (hasUnread
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground")
                        }
                      >
                        {name}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {formatTime(c.lastAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span
                        className={
                          "truncate text-sm " +
                          (hasUnread
                            ? "text-foreground"
                            : "text-muted-foreground")
                        }
                      >
                        {preview}
                      </span>
                      {hasUnread && (
                        <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* 차단 목록 — 대화 목록 화면에서만(대화방 열면 숨김). 묶음 R-1. */}
      <BlockList />
    </div>
  )
}

/**
 * 대화방 — 한 상대와의 말풍선 + 답장 입력 + 헤더 액션(신고·차단·나가기).
 * 열릴 때 스레드 로드 + 안 읽음 일괄 읽음. 답장하면 스레드를 다시 불러 갱신.
 */
function Thread({
  other,
  onBack,
  onError,
  error,
}: {
  other: MessageParty
  onBack: () => void
  onError: (msg: string | null) => void
  error: string | null
}) {
  const { user } = useAuth()
  const myId = user?.id ?? ""
  const name = other.nickname?.trim() || "이름 없음"

  const [messages, setMessages] = useState<Message[] | null>(null)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [confirm, setConfirm] = useState<"block" | "leave" | null>(null)
  const [busy, setBusy] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const rows = await getThread(other.id)
    setMessages(rows)
    // 받은 안 읽은 쪽지가 있으면 일괄 읽음.
    if (rows.some((m) => m.sender.id === other.id && m.readAt === null)) {
      try {
        await markThreadRead(other.id)
      } catch {
        /* 읽음 실패는 치명적이지 않음 */
      }
    }
  }, [other.id])

  useEffect(() => {
    load()
  }, [load])

  // 새 메시지가 그려지면 맨 아래로.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  // 신고 대상 = 마지막으로 받은 쪽지(상대가 보낸 것). 없으면 신고 비활성.
  const lastReceived = messages
    ? [...messages].reverse().find((m) => m.sender.id === other.id)
    : undefined

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (body.trim() === "" || sending) return
    onError(null)
    setSending(true)
    try {
      await sendMessage(other.id, body)
      setBody("")
      await load()
    } catch (err) {
      onError(err instanceof Error ? err.message : "쪽지를 보내지 못했습니다.")
    } finally {
      setSending(false)
    }
  }

  async function handleBlock() {
    setBusy(true)
    onError(null)
    try {
      await blockUser(other.id)
      onBack()
    } catch {
      onError("차단하지 못했습니다.")
      setBusy(false)
    }
  }

  async function handleLeave() {
    setBusy(true)
    onError(null)
    try {
      await deleteThread(other.id)
      onBack()
    } catch {
      onError("대화를 나가지 못했습니다.")
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="대화 목록으로"
          className="-ml-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <ProfileTrigger userId={other.id} className="font-medium text-foreground">
          {name}
        </ProfileTrigger>
        <div className="ml-auto flex flex-wrap gap-2">
          <ActionChip
            onClick={() => setReportOpen(true)}
            disabled={!lastReceived}
            title={lastReceived ? undefined : "받은 쪽지가 있어야 신고할 수 있습니다."}
          >
            신고
          </ActionChip>
          <ActionChip onClick={() => setConfirm("block")} danger>
            차단
          </ActionChip>
          <ActionChip onClick={() => setConfirm("leave")}>나가기</ActionChip>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* 차단/나가기 확인 */}
      {confirm && (
        <div className="mt-3 rounded-md border border-border bg-card p-3">
          <p className="text-sm text-muted-foreground">
            {confirm === "block"
              ? `${name} 님을 차단하면 서로 쪽지를 주고받을 수 없습니다.`
              : `이 대화를 나가면 내 쪽에서 쪽지가 사라집니다. (상대 쪽 사본은 유지)`}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirm === "block" ? handleBlock : handleLeave}
              disabled={busy}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
            >
              {busy ? "처리 중…" : confirm === "block" ? "차단" : "나가기"}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 말풍선 */}
      <div className="mt-3 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {messages === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            아직 주고받은 쪽지가 없습니다.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender.id === myId
            return (
              <div
                key={m.id}
                className={"flex flex-col " + (mine ? "items-end" : "items-start")}
              >
                <div
                  className={
                    "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm " +
                    (mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground")
                  }
                >
                  {m.body}
                </div>
                <span className="mt-0.5 px-1 text-xs text-muted-foreground">
                  {formatTime(m.createdAt)}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 답장 입력 */}
      <form onSubmit={handleSend} className="mt-3 space-y-2 border-t border-border pt-3">
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            if (error) onError(null)
          }}
          rows={2}
          maxLength={MESSAGE_MAX}
          placeholder={`${name} 님에게 보낼 내용`}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {body.length}/{MESSAGE_MAX}
          </span>
          <button
            type="submit"
            disabled={sending || body.trim() === ""}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {sending ? "보내는 중…" : "보내기"}
          </button>
        </div>
      </form>

      {/* 쪽지 신고 (마지막 받은 쪽지 대상) */}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetLabel="쪽지"
        onSubmit={(reason, detail) =>
          reportMessage(lastReceived!.id, reason, detail)
        }
      />
    </div>
  )
}

/** 글자 카드형 액션 버튼(신고·차단·나가기 공용). */
function ActionChip({
  onClick,
  children,
  danger,
  disabled,
  title,
}: {
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        "rounded-md border border-border px-3 py-1 text-sm font-medium text-muted-foreground transition-colors disabled:opacity-50 " +
        (danger
          ? "hover:border-destructive/40 hover:text-destructive"
          : "hover:bg-accent hover:text-foreground")
      }
    >
      {children}
    </button>
  )
}
