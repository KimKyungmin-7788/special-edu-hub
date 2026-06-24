import { AuthForm } from "@/components/auth/AuthForm"

/** 회원가입 페이지 (/signup). 공용 폼을 가입 모드로 렌더한다. */
export function Signup() {
  return <AuthForm mode="signup" />
}
