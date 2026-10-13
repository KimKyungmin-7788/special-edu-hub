import { useState, type FormEvent } from "react"
import { sendNotice } from "@/lib/notifications"

/**
 * 운영진 공지 알림 보내기 (트랙 E). 모든 회원의 알림함에 한 줄씩 들어간다.
 * 권한은 send_notice RPC(is_staff)가 강제. 링크는 사이트 안 경로('/…') 또는 http(s) 주소.
 */
export function AdminNoticeForm() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [link, setLink] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending || title.trim() === "") return
    const l = link.trim()
    if (l && !/^(\/|https?:\/\/)/.test(l)) {
      setError("링크는 '/'로 시작하는 사이트 안 경로나 http(s):// 주소만 쓸 수 있어요.")
      return
    }
    if (!window.confirm("모든 회원에게 공지 알림을 보낼까요? 보낸 뒤에는 취소할 수 없어요.")) return
    setSending(true)
    setError(null)
    setDone(null)
    try {
      const n = await sendNotice(title.trim(), body.trim(), l)
      setDone(n)
      setTitle("")
      setBody("")
      setLink("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "공지를 보내지 못했습니다.")
    } finally {
      setSending(false)
    }
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        보내면 모든 회원의 알림(헤더 종 아이콘)에 [공지]로 표시됩니다.
      </p>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">제목 (필수, 100자 이내)</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className={field}
          placeholder="예) 수업실천사례 게시판이 열렸어요"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">내용 (선택, 300자 이내)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={300}
          rows={3}
          className={`${field} resize-none`}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">누르면 갈 곳 (선택)</span>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={field}
          placeholder="/practices 또는 https://…"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {done !== null && (
        <p className="text-sm text-foreground">회원 {done.toLocaleString("ko-KR")}명에게 보냈어요.</p>
      )}
      <button
        type="submit"
        disabled={sending || title.trim() === ""}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {sending ? "보내는 중…" : "공지 알림 보내기"}
      </button>
    </form>
  )
}
