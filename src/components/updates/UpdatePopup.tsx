import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Modal } from "@/components/ui/Modal"
import { updatesPopup } from "@/config/updates"
import { getSeenAt, listUpdates, markSeen, type SiteUpdate } from "@/lib/siteUpdates"
import { UpdateEntry } from "@/components/updates/UpdateEntry"

/** 팝업을 띄우지 않는 곳 — 새 소식 페이지 자체, 운영진 페이지 */
const SKIP = ["/updates", "/admin"]

/**
 * 새 소식 팝업 — 마지막으로 본 뒤 올라온 소식이 있으면 접속할 때 한 번 보여 준다.
 * 닫거나 링크를 누르면 본 것으로 적고(이 브라우저만), 다음 소식이 올라올 때까지 다시 뜨지 않는다.
 * 처음 온 방문자에게는 최근 며칠 안의 소식만 보여 준다(updatesPopup.firstVisitDays).
 */
export function UpdatePopup() {
  const { pathname } = useLocation()
  const [items, setItems] = useState<SiteUpdate[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (SKIP.some((p) => pathname.startsWith(p))) return
    let cancelled = false
    listUpdates(updatesPopup.max)
      .then((list) => {
        const seen = getSeenAt()
        const since = Date.now() - updatesPopup.firstVisitDays * 86_400_000
        const after = seen ? Date.parse(seen) : since
        const fresh = list.filter((u) => Date.parse(u.createdAt) > after)
        if (!cancelled && fresh.length) {
          setItems(fresh)
          setOpen(true)
        }
      })
      .catch(() => {}) // 못 불러오면 팝업 없이 지나간다
    return () => {
      cancelled = true
    }
    // 접속할 때 한 번만 확인한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function close() {
    if (items[0]) markSeen(items[0].createdAt)
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={close} labelledBy="update-popup-title" className="max-w-md">
      <div className="px-6 pb-6 pt-6">
        <p id="update-popup-title" className="text-lg font-bold">
          {updatesPopup.title}
        </p>
        <ul className="mt-2 max-h-[60svh] overflow-y-auto">
          {items.map((u) => (
            <li key={u.id} className="border-t border-border py-4 first:border-t-0">
              <UpdateEntry update={u} onLink={close} />
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-end gap-2">
          <Link
            to="/updates"
            onClick={close}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            {updatesPopup.more}
          </Link>
          <button
            type="button"
            onClick={close}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {updatesPopup.close}
          </button>
        </div>
      </div>
    </Modal>
  )
}
