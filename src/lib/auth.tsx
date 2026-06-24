import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

/**
 * 로그인 세션 토대 (2단계 묶음 A-1).
 *
 * 앱 전체가 로그인 상태를 한 곳에서 구독하게 만든다.
 * - 첫 렌더에서 기존 세션을 한 번 읽고(getSession),
 * - 이후 로그인/로그아웃/토큰 갱신을 onAuthStateChange로 따라간다.
 *
 * 이번 묶음은 토대만 — 화면은 바뀌지 않는다.
 * 로그인/가입 UI는 A-2, 헤더 연결은 A-3에서.
 */

type AuthContextValue = {
  session: Session | null
  user: User | null
  /** 최초 세션 확인이 끝났는지. true 동안은 "아직 모름"이라 깜빡임을 막는 데 쓴다. */
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1) 새로고침 등으로 들어왔을 때 기존 세션을 한 번 읽는다.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // 2) 이후 상태 변화(로그인/로그아웃/토큰 갱신)를 구독한다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** 로그인 상태·동작을 꺼내 쓰는 훅. AuthProvider 안에서만 호출. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error("useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.")
  }
  return ctx
}
