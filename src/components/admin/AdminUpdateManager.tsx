import { useEffect, useState, type FormEvent } from "react"
import { UPDATE_KIND_LABEL, type UpdateKind } from "@/config/updates"
import {
  createUpdate,
  deleteUpdate,
  listUpdates,
  updateUpdate,
  type SiteUpdate,
  type SiteUpdateInput,
} from "@/lib/siteUpdates"
import { sendNotice } from "@/lib/notifications"
import { shortDate } from "@/components/updates/UpdateEntry"
import { AppPreviewField } from "@/components/app/AppPreviewField"
import { getApp, removePreview, uploadPreview } from "@/lib/apps"

/**
 * 운영진 '새 소식' 탭 — 소식 쓰기·고치기·지우기(SQL 54, RLS is_staff).
 * 새로 올릴 때 '회원들에게 알림도 보내기'를 고르면 기존 공지 알림(send_notice)으로 /updates 링크를 보낸다.
 * 올린 소식은 /updates 와, 아직 안 본 방문자의 접속 팝업에 바로 나온다.
 */

const KINDS = Object.keys(UPDATE_KIND_LABEL) as UpdateKind[]
const EMPTY: SiteUpdateInput = { kind: "new", title: "", body: "", linkLabel: "", linkTo: "", mediaUrl: null, appId: null }

