import { createHash } from "node:crypto"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

/**
 * 등록된 웹앱 주소의 자동 점검 (PRD 14번, 4단계).
 *
 * 주소에서 첫 화면(HTML)과 같은 사이트의 스크립트 파일을 받아 "읽기만" 한다.
 * 앱을 실행하거나 로그인하지 않는다. 그래서 여기서 확인할 수 있는 것은 최소한이다.
 *
 * 결과 status
 *  - blocked      : 공개를 보류할 신호가 있음(level 'block' 인 finding 이 하나 이상)
 *  - pass         : 보류 신호 없음(표시만 하는 'warn' 은 있을 수 있음)
 *  - unverifiable : 파일을 받아 볼 수 없어 확인하지 못함 — 안전하다는 뜻이 아니다
 *
 * 서버가 남이 준 주소를 여는 일이므로(SSRF) https·공인 주소만 열고, 이동 횟수·크기·시간을 제한한다.
 */

export const SCANNER_VERSION = "2026-11-11.1"

export type FindingLevel = "block" | "warn"
export type Finding = { rule: string; level: FindingLevel; evidence: string }

export type ScanResult = {
  status: "pass" | "blocked" | "unverifiable"
  /** unverifiable 인 이유 */
  reason?: "shared_app" | "access_blocked"
  findings: Finding[]
  finalUrl: string
  /** 받은 파일들의 내용 지문 — 배포본이 바뀌었는지 볼 때 쓴다. 받은 파일이 없으면 null */
  codeHash: string | null
  fileCount: number
  /** 확인한 사실(운영진 화면 표시·입력과 대조용) */
  facts: {
    hasCsp: boolean
    hasPrivacyLink: boolean
    backendHosts: string[]
    devicePermissions: string[]
  }
  scannerVersion: string
}

const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 2 * 1024 * 1024
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 30
const FETCH_TIMEOUT_MS = 8000
const TOTAL_TIMEOUT_MS = 40000

/** 파일을 받아 볼 수 없는 공유 앱(다른 서비스 안에서 실행되는 것) — 확인 불가로 둔다 */
const SHARED_APP_HOSTS = [
  "gemini.google.com", "gemini.google", "g.co", "ai.studio", "aistudio.google.com", "claude.ai", "chatgpt.com",
  "play.unity.com", // 유니티 플레이 — 다른 도메인의 실행 화면으로 넘긴다
]

/** 데이터를 서버에 보내거나 저장하는 대표 서비스 — "저장하지 않음" 입력과 대조할 때 쓴다 */
const BACKEND_HOST_PATTERNS: [string, RegExp][] = [
  ["supabase", /[a-z0-9]{15,}\.supabase\.co/],
  ["firebase", /firebaseio\.com|firestore\.googleapis\.com|firebasestorage\.googleapis\.com/],
  ["google-apps-script", /script\.google\.com\/macros/],
]

const DEVICE_PATTERNS: [string, RegExp][] = [
  ["camera-microphone", /getUserMedia\s*\(/],
  ["location", /geolocation\s*\.\s*(getCurrentPosition|watchPosition)/],
]

class ScanStop extends Error {
  rule: string
  constructor(rule: string, evidence: string) {
    super(evidence)
    this.rule = rule
  }
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number)
    return (
      a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    )
  }
  const v6 = ip.toLowerCase()
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:")
}

/** 열어도 되는 주소인지: https, 기본 포트, 공인 주소 */
async function assertSafeUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:") throw new ScanStop("insecure", `https 가 아닌 주소입니다 (${url.protocol}//${url.host})`)
  if (url.port && url.port !== "443") throw new ScanStop("unreachable", "기본 포트가 아닌 주소는 열지 않습니다")
  if (url.username || url.password) throw new ScanStop("unreachable", "계정 정보가 들어 있는 주소는 열지 않습니다")
  const host = url.hostname.replace(/^\[|\]$/g, "")
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address)
  if (addresses.length === 0) throw new ScanStop("unreachable", `주소를 찾을 수 없습니다 (${host})`)
  if (addresses.some(isPrivateAddress)) throw new ScanStop("unreachable", "내부망 주소는 열지 않습니다")
}

