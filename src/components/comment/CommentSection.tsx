import { Fragment, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Flag, Send, ThumbsUp } from "lucide-react"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { ReportDialog } from "@/components/report/ReportDialog"
import { CommentComposer, type ComposerImages } from "@/components/comment/CommentComposer"
import { reportComment } from "@/lib/reports"
import { useAuth } from "@/lib/auth"
import { parseMentions, type MentionUser } from "@/lib/mentions"
import { avatarTone, AVATAR_PHOTO } from "@/lib/avatarTone"
import { cn } from "@/lib/utils"
import {
  getComments,
  addComment,
  editComment,
  deleteComment,
  toggleCommentLike,
  type Comment,
  type CommentTarget,
} from "@/lib/comments"

/**
 * 앱·사례 상세 댓글 영역 (PRD 4단계 묶음 C-2, 트랙 E 답글·멘션·좋아요·수정).
 * - 머리줄: 아바타 · @닉네임(프로필) · 쪽지 아이콘(프로필 창의 쪽지 보내기) · 시각 · (수정됨).
 * - 본문: 멘션은 프로필로 연결. 본인 글이면 끝에 '수정'. 첨부 사진은 본문 아래 썸네일(누르면 새 탭).
 * - 사진 첨부는 인증교사만(42_comment_images.sql).
 * - 아래줄: 좋아요(토글) · 답글 · [본인/운영진] 삭제 · [남의 글] 오른쪽 끝 신고 깃발.
 * - 답글: 1단계. 답글의 '답글' → 같은 묶음에 '@닉네임' 을 붙여 단다. 왼쪽 세로줄로 묶는다.
 * - 원댓글이 지워지고 답글만 남으면 그 자리에 '삭제된 댓글입니다'.
 * - 묶음은 PAGE_SIZE 개씩 보여 주고 '더보기' 로 늘린다.
 * 데이터/권한은 lib/comments(=DB RLS·RPC)에 있다. 이 컴포넌트는 표시·입력만.
 */

const PAGE_SIZE = 10

/** 작성 시각 — 26.09.30 23:22 */
function formatTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getFullYear() % 100)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
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

/** 수정 입력창에 채울 글과 멘션 대상(토큰 → '@닉네임'). */
function toEditable(c: Comment): { text: string; picked: MentionUser[] } {
  const picked: MentionUser[] = []
  const text = parseMentions(c.body)
    .map((part) => {
      if (part.kind === "text") return part.text
      const nickname = c.mentionNames[part.userId] ?? part.name
      if (!picked.some((p) => p.id === part.userId))
        picked.push({ id: part.userId, nickname, avatarUrl: null })
      return `@${nickname}`
    })
    .join("")
  return { text, picked }
}

/** 저장된 본문을 표시 — 멘션은 프로필로 연결. */
function CommentBody({ comment, onEdit }: { comment: Comment; onEdit?: () => void }) {
  return (
    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
      {parseMentions(comment.body).map((part, i) =>
        part.kind === "text" ? (
          <Fragment key={i}>{part.text}</Fragment>
        ) : (
          <ProfileTrigger key={i} userId={part.userId} className="font-medium text-primary">
            @{comment.mentionNames[part.userId] ?? part.name}
          </ProfileTrigger>
        ),
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="ml-2 align-baseline text-xs text-foreground underline underline-offset-2 hover:text-primary"
        >
          수정
        </button>
      )}
    </p>
  )
}