export function AdminUpdateManager() {
  const [items, setItems] = useState<SiteUpdate[]>([])
  const [form, setForm] = useState<SiteUpdateInput>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  // 보여 줄 영상(55): 새로 고른 파일 · 이미 올린 주소 · 없음. 저장할 때 올린다(app-previews 본인 폴더)
  const [media, setMedia] = useState<File | string | null>(null)
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function reload() {
    listUpdates()
      .then(setItems)
      .catch(() => setError("소식 목록을 불러오지 못했어요. SQL 54를 적용했는지 확인해 주세요."))
  }
  useEffect(reload, [])

  const set = <K extends keyof SiteUpdateInput>(k: K, v: SiteUpdateInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function startEdit(u: SiteUpdate) {
    setEditingId(u.id)
    setForm({ kind: u.kind, title: u.title, body: u.body, linkLabel: u.linkLabel ?? "", linkTo: u.linkTo ?? "", mediaUrl: u.mediaUrl, appId: u.appId })
    setMedia(u.mediaUrl)
    setDone(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function reset() {
    setEditingId(null)
    setForm(EMPTY)
    setMedia(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving || form.title.trim() === "") return
    const linkTo = form.linkTo?.trim() ?? ""
    if (linkTo && !/^\/[^/]/.test(linkTo)) {
      setError("링크는 '/'로 시작하는 누리집 안 경로만 쓸 수 있어요. 예) /mypage")
      return
    }
    // 자료 주소(…/app/<id>) 또는 id 만 붙여 넣어도 된다
    const appRaw = form.appId?.trim() ?? ""
    const appId = appRaw ? (appRaw.match(/\/app\/([^/?#]+)/)?.[1] ?? appRaw) : null
    if (appId && !(await getApp(appId))) {
      setError("그 자료를 찾지 못했어요. 자료 상세 페이지 주소를 그대로 붙여 넣어 주세요.")
      return
    }
    const sending = !editingId && notify
    if (sending && !window.confirm("소식을 올리고 모든 회원에게 알림도 보낼까요? 잘못 보낸 알림은 공지 알림 탭에서 거둘 수 있어요.")) return
    setSaving(true)
    setError(null)
    setDone(null)
    try {
      const oldMedia = form.mediaUrl
      const mediaUrl = media instanceof File ? await uploadPreview(media) : media
      const input = { ...form, mediaUrl, appId }
      if (editingId) {
        await updateUpdate(editingId, input)
        setDone("고쳤어요.")
      } else {
        await createUpdate(input)
        if (sending) {
          const n = await sendNotice(form.title.trim(), form.body.trim().slice(0, 300), "/updates")
          setDone(`올렸고, 회원 ${n.toLocaleString("ko-KR")}명에게 알림을 보냈어요.`)
        } else {
          setDone("올렸어요.")
        }
      }
      // 바꾸거나 뺀 이전 영상 정리(남의 폴더 파일이면 RLS 가 막아 그대로 남는다)
      if (oldMedia && oldMedia !== mediaUrl) removePreview(oldMedia).catch(() => {})
      reset()
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(u: SiteUpdate) {
    if (!window.confirm(`'${u.title}' 소식을 지울까요?`)) return
    try {
      await deleteUpdate(u.id)
      if (u.mediaUrl) removePreview(u.mediaUrl).catch(() => {})
      if (editingId === u.id) reset()
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "지우지 못했어요.")
    }
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          올리면 새 소식 페이지(/updates)에 바로 나오고, 아직 안 본 방문자에게는 접속할 때 팝업으로 한 번 보입니다.
        </p>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">종류</legend>
          <div className="flex gap-4">
            {KINDS.map((k) => (
              <label key={k} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="update-kind"
                  checked={form.kind === k}
                  onChange={() => set("kind", k)}
                  className="accent-primary"
                />
                {UPDATE_KIND_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">제목 (필수, 100자 이내)</span>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={100}
            className={field}
            placeholder="예) 자료 카드 미리보기 영상"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">내용 (선택, 1000자 이내)</span>
          <textarea
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            maxLength={1000}
            rows={4}
            className={`${field} resize-y`}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">누르면 갈 곳 (선택)</span>
            <input
              value={form.linkTo ?? ""}
              onChange={(e) => set("linkTo", e.target.value)}
              className={field}
              placeholder="/mypage"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">링크 글자 (선택, 30자 이내)</span>
            <input
              value={form.linkLabel ?? ""}
              onChange={(e) => set("linkLabel", e.target.value)}
              maxLength={30}
              className={field}
              placeholder="자세히 보기"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">보여 줄 자료 카드 (선택)</span>
          <span className="block text-xs text-muted-foreground">
            자료 상세 페이지 주소를 붙여 넣으면 소식 아래에 그 자료 카드가 목록과 똑같이 나와요. 마우스를 올리면 아래
            영상(없으면 그 자료의 미리보기 영상)이 재생돼요.
          </span>
          <input
            value={form.appId ?? ""}
            onChange={(e) => set("appId", e.target.value)}
            className={field}
            placeholder="https://special-edu-hub.vercel.app/app/…"
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">보여 줄 영상 (선택)</span>
          <p className="text-xs text-muted-foreground">
            소식 아래에 나오고, 마우스를 올리면 재생돼요. 길면 10초를 골라 담고, 크면 자동으로 줄여요.
          </p>
          <AppPreviewField value={media} onChange={setMedia} disabled={saving} />
        </div>
        {!editingId && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="accent-primary"
            />
            회원들에게 알림도 보내기 (헤더 종 아이콘에 [공지]로, 누르면 새 소식 페이지)
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {done && <p className="text-sm text-foreground">{done}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || form.title.trim() === ""}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "저장하는 중…" : editingId ? "고치기" : "올리기"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              취소
            </button>
          )}
        </div>
      </form>

      <section>
        <h2 className="text-sm font-medium">올린 소식</h2>
        <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-background">
          {items.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">{shortDate(u.createdAt)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{UPDATE_KIND_LABEL[u.kind]}</span>
              <span className="min-w-0 flex-1 truncate">{u.title}</span>
              <button type="button" onClick={() => startEdit(u)} className="text-muted-foreground hover:text-foreground">
                고치기
              </button>
              <button type="button" onClick={() => handleDelete(u)} className="text-destructive hover:underline">
                지우기
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">아직 올린 소식이 없어요.</li>}
        </ul>
      </section>
    </div>
  )
}
