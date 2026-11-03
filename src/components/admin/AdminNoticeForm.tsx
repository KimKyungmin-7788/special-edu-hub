import { useEffect, useState, type FormEvent } from "react"
import { listSentNotices, recallNotice, sendNotice, type SentNotice } from "@/lib/notifications"

/**
 * 운영진 공지 알림 보내기 (트랙 E). 모든 회원의 알림함에 한 줄씩 들어간다.
 * 권한은 send_notice RPC(is_staff)가 강제. 링크는 사이트 안 경로('/…') 또는 http(s) 주소.
 * 아래 '보낸 공지'에서 잘못 보낸 공지를 거둘 수 있다(56, 모든 회원의 알림에서 지움).
 */
export function AdminNoticeForm() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [link, setLink] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  // 보낸 뒤 목록을 다시 불러오게 하는 신호
  const [sentVersion, setSentVersion] = useState(0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending || title.trim() === "") return
    const l = link.trim()
    if (l && !/^(\/|https?:\/\/)/.test(l)) {
      setError("링크는 '/'로 시작하는 사이트 안 경로나 http(s):// 주소만 쓸 수 있어요.")
      return
    }
    if (!window.confirm("모든 회원에게 공지 알림을 보낼까요? 잘못 보냈으면 아래 '보낸 공지'에서 거둘 수 있어요."))
      return
    setSending(true)
    setError(null)
    setDone(null)
    try {
      const n = await sendNotice(title.trim(), body.trim(), l)
      setDone(n)
      setSentVersion((v) => v + 1)
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
    <div className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">보내면 모든 회원의 알림(헤더 종 아이콘)에 [공지]로 표시됩니다.</p>
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
      <SentNotices version={sentVersion} />
    </div>
  )
}

/** 보낸 공지 목록 — 받은 회원·읽은 수와 거두기 버튼 */
function SentNotices({ version }: { version: number }) {
  const [items, setItems] = useState<SentNotice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  function reload() {
    listSentNotices()
      .then(setItems)
      .catch(() => setError("보낸 공지를 불러오지 못했어요. SQL 56을 적용했는지 확인해 주세요."))
  }
  useEffect(reload, [version])

  async function recall(n: SentNotice) {
    if (
      !window.confirm(
        `'${n.title}' 공지를 거둘까요? 모든 회원의 알림에서 지워져요(이미 읽은 사람이 본 것까지 되돌릴 수는 없어요).`,
      )
    )
      return
    setBusy(n.sentAt)
    try {
      await recallNotice(n.title, n.sentAt)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "거두지 못했어요.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-medium">보낸 공지</h2>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-background">
        {items?.map((n) => (
          <li key={`${n.sentAt}-${n.title}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className="w-24 shrink-0 text-muted-foreground">
              {new Date(n.sentAt).toLocaleString("ko-KR", {
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span className="min-w-0 flex-1 truncate">{n.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {n.readCount}/{n.recipients}명 읽음
            </span>
            <button
              type="button"
              onClick={() => recall(n)}
              disabled={busy !== null}
              className="shrink-0 text-destructive hover:underline disabled:opacity-60"
            >
              {busy === n.sentAt ? "거두는 중…" : "거두기"}
            </button>
          </li>
        ))}
        {items?.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">아직 보낸 공지가 없어요.</li>}
        {items === null && !error && <li className="px-3 py-4 text-sm text-muted-foreground">불러오는 중…</li>}
      </ul>
    </section>
  )
}
