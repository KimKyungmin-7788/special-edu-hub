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
import { getProfile, type Profile } from "@/lib/profile"
import { VerifiedCelebrationDialog } from "@/components/verify/VerifiedCelebrationDialog"
import { NicknameOnboardingDialog } from "@/components/auth/NicknameOnboardingDialog"

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
  /** 로그인 사용자의 프로필(없으면 null). runPostLogin 에서 한 번 읽어 공유한다. */
  profile: Profile | null
  /** 운영진 이상(role manager|admin). /admin 접근·모더레이션(앱 숨김·인증 심사). */
  isStaff: boolean
  /** 관리자(role admin). 권한 부여 등 admin 전용 기능. */
  isAdmin: boolean
  /** 최초 세션 확인이 끝났는지. true 동안은 "아직 모름"이라 깜빡임을 막는 데 쓴다. */
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  // 닉네임 미확정(nickname_set=false) 사용자에게 띄울 온보딩.
  const [onboarding, setOnboarding] = useState<{
    userId: string
    initial: string
  } | null>(null)

  /** uid 의 교사인증 축하(1회) 여부를 확인해 띄운다. */
  const maybeCelebrate = useCallback(async (uid: string) => {
    if (localStorage.getItem(popupShownKey(uid))) return // 이미 본 적 있음
    const profile = await getProfile(uid)
    if (profile?.isTeacherVerified) setShowCelebration(true)
  }, [])

  /**
   * 로그인 직후 처리: 닉네임 미확정이면 온보딩 먼저(이름 있어도 항상),
   * 확정된 사용자는 교사인증 축하 체크.
   */
  const runPostLogin = useCallback(
    async (uid: string) => {
      const profile = await getProfile(uid)
      setProfile(profile ?? null) // 헤더·/admin 게이트가 공유(role 포함)
      if (!profile) return
      if (profile.nicknameSet === false) {
        setOnboarding({ userId: uid, initial: profile.nickname ?? "" })
        return // 닉네임 확정 후 축하는 onComplete 에서 이어서
      }
      maybeCelebrate(uid)
    },
    [maybeCelebrate],
  )

  function handleCloseCelebration() {
    setShowCelebration(false)
    // 현재 세션 uid 로 플래그 저장
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      if (uid) localStorage.setItem(popupShownKey(uid), "1")
    })
  }

  function handleOnboardingComplete() {
    const uid = onboarding?.userId
    setOnboarding(null)
    if (uid) maybeCelebrate(uid) // 닉네임 확정됐으니 이어서 축하 체크
  }

  function handleOnboardingClose() {
    // 저장 없이 닫음 — nickname_set 그대로 false → 다음 로그인에 다시 묻는다.
    setOnboarding(null)
  }

  useEffect(() => {
    // 1) 새로고침 등으로 들어왔을 때 기존 세션을 한 번 읽는다.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user.id) {
        runPostLogin(data.session.user.id)
      } else {
        setProfile(null)
      }
    })

    // 2) 이후 상태 변화(로그인/로그아웃/토큰 갱신)를 구독한다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user.id) {
        runPostLogin(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [runPostLogin])

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    isStaff: profile?.role === "manager" || profile?.role === "admin",
    isAdmin: profile?.role === "admin",
    loading,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <VerifiedCelebrationDialog
        open={showCelebration}
        onClose={handleCloseCelebration}
      />
      {onboarding && (
        <NicknameOnboardingDialog
          userId={onboarding.userId}
          initialNickname={onboarding.initial}
          onComplete={handleOnboardingComplete}
          onClose={handleOnboardingClose}
        />
      )}
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
