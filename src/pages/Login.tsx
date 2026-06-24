import { AuthForm } from "@/components/auth/AuthForm"

/** 로그인 페이지 (/login). 공용 폼을 로그인 모드로 렌더한다. */
export function Login() {
  return <AuthForm mode="login" />
}
