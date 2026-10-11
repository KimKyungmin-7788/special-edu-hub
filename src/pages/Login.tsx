import { AuthForm } from "@/components/auth/AuthForm"
import { usePageTitle } from "@/lib/usePageTitle"

/** 로그인 페이지 (/login). 공용 폼을 로그인 모드로 렌더한다. */
export function Login() {
  usePageTitle("로그인")
  return <AuthForm mode="login" />
}
