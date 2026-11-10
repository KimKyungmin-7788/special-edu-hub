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
import { SchoolOnboardingDialog } from "@/components/auth/SchoolOnboardingDialog"
import { needsSchool } from "@/lib/account"
import { ConsentDialog } from "@/components/auth/ConsentDialog"
import { CONSENT_DIALOG_ENABLED } from "@/config/consents"
import { getPendingConsents, recordConsents, shownConsentVersions, type ConsentItem } from "@/lib/consents"

/**
 * 로그인 세션 토대 (2단계 묶음 A-1).
 * D-3: 교사인증 축하 팝업(자동인증은 25 에서 폐지 — 지금은 운영진 승인 후 노출). (22: 노출 1회를 서버 플래그로 — 계정 기준)
 *
 * 팝업 노출 조건: 로그인 후 is_teacher_verified=true AND profiles.verified_celebrated=false.
 * 노출 후 본인 프로필의 verified_celebrated 를 true 로 올려 계정 기준 1회만 표시한다.
 */

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

  // 아직 동의하지 않은 약관·서약이 있는 사용자에게 띄울 창(66). 닉네임 창보다 먼저.
  const [consentAsk, setConsentAsk] = useState<{
    uid: string
    profile: Profile
    pending: ConsentItem[]
  } | null>(null)

  // 소속 학교가 없는 사용자에게 띄울 창(52). 닉네임 창 다음 차례.
  const [schoolAsk, setSchoolAsk] = useState<string | null>(null)

  /** uid 의 교사인증 축하(계정 기준 1회) 여부를 확인해 띄운다. */
  const maybeCelebrate = useCallback(async (uid: string) => {
    const profile = await getProfile(uid)
    if (profile?.isTeacherVerified && !profile.verifiedCelebrated) {
      setShowCelebration(true)
    }
  }, [])

  /**
   * 로그인 직후 처리: 동의하지 않은 약관·서약이 있으면 먼저 묻고(66),
   * 닉네임 미확정이면 온보딩(이름 있어도 항상), 그다음 소속 학교가 없으면 묻고, 끝나면 교사인증 축하 체크.
   */
  const runPostLogin = useCallback(
    async (user: User) => {
      const uid = user.id
      const profile = await getProfile(uid)
      setProfile(profile ?? null) // 헤더·/admin 게이트가 공유(role 포함)
      if (!profile) return

      let pending = await getPendingConsents()
      // 가입 화면에서 이미 같은 버전에 동의했으면(계정에 담아 둔 값) 묻지 않고 기록한다
      const agreed = (user.user_metadata?.consents ?? {}) as Record<string, string>
      if (pending.length > 0 && pending.every((p) => agreed[p.kind] === p.version)) {
        pending = await recordConsents(pending, "signup").then(
          () => [],
          () => pending,
        )
      }
      if (CONSENT_DIALOG_ENABLED && pending.length > 0) {
        setConsentAsk({ uid, profile, pending })
        return // 동의(또는 닫기) 뒤 닉네임·학교·축하를 이어서
      }
      askNicknameOrNext(uid, profile)
    },
    [maybeCelebrate],
  )

  /** 닉네임 미확정이면 닉네임 창, 아니면 학교·축하로 */
  function askNicknameOrNext(uid: string, profile: Profile) {
    if (profile.nicknameSet === false) {
      setOnboarding({ userId: uid, initial: profile.nickname ?? "" })
      return // 닉네임 확정 후 학교·축하는 onComplete 에서 이어서
    }
    askSchoolOrCelebrate(uid)
  }

  /** 학교가 없으면 학교 창, 있으면 교사인증 축하 체크 */
  async function askSchoolOrCelebrate(uid: string) {
    if (await needsSchool(uid)) setSchoolAsk(uid)
    else maybeCelebrate(uid)
  }

  function handleCloseCelebration() {
    setShowCelebration(false)
    // 본인 프로필에 "봤음" 플래그 저장(계정 기준 1회). 실패해도 화면은 닫힌다.
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      const { error } = await supabase
        .from("profiles")
        .update({ verified_celebrated: true })
        .eq("id", uid)
      if (error) {
        console.error("[auth] verified_celebrated 저장 실패:", error.message)
        return
      }
      setProfile((p) => (p ? { ...p, verifiedCelebrated: true } : p))
    })
  }

  function handleOnboardingComplete() {
    const uid = onboarding?.userId
    setOnboarding(null)
    if (uid) askSchoolOrCelebrate(uid) // 닉네임 확정됐으니 이어서 학교·축하 체크
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
        runPostLogin(data.session.user)
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
        runPostLogin(nextSession.user)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [runPostLogin])

  useEffect(() => {
    const refresh = () => { if (session?.user.id) void getProfile(session.user.id).then((p) => setProfile(p ?? null)) }
    window.addEventListener("focus", refresh)
    window.addEventListener("profile-permissions-changed", refresh)
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("profile-permissions-changed", refresh) }
  }, [session?.user.id])

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithPassword = async (email: string, password: string) => {
    // 가입 화면에서 동의한 문서 버전을 계정에 담아 둔다 → 첫 로그인 때 동의 기록으로 옮긴다(66)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { consents: shownConsentVersions() } },
    })
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
      {consentAsk && (
        <ConsentDialog
          pending={consentAsk.pending}
          onComplete={() => {
            setConsentAsk(null)
            askNicknameOrNext(consentAsk.uid, consentAsk.profile)
          }}
          onClose={() => {
            // 동의 없이 닫음 → 다음 로그인에 다시 묻는다
            setConsentAsk(null)
            askNicknameOrNext(consentAsk.uid, consentAsk.profile)
          }}
        />
      )}
      {onboarding && (
        <NicknameOnboardingDialog
          userId={onboarding.userId}
          initialNickname={onboarding.initial}
          onComplete={handleOnboardingComplete}
          onClose={handleOnboardingClose}
        />
      )}
      {schoolAsk && (
        <SchoolOnboardingDialog
          userId={schoolAsk}
          onComplete={() => {
            setSchoolAsk(null)
            maybeCelebrate(schoolAsk)
          }}
          onClose={() => setSchoolAsk(null)} // 저장 없이 닫으면 다음 로그인에 다시 묻는다
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
