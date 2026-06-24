-- 1단계-D: 시드 데이터 (seed.ts 의 앱 10개를 INSERT)
-- 재실행해도 중복되지 않도록 on conflict(id) do nothing.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

insert into public.apps
  (id, title, app_url, thumbnail_url, author_name, description, category_ids, view_count, like_count, bookmark_count, created_at)
values
  ('date-johyo', '날짜 저요저요!', 'https://example.com', '', '김경민',
   '달력 학습 앱. 뒤집기 → 드래그 두 단계로 오늘 날짜를 익힙니다. 특수교육 현장에서 매일 아침 활동으로 쓰려고 만들었어요.',
   array['math','life'], 151, 8, 5, '2026-06-21'),

  ('multiboard', '특수교육 툴킷', 'https://example.com', '', '이수아',
   '수업용 전자칠판 도구. 그리기·도형·이미지 붙이기를 가볍게. 태블릿에서도 부드럽게 동작하도록 다듬었습니다.',
   array['class'], 432, 21, 17, '2026-06-18'),

  ('job-value-cup', '직업가치관 월드컵', 'https://example.com', '', '박도현',
   '이상형 월드컵 형식으로 직업 가치관을 탐색합니다. 진로 수업 도입 활동으로 학생 참여도가 높았어요.',
   array['career'], 288, 14, 9, '2026-06-15'),

  ('cat-numbers', '야옹야옹 고양이 숫자 놀이', 'https://example.com', '', '정유진',
   '고양이와 함께 1~10 수 개념을 익히는 놀이. 소근육·집중에 어려움이 있는 학생도 쉽게 따라올 수 있게 큼직한 버튼으로 구성했습니다.',
   array['math','life'], 197, 11, 6, '2026-06-12'),

  ('hangul-play', '한글 떼기 놀이', 'https://example.com', '', '최민서',
   '자음·모음을 결합해 글자를 만드는 한글 학습 놀이. 단계별로 난이도를 올릴 수 있습니다.',
   array['korean'], 365, 19, 13, '2026-06-09'),

  ('emotion-card', '감정 카드', 'https://example.com', '', '한지원',
   '오늘의 감정을 카드로 고르고 이야기 나누는 도구. 아침 모임·상담 활동에 활용합니다.',
   array['life','class'], 124, 7, 4, '2026-06-05'),

  ('color-music', '색칠 음악대', 'https://example.com', '', '오세훈',
   '색을 칠하면 소리가 나는 음악·미술 통합 놀이. 감각 활동으로 좋아요.',
   array['music','art'], 158, 10, 8, '2026-06-02'),

  ('pe-timer', '체육 스트레칭 타이머', 'https://example.com', '', '윤하늘',
   '동작별 시간을 알려주는 스트레칭 타이머. 큰 글씨와 음성 안내로 혼자서도 따라할 수 있습니다.',
   array['pe'], 96, 5, 3, '2026-05-29'),

  ('iep-helper', '개별화교육계획 도우미', 'https://example.com', '', '서지호',
   '개별화교육계획(IEP) 목표 문장을 영역별로 골라 조합하는 도구. 반복 작성 부담을 줄이려고 만들었습니다.',
   array['work'], 274, 16, 12, '2026-06-20'),

  ('lecture-log-collect', '강사수업일지 일괄 취합', 'https://example.com', '', '노은채',
   '강사들이 제출한 수업일지를 한 번에 모아 정리해 주는 도구. 양식 통일과 취합 작업을 자동화해 행정 부담을 줄입니다.',
   array['work','automation'], 183, 9, 7, '2026-06-10')

on conflict (id) do nothing;
