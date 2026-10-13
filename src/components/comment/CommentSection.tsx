import { Fragment, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Flag, MessageSquare, Trash2 } from "lucide-react"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { ReportDialog } from "@/components/report/ReportDialog"
import { CommentComposer } from "@/components/comment/CommentComposer"
import { reportComment } from "@/lib/reports"
import { useAuth } from "@/lib/auth"
import { parseMentions, type MentionUser } from "@/lib/mentions"
import {
  getComments,
  addComment,
  deleteComment,
  type Comment,
  type CommentTarget,
} from "@/lib/comments"

/**
 * 앱·사례 상세 댓글 영역 (PRD 4단계 묶음 C-2, 트랙 E 답글·멘션).
 * - 목록: 최상위 댓글 아래에 답글 묶음(1단계). 작성자 이름 = ProfileTrigger.
 * - 답글: 최상위 댓글의 '답글' → 그 묶음 끝에 입력창. 답글의 '답글' → 같은 묶음에 '@닉네임' 을 붙여 단다.
 * - 멘션: '@닉네임' 자동완성(CommentComposer). 본문의 멘션은 클릭하면 프로필이 열린다. 알림 없음.
 * - 삭제: 본인 또는 운영진(소프트삭제). 답글이 남은 댓글을 지우면 그 자리에 '삭제된 댓글입니다'.
 * - 작성: 로그인 사용자만. 비로그인은 로그인 안내.
 * 데이터/권한은 lib/comments(=DB RLS·RPC)에 있다. 이 컴포넌트는 표시·입력만.
 */

/** 작성 시각 표시. 오늘이면 시:분, 그밖엔 날짜. */
function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay)
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** 최상위 댓글 하나와 그 답글들. root 가 null 이면 원댓글이 삭제(또는 차단)되어 안 보이는 묶음. */
type Thread = { id: string; root: Comment | null; replies: Comment[] }

/** 오래된 순 평면 목록 → 묶음 목록. 묶음 순서는 원댓글(없으면 첫 답글) 시각 기준. */
function buildThreads(list: Comment[]): Thread[] {
  const byId = new Map<string, Thread>()
  const order: Thread[] = []
  for (const c of list) {
    const threadId = c.parentId ?? c.id
    let t = byId.get(threadId)
    if (!t) {
      t = { id: threadId, root: null, replies: [] }
      byId.set(threadId, t)
      order.push(t)
    }
    if (c.parentId === null) t.root = c
    else t.replies.push(c)
  }
  return order
}

/** 저장된 본문을 표시 — 멘션은 프로필로 연결. */
function CommentBody({ comment }: { comment: Comment }) {
  return (
    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
      {parseMentions(comment.body).map((part, i) =>
        part.kind === "text" ? (
          <Fragment key={i}>{part.text}</Fragment>
        ) : (
          <ProfileTrigger key={i} userId={part.userId} className="font-medium text-primary">
            @{comment.mentionNames[part.userId] ?? part.name}
          </ProfileTrigger>
        ),
      )}
    </p>
  )
}

/** 답글 입력창을 어디에, 무엇을 채워 열지. */
type ReplyDraft = { threadId: string; mentionUser: MentionUser | null }

