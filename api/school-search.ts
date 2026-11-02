/**
 * GET /api/school-search?q=학교이름 — 소속 학교 입력칸의 학교 검색.
 *
 * 나이스 교육정보 개방 포털 '학교기본정보'(open.neis.go.kr)를 대신 불러 이름·지역만 돌려준다.
 * 인증키는 화면에 드러나지 않게 서버에서만 쓴다. 나이스로는 검색어만 보낸다(회원 정보는 보내지 않음).
 * 환경변수(Vercel 에만): NEIS_API_KEY — 없으면 나이스 샘플 호출(결과 5개까지)로 동작한다.
 */

const NEIS_API_KEY = process.env.NEIS_API_KEY ?? ""

type NeisRow = { SCHUL_NM?: string; SCHUL_KND_SC_NM?: string; LCTN_SC_NM?: string; ORG_RDNMA?: string }

function json(status: number, body: unknown, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  })
}

/** 주소 앞 두 낱말(시도 시군구). 주소가 없으면 소재지 시도명 */
function regionOf(row: NeisRow): string {
  const addr = (row.ORG_RDNMA ?? "").trim().split(/\s+/).slice(0, 2).join(" ")
  return addr || (row.LCTN_SC_NM ?? "")
}

export async function GET(request: Request): Promise<Response> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim()
  if (q.length < 2 || q.length > 30) return json(400, { error: "검색어는 2~30자로 입력하세요." })

  const params = new URLSearchParams({ Type: "json", pIndex: "1", pSize: NEIS_API_KEY ? "20" : "5", SCHUL_NM: q })
  if (NEIS_API_KEY) params.set("KEY", NEIS_API_KEY)

  try {
    const res = await fetch(`https://open.neis.go.kr/hub/schoolInfo?${params}`)
    const data = await res.json()
    const rows: NeisRow[] = data?.schoolInfo?.[1]?.row ?? []
    const schools = rows
      .filter((r) => r.SCHUL_NM)
      .map((r) => ({ name: r.SCHUL_NM as string, kind: r.SCHUL_KND_SC_NM ?? "", region: regionOf(r) }))
    return json(200, { schools }, "public, max-age=0, s-maxage=86400")
  } catch {
    return json(502, { error: "학교 검색을 잠시 쓸 수 없습니다." })
  }
}
