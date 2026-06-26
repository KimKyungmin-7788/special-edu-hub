import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { getProfile } from "@/lib/profile"
import { VerifiedCelebrationDialog } from "@/components/verify/VerifiedCelebrationDialog"

/**
 * 로그인 세션 토대 (2단계 묶음 A-1).
 * D-3: @gw1.kr 자동인증 축하 팝업 추가.
 *
 * 팝업 노출 조건: 로그인 후 is_teacher_verified=true AND localStorage 플래그 없음.
 * 노출 후 localStorage("verified_popup_shown_<uid>") 에 플래그를 남겨 1회만 표시.
 */

/** localStorage 키 헬퍼 */
function popupShownKey(uid: string) {
  return `verified_popup_shown_${uid}`
}

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
  const [showCelebration, setShowCelebration] = useState(false)

  /** 로그인된 uid 의 프로필을 확인해 축하 팝업 여부를 결정한다. */
  const checkCelebration = useCallback(async (uid: string) => {
    const key = popupShownKey(uid)
    if (localStorage.getItem(key)) return // 이미 본 적 있음

    const profile = await getProfile(uid)
    if (profile?.isTeacherVerified) {
      setShowCelebration(true)
    }
  }, [])

  function handleCloseCelebration() {
    setShowCelebration(false)
    // 현재 세션 uid 로 플래그 저장
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      if (uid) localStorage.setItem(popupShownKey(uid), "1")
    })
  }

  useEffect(() => {
    // 1) 새로고침 등으로 들어왔을 때 기존 세션을 한 번 읽는다.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user.id) {
        checkCelebration(data.session.user.id)
      }
    })

    // 2) 이후 상태 변화(로그인/로그아웃/토큰 갱신)를 구독한다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user.id) {
        checkCelebration(nextSession.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [checkCelebration])

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

  return (
    <AuthContext.Provider value={value}>
      {children}
      <VerifiedCelebrationDialog
        open={showCelebration}
        onClose={handleCloseCelebration}
      />
    </AuthContext.Provider>
  )
}

/** 로그인 상태·동작을 꺼내 쓰는 훅. AuthProvider 안에서만 호출. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error("useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.")
  }
  return ctx
}