export function CommentSection({ target }: { target: CommentTarget }) {
  const { user, isStaff } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [reply, setReply] = useState<ReplyDraft | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getComments(target).then((list) => {
      if (active) {
        setComments(list)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
    // target 은 매 렌더 새 객체라 종류·id 로 비교
  }, [target.kind, target.id])

  async function submit(body: string, parentId: string | null) {
    await addComment(target, body, parentId)
    setComments(await getComments(target))
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    if (!window.confirm("이 댓글을 삭제할까요?")) return
    setDeletingId(id)
    setError(null)
    try {
      await deleteComment(id)
      // 답글이 남아 있으면 '삭제된 댓글' 자리가 생기므로 목록을 다시 묶는다.
      setComments((prev) => prev.filter((c) => c.id !== id))
      if (reply?.threadId === id) setReply(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글을 삭제하지 못했습니다.")
    } finally {
      setDeletingId(null)
    }
  }

  function openReply(thread: Thread, to: Comment) {
    const isReplyToReply = to.parentId !== null
    const nickname = to.author.nickname?.trim()
    setReply({
      threadId: thread.id,
      // 답글에 답하면 그 사람을 멘션으로 미리 채운다(본인 제외)
      mentionUser:
        isReplyToReply && nickname && to.author.id !== user?.id
          ? { id: to.author.id, nickname, avatarUrl: to.author.avatarUrl }
          : null,
    })
  }

  function renderComment(c: Comment, thread: Thread, small: boolean) {
    const name = c.author.nickname || "사용자"
    const initial = name.slice(0, 1)
    const canDelete = user && (user.id === c.author.id || isStaff)
    const canReport = user && user.id !== c.author.id
    // 원댓글이 지워진 묶음에는 더 달 수 없다(DB 도 막음)
    const canReply = user && thread.root !== null
    return (
      <div className="flex gap-3">
        <span
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface font-medium text-muted-foreground ${
            small ? "size-7 text-xs" : "size-9 text-sm"
          }`}
        >
          {c.author.avatarUrl ? (
            <img src={c.author.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ProfileTrigger userId={c.author.id} className="text-sm font-medium text-foreground">
              {name}
            </ProfileTrigger>
            <span className="text-xs text-muted-foreground">{formatTime(c.createdAt)}</span>
            <span className="ml-auto flex items-center gap-3">
              {canReply && (
                <button
                  type="button"
                  onClick={() => openReply(thread, c)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare className="size-3.5" aria-hidden />
                  답글
                </button>
              )}
              {canReport && (
                <button
                  type="button"
                  onClick={() => setReportId(c.id)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Flag className="size-3.5" aria-hidden />
                  신고
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  삭제
                </button>
              )}
            </span>
          </div>
          <CommentBody comment={c} />
        </div>
      </div>
    )
  }

  const threads = buildThreads(comments)

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
        댓글{comments.length > 0 && ` ${comments.length}`}
      </h2>

      {/* 작성 폼: 로그인 사용자만 */}
      {user ? (
        <div className="mt-4">
          <CommentComposer onSubmit={(body) => submit(body, null)} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          댓글을 남기려면{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-2">
            로그인
          </Link>
          이 필요합니다.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* 목록 */}
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : threads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
          </p>
        ) : (
          <ul className="space-y-5">
            {threads.map((t) => (
              <li key={t.id}>
                {t.root ? (
                  renderComment(t.root, t, false)
                ) : (
                  <p className="py-1 text-sm text-muted-foreground">삭제된 댓글입니다.</p>
                )}

                {(t.replies.length > 0 || reply?.threadId === t.id) && (
                  <ul className="mt-3 space-y-3 border-l border-border pl-4 sm:ml-12">
                    {t.replies.map((r) => (
                      <li key={r.id}>{renderComment(r, t, true)}</li>
                    ))}
                    {reply?.threadId === t.id && t.root && (
                      <li>
                        <CommentComposer
                          // 다른 사람에게 답할 때마다 새로 채우도록 key 로 초기화
                          key={reply.mentionUser?.id ?? "root"}
                          initialText={reply.mentionUser ? `@${reply.mentionUser.nickname} ` : ""}
                          initialPicked={reply.mentionUser ? [reply.mentionUser] : []}
                          placeholder="답글을 남겨보세요."
                          submitLabel="답글 등록"
                          rows={2}
                          autoFocus
                          onCancel={() => setReply(null)}
                          onSubmit={async (body) => {
                            await submit(body, t.id)
                            setReply(null)
                          }}
                        />
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 댓글 신고 — ReportDialog 재사용(범용). 제출은 reportComment RPC. */}
      <ReportDialog
        open={reportId !== null}
        onClose={() => setReportId(null)}
        targetLabel="댓글"
        onSubmit={(reason, detail) => reportComment(reportId!, reason, detail)}
      />
    </section>
  )
}