/** 첨부 사진 썸네일. 누르면 원본을 새 탭으로 연다. */
function CommentImages({ comment }: { comment: Comment }) {
  if (comment.images.length === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {comment.images.map((img, i) => (
        <li key={img.path}>
          <a
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-md border border-border hover:opacity-90"
          >
            <img
              src={img.url}
              alt={`첨부 사진 ${i + 1}`}
              loading="lazy"
              className="size-24 object-cover sm:size-28"
            />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** 답글 입력창을 어디에, 무엇을 채워 열지. */
type ReplyDraft = { threadId: string; mentionUser: MentionUser | null }

export function CommentSection({ target }: { target: CommentTarget }) {
  const { user, profile, isStaff } = useAuth()
  const canAttach = !!profile?.isTeacherVerified
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [reply, setReply] = useState<ReplyDraft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    let active = true
    setLoading(true)
    setVisible(PAGE_SIZE)
    getComments(target).then((list) => {
      if (active) {
        setComments(list)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
    // target 은 매 렌더 새 객체라 종류·id 로 비교. 로그인 상태가 바뀌면 '내 좋아요' 를 다시 읽는다.
  }, [target.kind, target.id, user?.id])

  async function reload() {
    setComments(await getComments(target))
  }

  async function submit(body: string, images: ComposerImages, parentId: string | null) {
    await addComment(target, body, parentId, images.files)
    await reload()
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

  async function handleLike(c: Comment) {
    if (!user) {
      setError("좋아요는 로그인 후 누를 수 있어요.")
      return
    }
    if (likingId) return
    setLikingId(c.id)
    setError(null)
    // 먼저 화면에 반영하고, 실패하면 되돌린다.
    const apply = (liked: boolean) =>
      setComments((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? { ...x, likedByMe: liked, likeCount: Math.max(0, x.likeCount + (liked ? 1 : -1)) }
            : x,
        ),
      )
    apply(!c.likedByMe)
    try {
      await toggleCommentLike(c.id, c.likedByMe)
    } catch (err) {
      apply(c.likedByMe)
      setError(err instanceof Error ? err.message : "좋아요를 처리하지 못했습니다.")
    } finally {
      setLikingId(null)
    }
  }

  function openReply(thread: Thread, to: Comment) {
    const isReplyToReply = to.parentId !== null
    const nickname = to.author.nickname?.trim()
    setEditingId(null)
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
    const isMine = !!user && user.id === c.author.id
    const canDelete = isMine || (!!user && isStaff)
    const canReport = !!user && !isMine
    // 원댓글이 지워진 묶음에는 더 달 수 없다(DB 도 막음)
    const canReply = !!user && thread.root !== null
    const editing = editingId === c.id
    const editable = editing ? toEditable(c) : null

    return (
      <div className="flex gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-medium",
            small ? "size-8 text-xs" : "size-10 text-sm",
            c.author.avatarUrl ? AVATAR_PHOTO : avatarTone(name),
          )}
        >
          {c.author.avatarUrl ? (
            <img src={c.author.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>

        <div className="min-w-0 flex-1">
          {/* 머리줄 */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <ProfileTrigger userId={c.author.id} className="text-sm font-semibold text-foreground">
              @{name}
            </ProfileTrigger>
            {user && !isMine && (
              <ProfileTrigger
                userId={c.author.id}
                className="inline-flex text-muted-foreground hover:text-foreground"
              >
                <Send className="size-3.5" aria-hidden />
                <span className="sr-only">{name} 님에게 쪽지 보내기</span>
              </ProfileTrigger>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTime(c.createdAt)}
              {c.editedAt && " (수정됨)"}
            </span>
          </div>

          {/* 본문 또는 수정 입력창 */}
          {editing ? (
            <div className="mt-2">
              <CommentComposer
                initialText={editable!.text}
                initialPicked={editable!.picked}
                initialImages={c.images}
                allowImages={canAttach}
                submitLabel="수정 완료"
                rows={3}
                autoFocus
                onCancel={() => setEditingId(null)}
                onSubmit={async (body, images) => {
                  await editComment(
                    c.id,
                    body,
                    c.images.map((img) => img.path),
                    images.kept,
                    images.files,
                  )
                  setEditingId(null)
                  await reload()
                }}
              />
            </div>
          ) : (
            <>
              <CommentBody
                comment={c}
                onEdit={
                  isMine
                    ? () => {
                        setReply(null)
                        setEditingId(c.id)
                      }
                    : undefined
                }
              />
              <CommentImages comment={c} />
            </>
          )}

          {/* 아래줄: 좋아요 · 답글 · 삭제 | 신고 */}
          {!editing && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleLike(c)}
                disabled={likingId === c.id}
                aria-pressed={c.likedByMe}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors disabled:opacity-60",
                  c.likedByMe
                    ? "bg-brand-muted font-semibold text-brand-muted-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <ThumbsUp className={cn("size-3.5", c.likedByMe && "fill-current")} aria-hidden />
                좋아요 {c.likeCount}
              </button>
              {canReply && (
                <button
                  type="button"
                  onClick={() => openReply(thread, c)}
                  className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  답글
                </button>
              )}
              {canDelete && (
                <>
                  {canReply && <span className="h-3 w-px bg-border" aria-hidden />}
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-60"
                  >
                    삭제
                  </button>
                </>
              )}
              {canReport && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="h-3 w-px bg-border" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setReportId(c.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                    aria-label="댓글 신고"
                    title="신고"
                  >
                    <Flag className="size-3.5" aria-hidden />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const threads = buildThreads(comments)
  const shown = threads.slice(0, visible)

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
        댓글{comments.length > 0 && ` ${comments.length}`}
      </h2>

      {/* 작성 폼: 로그인 사용자만 */}
      {user ? (
        <div className="mt-4">
          <CommentComposer
            allowImages={canAttach}
            onSubmit={(body, images) => submit(body, images, null)}
          />
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
          <>
            <ul className="space-y-6">
              {shown.map((t) => (
                <li key={t.id}>
                  {t.root ? (
                    renderComment(t.root, t, false)
                  ) : (
                    <p className="py-1 text-sm text-muted-foreground">삭제된 댓글입니다.</p>
                  )}

                  {(t.replies.length > 0 || reply?.threadId === t.id) && (
                    <ul className="ml-5 mt-4 space-y-4 border-l border-border pl-4 sm:pl-5">
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
                            allowImages={canAttach}
                            onCancel={() => setReply(null)}
                            onSubmit={async (body, images) => {
                              await submit(body, images, t.id)
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

            {threads.length > visible && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="mt-6 w-full rounded-lg border border-border py-3 text-sm font-medium text-foreground hover:bg-accent"
              >
                더보기
              </button>
            )}
          </>
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
