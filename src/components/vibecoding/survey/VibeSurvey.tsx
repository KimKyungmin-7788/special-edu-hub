import { ExternalLink } from "lucide-react"

/** 연수 돌아보기 설문(별도 앱 vibecoding-survey)의 주소. 바뀌면 그 앱의 CSP frame-ancestors도 같이 고친다. */
const SURVEY_URL = "https://vibecoding-survey.vercel.app/"

/**
 * 연수 돌아보기(/vibecoding/survey) — 바이브코딩 환경구축 연수가 끝난 뒤 쓰는 설문.
 * 설문은 따로 배포된 앱이라 iframe으로 넣는다(응답은 그 앱의 Supabase에 저장).
 */
export function VibeSurvey() {
  return (
    <div className="flex h-[80svh] flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[calc(100svh-5.5rem)] lg:min-h-[36rem]">
      <iframe
        src={SURVEY_URL}
        title="연수 돌아보기 설문"
        className="min-h-0 w-full flex-1 border-0"
      />
      <div className="flex shrink-0 items-center justify-end border-t px-4 py-2 text-sm">
        <a
          href={SURVEY_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          새 창으로 열기
          <ExternalLink aria-hidden className="size-3.5" />
          <span className="sr-only">(새 탭)</span>
        </a>
      </div>
    </div>
  )
}
