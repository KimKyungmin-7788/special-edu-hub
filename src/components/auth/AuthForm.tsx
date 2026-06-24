import { useState, type FormEvent } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/lib/auth"

/**
 * 로그인 / 가입 공용 폼 (2단계 묶음 A-2).
 *
 * 이메일+비밀번호 한 가지만 다룬다. 구글 OAuth는 묶음 D에서 추가.
 * 로그인·가입이 입력은 비슷하고 동작만 달라, 모드로 분기한다.
 * - 가입은 비밀번호를 두 번 받아 일치를 확인한다.
 *
 * 가입은 Confirm email = OFF 전제 → 성공 즉시 세션이 생겨 바로 로그인 상태가 된다.
 * (나중에 확인 메일을 켜면 "메일을 확인하세요" 화면이 한 단계 더 필요해진다.)
 */

type Mode = "login" | "signup"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

/** 눈 아이콘으로 보기/숨기기를 토글하는 비밀번호 입력. */
function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Supabase가 돌려주는 영어 메시지를 자주 나오는 것만 한국어로 바꾼다. */
function toKoreanError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다."
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "이미 가입된 이메일입니다."
  }
  if (m.includes("password should be at least")) {
    return "비밀번호는 6자 이상이어야 합니다."
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "이메일 형식이 올바르지 않습니다."
  }
  return message
}

export function AuthForm({ mode }: { mode: Mode }) {
  const { signInWithPassword, signUpWithPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isLogin = mode === "login"
  const title = isLogin ? "로그인" : "회원가입"

  /** 로그인 전 가려던 곳이 있으면 그리로, 없으면 홈으로. */
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/"

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isLogin && password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    setSubmitting(true)
    try {
      if (isLogin) {
        await signInWithPassword(email, password)
      } else {
        await signUpWithPassword(email, password)
      }
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류"
      setError(toKoreanError(message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isLogin
          ? "이메일과 비밀번호로 로그인합니다."
          : "이메일과 비밀번호로 가입합니다."}
      </p>

      {!isLogin && (
        <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            자료(앱) 등록은 교사 인증을 받은 회원만 가능합니다.
          </span>{" "}
          가입 후{" "}
          <Link to="/verify" className="font-medium text-foreground underline">
            교사인증센터
          </Link>
          에서 인증을 신청해 주세요.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <PasswordInput
          id="password"
          label="비밀번호"
          value={password}
          onChange={setPassword}
          autoComplete={isLogin ? "current-password" : "new-password"}
          hint={isLogin ? undefined : "6자 이상"}
        />

        {!isLogin && (
          <PasswordInput
            id="password-confirm"
            label="비밀번호 확인"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            autoComplete="new-password"
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "처리 중…" : title}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            계정이 없으신가요?{" "}
            <Link to="/signup" className="font-medium text-foreground underline">
              회원가입
            </Link>
          </>
        ) : (
          <>
            이미 계정이 있으신가요?{" "}
            <Link to="/login" className="font-medium text-foreground underline">
              로그인
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
