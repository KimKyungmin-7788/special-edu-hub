import { useState } from "react"
import { PlayCircle } from "lucide-react"

/** 누르기 전에는 유튜브에 연결하지 않는다. HTML 자료는 기존처럼 새 탭에서 연다. */
export function TrainingVideo({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false)
  return <div className="mt-3 overflow-hidden rounded-lg border bg-card">
    {loaded ? <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={title}
      className="aspect-video min-h-52 w-full border-0" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin" />
      : <div className="flex min-h-52 flex-col items-center justify-center gap-3 bg-brand-soft p-6 text-center">
        <button type="button" onClick={() => setLoaded(true)} className="inline-flex items-center gap-2 rounded-md border border-brand-line bg-card px-4 py-3 text-sm font-semibold text-primary"><PlayCircle className="size-5" aria-hidden />유튜브 영상 불러오기</button>
        <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">누르면 YouTube에 연결되며 IP 주소·브라우저 정보 등이 전달될 수 있어요.</p>
      </div>}
  </div>
}
