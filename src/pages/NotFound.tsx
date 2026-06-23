import { Link } from "react-router-dom"

/** 잘못된 경로. */
export function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        페이지를 찾을 수 없습니다
      </h1>
      <Link
        to="/"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        홈으로
      </Link>
    </div>
  )
}
