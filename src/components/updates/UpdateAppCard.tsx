import { useEffect, useState } from "react"
import { MousePointer2 } from "lucide-react"
import { AppCard } from "@/components/app/AppCard"
import { UpdateMedia } from "@/components/updates/UpdateMedia"
import { getApp, type App } from "@/lib/apps"

/**
 * 소식에 붙인 자료 카드(57) — 목록과 똑같은 카드. 마우스를 올리면 미리보기 영상이 재생된다.
 * 영상은 소식의 영상(mediaUrl)이 있으면 그것, 없으면 자료의 미리보기 영상.
 * 시연용이라 교사 전용 자료도 카드 잠금을 풀고 영상까지 보여 준다(본문·바로가기는 뷰에서 이미 비어 옴).
 * 자료를 못 불러오면(지워짐·숨김) 영상만 보여 준다.
 */
export function UpdateAppCard({ appId, mediaUrl }: { appId: string; mediaUrl: string | null }) {
  const [app, setApp] = useState<App | null | undefined>(undefined)

  useEffect(() => {
    getApp(appId).then((a) => setApp(a ?? null))
  }, [appId])

  if (app === undefined) return <div className="mt-3 aspect-[4/5] w-full max-w-xs rounded-xl bg-surface" aria-hidden />
  if (app === null) return mediaUrl ? <UpdateMedia src={mediaUrl} /> : null

  return (
    <div className="mt-3 w-full max-w-xs">
      <AppCard app={{ ...app, locked: false, previewUrl: mediaUrl ?? app.previewUrl }} />
      <p className="mt-2 hidden items-center gap-1 text-xs text-muted-foreground [@media(hover:hover)]:flex">
        <MousePointer2 className="size-3.5" aria-hidden />
        카드에 마우스를 올려 보세요
      </p>
    </div>
  )
}
