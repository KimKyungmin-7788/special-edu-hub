import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { RESEARCH_REQUEST_PATH } from "@/components/verify/ResearchMemberRequest"

/**
 * 게시판·게시글을 볼 수 없을 때의 안내. 공유 링크로 들어온 사람에게 이유와 다음 행동을 알려 준다.
 *  - research: 연구회게시판(연구회원 전용)인 것이 확실할 때. 아니면 '삭제됐거나 권한이 없는 글'로 함께 안내.
 * 연구회 글은 권한이 없으면 DB가 행을 아예 주지 않아, 삭제된 글과 구분할 수 없다(공유 링크의 ?board=research 로만 짐작).
 */
export function BoardAccessNotice({ research }: { research: boolean }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const here = location.pathname + location.search
  const member = !!profile?.isResearchMember

  let title: string
  let body: string
  if (!user) {
    title = research ? "로그인이 필요해요" : "이 글을 볼 수 없어요"
    body = research
      ? "연구회게시판은 로그인한 연구회원만 볼 수 있어요. 로그인한 뒤 다시 열어 주세요."
      : "삭제된 글이거나, 로그인해야 볼 수 있는 글이에요. 로그인한 뒤 다시 열어 주세요."
  } else if (!member) {
    title = research ? "볼 수 있는 권한이 없어요" : "이 글을 볼 수 없어요"
    body = research
      ? "연구회게시판은 연구회원만 볼 수 있어요. 교사인증센터에서 연구회원 권한을 요청해 주세요."
      : "삭제된 글이거나 볼 권한이 없는 글이에요. 연구회게시판 글이라면 교사인증센터에서 연구회원 권한을 요청해 주세요."
  } else {
    title = "게시글을 찾을 수 없습니다"
    body = "삭제되었거나 표시할 수 없는 글입니다."
  }

  const primary = "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
  return <div role="alert" className="rounded-lg border bg-card p-6">
    <h2 className="font-semibold">{title}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {!user && <Link to="/login" state={{ from: here }} className={primary}>로그인하기</Link>}
      {user && !member && <Link to={RESEARCH_REQUEST_PATH} className={primary}>권한 요청하기</Link>}
      <Link to="/board/free" className="text-sm font-medium text-primary underline underline-offset-4">자유게시판으로</Link>
    </div>
  </div>
}
