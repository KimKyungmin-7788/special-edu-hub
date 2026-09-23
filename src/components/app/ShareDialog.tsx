import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Check, Copy, Download, ExternalLink, Maximize2 } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { cn } from "@/lib/utils"

/**
 * 자료 공유 창 — 자료(웹앱) 주소를 QR 과 주소 복사로 넘겨준다.
 * 교실 상황 전제: 교사 화면의 QR 을 학생 태블릿 카메라로 찍어 바로 여는 흐름.
 * QR 은 qrcode 라이브러리로 브라우저 안에서 그린다(주소를 외부 서버로 보내지 않음).
 * 색은 토큰을 쓸 수 없는 canvas 라 흑/백 고정 — QR 은 대비가 인식률을 좌우한다.
 */
export function ShareDialog({
  open,
  onClose,
  title,
  url,
}: {
  open: boolean
  onClose: () => void
  title: string
  url: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [big, setBig] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 캔버스는 항상 큰 해상도로 그리고, 화면 크기는 CSS 로 줄인다(작게/크게 모두 선명하게).
  const CANVAS_PX = 512

  // 창이 열릴 때(그리고 크기가 바뀔 때) QR 다시 그리기
  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    if (!canvas) return
    QRCode.toCanvas(canvas, url, {
      width: CANVAS_PX,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(() => {
        // qrcode 가 canvas 에 인라인 width/height 를 박아 CSS 크기 조절을 막는다 → 지운다.
        canvas.style.removeProperty("width")
        canvas.style.removeProperty("height")
      })
      .catch(() => setError("QR 코드를 만들지 못했습니다."))
  }, [open, url])

  // 다시 열 때는 초기 상태로
  useEffect(() => {
    if (open) return
    setBig(false)
    setCopied(false)
    setError(null)
  }, [open])

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // 브라우저가 클립보드를 막은 경우 — 주소를 선택해 두어 바로 Ctrl+C 할 수 있게
      inputRef.current?.select()
      setError("복사하지 못했습니다. 선택된 주소를 직접 복사해 주세요.")
    }
  }

  /** QR 을 PNG 파일로 내려받기 — 학습지·안내문에 붙여 쓰라고. */
  function downloadQr() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = `QR_${title.replace(/[\\/:*?"<>|]/g, "_")}.png`
    a.click()
  }

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="share-title"
      className="max-h-[calc(100svh-2rem)] max-w-md overflow-y-auto"
    >
      <div className="p-6">
        <p className="text-xs text-muted-foreground">공유</p>
        <h2
          id="share-title"
          className="mt-0.5 truncate pr-8 text-base font-semibold"
        >
          {title}
        </h2>

        <div className="mt-5 flex flex-col items-center">
          <div
            className={cn(
              "rounded-lg border border-border bg-background p-3",
              big ? "w-full max-w-[24rem]" : "w-[15rem]",
            )}
          >
            <canvas ref={canvasRef} className="block h-auto w-full" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            태블릿 카메라로 찍으면 바로 열립니다
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setBig((v) => !v)}
              className={btn}
            >
              <Maximize2 className="size-4" aria-hidden />
              {big ? "작게 보기" : "크게 보기"}
            </button>
            <button type="button" onClick={downloadQr} className={btn}>
              <Download className="size-4" aria-hidden />
              QR 이미지 저장
            </button>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-1.5 text-sm font-medium">주소</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-input bg-surface px-3 py-2 text-sm text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => void copyUrl()}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90",
              )}
            >
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "복사됨" : "주소 복사"}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            새 탭에서 열어 보기
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </Modal>
  )
}
