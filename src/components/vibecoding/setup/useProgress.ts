import { useCallback, useEffect, useState } from "react"
import type { Tool } from "./steps"

/** 진행 상황은 이 브라우저에만 저장해요. 서버로 보내지 않아요. */
const KEY = "vibe-setup:v1"

interface Progress {
  tool: Tool | null
  checks: Record<string, boolean>
}

const empty = (): Progress => ({ tool: null, checks: {} })

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<Progress>
    return { tool: parsed.tool ?? null, checks: parsed.checks ?? {} }
  } catch {
    return empty()
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress))
    } catch {
      // 저장할 수 없는 환경(비공개 창 등)에서도 화면은 그대로 동작해요.
    }
  }, [progress])

  const toggleCheck = useCallback((id: string) => {
    setProgress((p) => ({ ...p, checks: { ...p.checks, [id]: !p.checks[id] } }))
  }, [])

  const setTool = useCallback((tool: Tool) => {
    setProgress((p) => ({ ...p, tool }))
  }, [])

  const reset = useCallback(() => setProgress(empty()), [])

  return { ...progress, toggleCheck, setTool, reset }
}