const sameSite = (a: string, b: string) => a.replace(/^www\./, "") === b.replace(/^www\./, "")

/** 정해진 크기까지만 읽는다 */
async function readLimited(res: Response, limit: number): Promise<Uint8Array> {
  const reader = res.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

/** 이동을 직접 따라가며(주소마다 검사) 받는다 */
async function safeFetch(start: URL, deadline: number): Promise<{ res: Response; url: URL }> {
  let url = start
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeUrl(url)
    const left = deadline - Date.now()
    if (left <= 0) throw new ScanStop("unreachable", "점검 시간이 초과되었습니다")
    let res: Response
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(Math.min(FETCH_TIMEOUT_MS, left)),
        headers: { "User-Agent": "special-edu-hub-safety-check", Accept: "text/html,*/*" },
      })
    } catch {
      throw new ScanStop("unreachable", `응답이 없습니다 (${url.host})`)
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location") as string, url)
      continue
    }
    return { res, url }
  }
  throw new ScanStop("unreachable", "다른 주소로 너무 여러 번 넘어갑니다")
}

function isShared(host: string): boolean {
  return SHARED_APP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

/** 봇 접근 차단(확인 화면)인지 */
function isChallenge(res: Response): boolean {
  return (
    res.headers.get("x-vercel-mitigated") === "challenge" ||
    res.headers.has("cf-mitigated") ||
    ((res.status === 403 || res.status === 429 || res.status === 503) && /cloudflare|vercel/i.test(res.headers.get("server") ?? ""))
  )
}

function fileName(url: string): string {
  return new URL(url).pathname.split("/").pop() || "/"
}

/** 드러나면 안 되는 키 찾기 */
function findSecrets(text: string, where: string): Finding[] {
  const out: Finding[] = []
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const payload = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"))
      if (payload?.role === "service_role") {
        out.push({ rule: "secret_supabase_service_role", level: "block", evidence: `Supabase 관리자 키(service_role)가 들어 있습니다 (${where})` })
        break
      }
    } catch {
      // JWT 모양이지만 풀 수 없는 값은 넘어간다
    }
  }
  if (/sk-ant-[A-Za-z0-9_-]{20,}/.test(text))
    out.push({ rule: "secret_ai_key", level: "block", evidence: `Claude 비밀 키로 보이는 값이 들어 있습니다 (${where})` })
  if (/\bsk-(proj-|svcacct-)?[A-Za-z0-9]{20}[A-Za-z0-9_-]{12,}/.test(text.replace(/sk-ant-[A-Za-z0-9_-]+/g, "")))
    out.push({ rule: "secret_ai_key", level: "block", evidence: `AI 서비스 비밀 키로 보이는 값이 들어 있습니다 (${where})` })
  if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))
    out.push({ rule: "secret_private_key", level: "block", evidence: `개인 키가 들어 있습니다 (${where})` })
  if (/AIza[0-9A-Za-z_-]{35}/.test(text))
    out.push({ rule: "google_api_key", level: "warn", evidence: `구글 API 키 형태의 값이 있습니다 (${where})` })
  return out
}

