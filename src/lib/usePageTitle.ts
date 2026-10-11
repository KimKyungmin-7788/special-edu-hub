import { useEffect } from "react"
import { site } from "@/config/site"

/**
 * 브라우저 탭 제목 — "<페이지 이름> | <누리집 이름>". 이름이 없으면(홈·불러오는 중) 누리집 이름만.
 * 페이지 컴포넌트 맨 위에서 한 번 부른다.
 */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} | ${site.name}` : site.name
  }, [title])
}
