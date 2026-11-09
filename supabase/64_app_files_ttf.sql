-- 자료 첨부에 TTF 허용. 기존 형식·크기·비공개 설정은 유지한다. 재실행 안전.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'font/ttf')
where id = 'app-files'
  and allowed_mime_types is not null
  and not ('font/ttf' = any(allowed_mime_types));
