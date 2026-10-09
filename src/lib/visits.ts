import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

/**
 * 푸터 방문자 수(38_site_visits.sql).
 *  - 오늘·누적: 브라우저마다 무작위 번호를 기기에 저장해 두고 record_visit 으로 하루 한 번 기록한다.
 *  - 지금: Supabase 실시간 presence — 같은 번호(같은 브라우저)의 여러 탭은 1명으로 센다.
 * IP·계정 정보는 쓰지 않는다. 저장소를 못 쓰면(사생활 보호 모드 등) 이번 방문 동안만 쓰는 번호로 센다.
 */
const KEY = "seh-visitor"

function visitorKey(): string {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && saved.length >= 8 && saved.length <= 64) return saved
    const fresh = crypto.randomUUID()
    localStorage.setItem(KEY, fresh)
    return fresh
  } catch {
    return crypto.randomUUID()
  }
}

export type VisitorStats = {
  online: number | null
  today: number | null
  total: number | null
}

// 앱 실행당 한 번만 기록(페이지 이동마다 다시 부르지 않는다).
let recorded: Promise<{ today: number; total: number } | null> | null = null

function recordOnce(key: string) {
  recorded ??= Promise.resolve(supabase.rpc("record_visit", { p_key: key })).then(
    ({ data, error }) => {
      if (error || !data?.[0]) return null
      return { today: Number(data[0].today), total: Number(data[0].total) }
    },
    () => null,
  )
  return recorded
}

export function useVisitorStats(): VisitorStats {
  const [stats, setStats] = useState<VisitorStats>({ online: null, today: null, total: null })

  useEffect(() => {
    const key = visitorKey()
    let active = true

    recordOnce(key).then((r) => {
      if (active && r) setStats((s) => ({ ...s, ...r }))
    })

    const channel = supabase.channel("site-presence", { config: { presence: { key } } })
    channel
      .on("presence", { event: "sync" }, () => {
        if (active) setStats((s) => ({ ...s, online: Object.keys(channel.presenceState()).length }))
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({})
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  return stats
}