export async function scanApp(rawUrl: string): Promise<ScanResult> {
  const result: ScanResult = {
    status: "pass",
    findings: [],
    finalUrl: rawUrl,
    codeHash: null,
    fileCount: 0,
    facts: { hasCsp: false, hasPrivacyLink: false, backendHosts: [], devicePermissions: [] },
    scannerVersion: SCANNER_VERSION,
  }
  const block = (rule: string, evidence: string): ScanResult => {
    result.status = "blocked"
    result.findings.push({ rule, level: "block", evidence })
    return result
  }
  const unverifiable = (reason: ScanResult["reason"]): ScanResult => {
    result.status = "unverifiable"
    result.reason = reason
    return result
  }

  let start: URL
  try {
    start = new URL(rawUrl)
  } catch {
    return block("unreachable", "주소 형식이 올바르지 않습니다")
  }
  if (start.protocol === "http:") return block("insecure", "https 가 아닌 주소입니다")
  if (isShared(start.hostname)) return unverifiable("shared_app")

  const deadline = Date.now() + TOTAL_TIMEOUT_MS
  try {
    const { res, url } = await safeFetch(start, deadline)
    result.finalUrl = url.href
    if (isShared(url.hostname)) return unverifiable("shared_app")
    if (!sameSite(url.hostname, start.hostname))
      return block("redirect_other_site", `다른 사이트로 넘어갑니다 (${start.hostname} → ${url.hostname})`)
    if (isChallenge(res)) return unverifiable("access_blocked")
    if (!res.ok) return block("unreachable", `열리지 않습니다 (응답 ${res.status})`)

    result.facts.hasCsp = res.headers.has("content-security-policy")
    if (!result.facts.hasCsp)
      result.findings.push({ rule: "no_csp", level: "warn", evidence: "보안 헤더(CSP)가 없습니다" })

    const html = Buffer.from(await readLimited(res, MAX_HTML_BYTES)).toString("utf8")
    result.facts.hasPrivacyLink = /href=["'][^"']*privacy[^"']*["']/i.test(html)

    // 같은 사이트의 스크립트 파일만 받는다
    const scriptUrls = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
      .map((m) => {
        try {
          return new URL(m[1], url)
        } catch {
          return null
        }
      })
      .filter((u): u is URL => !!u && u.protocol === "https:" && sameSite(u.hostname, url.hostname))
      .slice(0, MAX_FILES)

    const texts: { where: string; text: string }[] = [{ where: "첫 화면", text: html }]
    const hashes: string[] = [`/:${createHash("sha256").update(html).digest("hex")}`]
    for (const u of scriptUrls) {
      if (Date.now() > deadline) break
      try {
        const { res: fileRes, url: fileUrl } = await safeFetch(u, deadline)
        if (!fileRes.ok || !sameSite(fileUrl.hostname, url.hostname)) continue
        const body = Buffer.from(await readLimited(fileRes, MAX_FILE_BYTES))
        texts.push({ where: fileName(u.href), text: body.toString("utf8") })
        hashes.push(`${u.pathname}:${createHash("sha256").update(body).digest("hex")}`)
      } catch {
        // 파일 하나를 못 받아도 나머지는 계속 본다
      }
    }
    result.fileCount = texts.length
    result.codeHash = createHash("sha256").update(hashes.sort().join("\n")).digest("hex")

    const seen = new Set<string>()
    for (const { where, text } of texts) {
      for (const f of findSecrets(text, where)) {
        if (seen.has(f.rule)) continue
        seen.add(f.rule)
        result.findings.push(f)
      }
      for (const [name, re] of BACKEND_HOST_PATTERNS)
        if (re.test(text) && !result.facts.backendHosts.includes(name)) result.facts.backendHosts.push(name)
      for (const [name, re] of DEVICE_PATTERNS)
        if (re.test(text) && !result.facts.devicePermissions.includes(name)) result.facts.devicePermissions.push(name)
    }
    if (result.facts.devicePermissions.length > 0)
      result.findings.push({
        rule: "device_permission",
        level: "warn",
        evidence: `장치 권한을 쓰는 코드가 있습니다 (${result.facts.devicePermissions.join(", ")})`,
      })

    if (result.findings.some((f) => f.level === "block")) result.status = "blocked"
    return result
  } catch (err) {
    if (err instanceof ScanStop) return block(err.rule, err.message)
    return block("unreachable", "점검 중 오류가 났습니다")
  }
}
