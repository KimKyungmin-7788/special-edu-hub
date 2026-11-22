# 화면 수정 뒤 자잘한 깨짐 점검

화면(컴포넌트·문구·배치)을 고친 뒤 커밋하기 전에 아래를 한다. (2026-11-22 첫 화면 배너 쪽수 "1 / 5"가 세 줄로 쪼개진 채 배포되어 있었음)

1. 고친 페이지를 개발 서버 미리보기에서 **휴대폰(375px)·넓은 화면(1440px)** 두 크기로 연다. 확인이 끝나면 화면 크기 설정을 원래대로 돌려놓는다.
2. 두 크기 모두에서 아래 점검 스크립트를 `javascript_tool`로 실행한다. 결과가 빈 목록이 아니면 고치고 다시 실행한다.
3. 쪽수·숫자·날짜·버튼 글자·꼬리표처럼 한 줄이어야 하는 짧은 글자에는 처음부터 `whitespace-nowrap`을 붙인다. 좁은 줄(flex) 안에 있으면 `shrink-0`도 같이 붙인다.
4. 보고할 때 "두 크기에서 줄바꿈 점검 통과"를 한 줄로 적는다.

```js
// 짧은 글자(12자 이하)인데 실제 글자 줄이 2줄 이상이거나, 글자가 칸 밖으로 넘친 요소를 찾는다
// (칸 높이가 아니라 글자 줄 수를 세므로, 여백 큰 버튼·고정 높이 칸은 잡지 않는다)
[...document.querySelectorAll("body *")].filter(e => {
  if (e.children.length || e.offsetParent === null) return false
  const t = e.textContent.trim(); if (!t) return false
  const r = document.createRange(); r.selectNodeContents(e)
  const lines = new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size
  const cs = getComputedStyle(e)
  const overflow = e.scrollWidth > e.clientWidth + 1 && cs.overflow === "visible" && cs.display !== "inline"
  return (t.length <= 12 && lines > 1) || overflow
}).slice(0, 20).map(e => ({ text: e.textContent.trim().slice(0, 30), cls: String(e.className).slice(0, 60) }))
```

걸린 항목이 일부러 두 줄로 둔 것(예: 휴대폰 카테고리 아이콘 아래 긴 교과명)이면 그대로 두고 보고에 "의도된 줄바꿈"으로 적는다.
