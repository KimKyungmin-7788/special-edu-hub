/**
 * 사이트 메인 골격(헤더·푸터·카탈로그 페이지)의 가로 폭을 한 곳에서 관리한다.
 * 폭을 바꾸려면 여기 max-w 값만 고친다(여러 파일에 흩어지지 않게).
 *
 * - 현재: max-w-7xl = 80rem = 1280px, 좌우 패딩 px-4.
 * - 읽기·폼 페이지(앱 상세·마이페이지·로그인)는 일부러 더 좁아 이 값을 쓰지 않는다.
 */
export const CONTAINER = "mx-auto w-full max-w-7xl px-4"

/**
 * 넓은 작업 화면용(사이드바 + 넓은 본문, 예: 바이브코딩). 최대 1536px.
 * 사이드바를 빼고도 본문이 기본 CONTAINER 만큼 넓게 남도록 한다.
 */
export const WIDE_CONTAINER = "mx-auto w-full max-w-screen-2xl px-4"
