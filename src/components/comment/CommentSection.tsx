import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Flag, Trash2 } from "lucide-react"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"
import { ReportDialog } from "@/components/report/ReportDialog"
import { reportComment } from "@/lib/reports"
import { useAuth } from "@/lib/auth"
import {
  getComments,
  addComment,
  deleteComment,
  COMMENT_BODY_MAX,
  type Comment,
} from "@/lib/comments"

/**
 * 앱 상세 댓글 영역 (PRD 4단계, 묶음 C-2).
 * - 목록: 작성자 이름 = ProfileTrigger(클릭→프로필 모달), 작성 시각, 본문.
 * - 작성: 로그인 사용자만(쪽지처럼 전체 개방). 비로그인은 로그인 안내.
 * - 삭제: 본인 또는 운영진(소프트삭제). 수정·답글은 이번 범위 밖.
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

export function CommentSection({ appId }: { appId: string }) {
  const { user, isStaff } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getComments(appId).then((list) => {
      if (active) {
        setComments(list)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [appId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    const trimmed = body.trim()
    if (trimmed === "") return
    setError(null)
    setSubmitting(true)
    try {
      await addComment(appId, trimmed)
      setBody("")
      setComments(await getComments(appId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글을 등록하지 못했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    if (!window.confirm("이 댓글을 삭제할까요?")) return
    setDeletingId(id)
    try {
      await deleteComment(id)
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글을 삭제하지 못했습니다.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="mt-10 border-t pt-6">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
        댓글{comments.length > 0 && ` ${comments.length}`}
      </h2>

      {/* 작성 폼: 로그인 사용자만 */}
      {user ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              if (error) setError(null)
            }}
            rows={3}
            maxLength={COMMENT_BODY_MAX}
            placeholder="댓글을 남겨보세요."
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {body.length}/{COMMENT_BODY_MAX}
            </span>
            <button
              type="submit"
              disabled={submitting || body.trim() === ""}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "등록 중…" : "댓글 등록"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          댓글을 남기려면{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-2">
            로그인
          </Link>
          이 필요합니다.
        </p>
      )}

      {/* 목록 */}
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => {
              const name = c.author.nickname || "사용자"
              const initial = name.slice(0, 1)
              const canDelete = user && (user.id === c.author.id || isStaff)
              const canReport = user && user.id !== c.author.id
              return (
                <li key={c.id} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-medium text-muted-foreground">
                    {c.author.avatarUrl ? (
                      <img src={c.author.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      initial
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ProfileTrigger
                        userId={c.author.id}
                        className="text-sm font-medium text-foreground"
                      >
                        {name}
                      </ProfileTrigger>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(c.createdAt)}
                      </span>
                      <span className="ml-auto flex items-center gap-3">
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
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                      {c.body}
                    </p>
                  </div>
                </li>
              )
            })}
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
