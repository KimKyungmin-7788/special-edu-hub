/**
 * 관련 성취기준 — 데이터 불러오기·검색·코드 조회 (2022 개정 특수교육 기본 교육과정 688개).
 *
 * - 데이터는 public/standards/ 의 정적 JSON. 처음 필요할 때 한 번만 내려받고 모듈에 캐시한다.
 *   · standards.min.json (검색용, 약 1.3MB · 전송 약 210KB): 모달을 열 때만
 *   · standards-lite.json (표시용, 약 150KB · 전송 약 22KB): 상세 페이지에서 코드 → 문장 조회
 * - 검색은 전부 브라우저 안에서 처리한다(서버·API 호출 없음).
 * - DB(apps.achievement_codes)에는 코드만 순서대로 저장하고, 문장은 여기서 찾아 붙인다.
 */
import {
  buildIndex,
  search,
  type SearchIndex,
  type SearchOptions,
  type SearchQuery,
  type SearchResponse,
  type Standard,
  type SynonymGroup,
} from "./search.js"

export type { ExplainWord, QueryTerm, Result, Standard, Strength, SchoolLevel } from "./search.js"
export { explainWords } from "./search.js"

/** 한 자료에 고를 수 있는 성취기준 최대 개수 (DB check 36 과 같은 값) */
export const ACHIEVEMENT_CODES_MAX = 20

export type StandardLite = Pick<Standard, "code" | "school_level" | "grade_band" | "subject" | "domain" | "text">

let indexPromise: Promise<SearchIndex> | null = null
let litePromise: Promise<Map<string, StandardLite>> | null = null

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`성취기준 데이터를 불러오지 못했습니다 (${res.status})`)
  return (await res.json()) as T
}

/** 검색 색인 — 모달이 처음 열릴 때 만든다. 실패하면 다음 호출에서 다시 시도한다. */
export function loadStandardsIndex(): Promise<SearchIndex> {
  if (!indexPromise) {
    indexPromise = Promise.all([
      getJson<Standard[]>("/standards/standards.min.json"),
      getJson<SynonymGroup[]>("/standards/synonyms.json"),
    ])
      .then(([standards, synonyms]) => buildIndex(standards, synonyms))
      .catch((err) => {
        indexPromise = null
        throw err
      })
  }
  return indexPromise
}

export async function searchStandards(
  query: SearchQuery,
  opts?: SearchOptions,
): Promise<SearchResponse> {
  const index = await loadStandardsIndex()
  return search(query, index, { limit: 20, ...opts })
}

/** 코드 → 표시용 정보. 모르는 코드(오타·개정 전 코드)는 결과에서 빠진다. */
export function loadStandardsLite(): Promise<Map<string, StandardLite>> {
  if (!litePromise) {
    litePromise = getJson<StandardLite[]>("/standards/standards-lite.json")
      .then((list) => new Map(list.map((s) => [s.code, s])))
      .catch((err) => {
        litePromise = null
        throw err
      })
  }
  return litePromise
}

/** 코드 목록을 순서 그대로 표시용 정보로 바꾼다. */
export async function lookupStandards(codes: string[]): Promise<StandardLite[]> {
  if (codes.length === 0) return []
  const map = await loadStandardsLite()
  return codes.map((c) => map.get(c)).filter((s): s is StandardLite => s != null)
}
