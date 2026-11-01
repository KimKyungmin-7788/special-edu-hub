import { Link } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import { WriteButton } from "@/components/app/WriteButton"

/** 연수 돌아보기 설문(별도 앱 vibecoding-survey)의 주소. 바뀌면 그 앱의 CSP frame-ancestors도 같이 고친다. */
const SURVEY_URL = "https://vibecoding-survey.vercel.app/"

/**
 * 연수 돌아보기(/training/agent/survey, 열린연수방 2. 에이전트 코딩의 환경구축) — 바이브코딩 환경구축 연수가 끝난 뒤 쓰는 설문.
 * 설문은 따로 배포된 앱이라 iframe으로 넣는다(응답은 그 앱의 Supabase에 저장).
 * 아래 줄에서 누리집의 앱 등록·수업실천사례 쓰기로 잇는다.
 */
export function VibeSurvey() {
  return (
    <div className="flex h-[80svh] flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[calc(100svh-5.5rem)] lg:min-h-[36rem]">
      <iframe
        src={SURVEY_URL}
        title="연수 돌아보기 설문"
        className="min-h-0 w-full flex-1 border-0"
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-2 text-sm">
        {/* 연수로 만든 것을 누리집에서 나누도록 잇는다 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-muted-foreground">만든 앱과 수업 이야기는 누리집에 나눠 주세요</span>
          <WriteButton label="앱 등록하기" className="px-3 py-1.5" />
          <Link
            to="/practices/write"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            수업실천사례 쓰기
          </Link>
        </div>
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
