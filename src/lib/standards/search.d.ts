// search.js(성취기준 검색 엔진)의 타입 선언. 엔진 본문은 standards-finder 저장소가 원본이며
// sync 스크립트로 복사된다 — search.js 를 이 저장소에서 직접 고치지 않는다.

export type SchoolLevel = "초등학교" | "중학교" | "고등학교"
export type Strength = "강함" | "보통" | "약함"

export type Standard = {
  code: string
  code_key: string
  school_level: SchoolLevel
  grade_band: string
  subject: string
  domain_id: string
  domain: string
  text: string
  summary: string | null
  search: {
    elements: string[]
    pool: string[]
    modes: string[]
    keywords: string[]
    app_types: string[]
  }
  source: { doc: string; page: number | null; page_type: string | null }
  review: { status: string }
}

export type SynonymGroup = { canonical: string; variants: string[]; note?: string }

export type QueryTerm = {
  token: string
  weight: number
  source: string // "query" | "유의어(…)"
  from: "topic" | "app"
  core: boolean
}

export type Match = {
  word: string
  source: string
  core: boolean
  from: "topic" | "app"
  rare: boolean
  fields: string[]
}

export type Scored = { standard: Standard; score: number; matched: Match[] }
export type Result = Scored & { relevance: number; strength: Strength }

/** 화면 설명용: 문장의 낱말마다 검색어로 어떻게 처리했는지 (core 핵심어 · low 약하게 반영 · stop 뺀 말) */
export type ExplainWord = { word: string; token: string; rest: string; kind: "core" | "low" | "stop" }

export type SearchIndex = { readonly __brand: "SearchIndex" }

export type SearchQuery = string | { topic?: string; app?: string }

export type SearchOptions = {
  limit?: number
  perSubject?: number
  diversity?: number
  minRatio?: number
  schoolLevels?: SchoolLevel[] | null
  subjects?: string[] | null
}

export type SearchResponse = {
  terms: QueryTerm[]
  results: Result[]
  grouped: { school_level: SchoolLevel; subjects: { subject: string; items: Result[] }[] }[]
  ranked?: Scored[]
}

export const TOPIC_WEIGHT: number
export function normalize(s: string): string
export function stripParticle(tok: string): string
export function buildIndex(standards: Standard[], synonyms?: SynonymGroup[]): SearchIndex
export function parseQuery(query: SearchQuery, index: SearchIndex): QueryTerm[]
export function strengthOf(r: Scored, top: number, bothParts?: boolean): Strength
export function search(query: SearchQuery, index: SearchIndex, opts?: SearchOptions): SearchResponse
export function buildPrompt(query: string, results: { standard: Standard }[], allStandards?: Standard[] | null): string
export function explainWords(text: string): ExplainWord[]
