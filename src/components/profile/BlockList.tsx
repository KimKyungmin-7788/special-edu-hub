import { useEffect, useState } from "react"
import { getMyBlocks, unblockUser, type BlockedUser } from "@/lib/blocks"

/**
 * 차단 목록 관리 (묶음 R-1) — 마이페이지 쪽지함 탭 하단 섹션.
 * 차단은 현재 쪽지 발신에만 영향 → 쪽지함 맥락에 둔다.
 * 데이터·보안은 lib/blocks 와 DB(RLS)가 책임진다. 여기는 표시·해제만.
 *
 * 로그인 상태에서만 렌더된다(마이페이지가 보장).
 */
export function BlockList() {
  const [list, setList] = useState<BlockedUser[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getMyBlocks().then((rows) => {
      if (active) setList(rows)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleUnblock(id: string) {
    if (busyId) return
    setBusyId(id)
    // 낙관적 제거. 실패 시 복구.
    const prev = list
    setList((cur) => (cur ?? []).filter((b) => b.id !== id))
    try {
      await unblockUser(id)
    } catch {
      setList(prev)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h3 className="text-sm font-semibold">차단 목록</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        차단한 사용자와는 쪽지를 주고받을 수 없습니다.
      </p>

      <div className="mt-3">
        {list === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            차단한 사용자가 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((b) => {
              const name = b.nickname?.trim() || "이름 없음"
              const initial = name.charAt(0).toUpperCase()
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-medium text-muted-foreground">
                    {b.avatarUrl ? (
                      <img src={b.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnblock(b.id)}
                    disabled={busyId === b.id}
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
                  >
                    {busyId === b.id ? "처리 중…" : "차단 해제"}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
