import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * 교사인증 완료 축하 팝업 (D-3).
 * 인증 후 최초 로그인 1회만 노출한다.
 * 노출 여부는 localStorage("verified_popup_shown_<uid>")로 관리.
 */
export function VerifiedCelebrationDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <div className="mb-2 text-4xl">🎉</div>
          <DialogTitle className="text-xl">교사인증 완료!</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            인증된 교사로 등록되었습니다.
            <br />
            앞으로 앱 등록 등 교사 전용 기능을 이용할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <Button className="mt-4 w-full" onClick={onClose}>
          확인
        </Button>
      </DialogContent>
    </Dialog>
  )
}
