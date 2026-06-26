import { Modal } from "@/components/ui/Modal"

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
    <Modal open={open} onClose={onClose} labelledBy="celebration-title">
      <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
        <div className="text-4xl">🎉</div>
        <div>
          <p id="celebration-title" className="text-lg font-semibold">
            교사인증 완료!
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            인증된 교사로 등록되었습니다.
            <br />
            앞으로 앱 등록 등 교사 전용 기능을 이용할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          확인
        </button>
      </div>
    </Modal>
  )
}
