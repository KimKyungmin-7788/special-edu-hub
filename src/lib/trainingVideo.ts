/** 알려진 유튜브 주소에서 영상 ID만 추출한다. 임의의 주소를 iframe에 넣지 않는다. */
export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null
    const parts = url.pathname.split("/").filter(Boolean)
    let id: string | null = null
    if (url.hostname === "youtu.be" && parts.length === 1) id = parts[0]
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v")
      else if (["embed", "shorts", "live"].includes(parts[0]) && parts.length === 2) id = parts[1]
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
  } catch { return null }
}
