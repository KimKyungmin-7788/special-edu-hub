-- 63: 연수 공개·비공개와 기존 WHY 슬라이드 분리 (선행: 62)
-- SQL Editor에서 사용자가 실행. 기존 글은 공개 유지, 분리한 연수만 비공개 등록.
begin;
alter table public.posts add column if not exists visibility text not null default 'public';
alter table public.posts drop constraint if exists posts_visibility;
alter table public.posts add constraint posts_visibility check (visibility in ('public', 'private'));
-- 분리한 원본 슬라이드는 공개 JS 번들 대신 글의 RLS로 보호한다.
alter table public.posts add column if not exists training_slides jsonb;
alter table public.posts drop constraint if exists posts_training_slides;
alter table public.posts add constraint posts_training_slides check (training_slides is null or jsonb_typeof(training_slides) = 'array');

drop policy if exists posts_visibility_read on public.posts;
create policy posts_visibility_read on public.posts as restrictive for select to anon, authenticated
  using (visibility = 'public' or author_id = (select auth.uid()));
-- comments와 post_likes는 기존 정책의 posts 조회를 통해 같은 권한을 따른다.

create or replace function public.can_read_post(p_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.posts p where p.id = p_post and p.deleted_at is null
    and public.can_read_board(p.board_id) and (p.visibility = 'public' or p.author_id = auth.uid()));
$$;
revoke all on function public.can_read_post(uuid) from public;
grant execute on function public.can_read_post(uuid) to anon, authenticated;

create or replace function public.save_training_post_with_visibility(
  p_title text, p_body text, p_cover_url text, p_links jsonb, p_stage text, p_visibility text, p_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_visibility is null or p_visibility not in ('public', 'private') then raise exception '공개 범위를 선택해 주세요.'; end if;
  -- 기존 함수가 로그인·교사인증·본인 글·단계·본문·링크를 검증한다.
  v_id := public.save_training_post_with_stage(p_title, p_body, p_cover_url, p_links, p_stage, p_id);
  update public.posts set visibility = p_visibility where id = v_id;
  return v_id;
end $$;
revoke all on function public.save_training_post_with_visibility(text,text,text,jsonb,text,text,uuid) from public, anon;
grant execute on function public.save_training_post_with_visibility(text,text,text,jsonb,text,text,uuid) to authenticated;
-- 기존 저장 RPC는 visibility를 고치지 않으므로 이전 클라이언트가 비공개 글을 공개로 되돌리지 않는다.

create or replace function public.increment_post_view(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.posts set view_count = view_count + 1 where id = p_post_id and public.can_read_post(id);
end $$;

create or replace function public.can_reply_to_board_comment(p_parent uuid, p_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.comments c where c.id=p_parent and c.post_id=p_post
    and c.parent_id is null and c.deleted_at is null and public.can_read_post(p_post));
$$;

-- SECURITY DEFINER 신고 함수가 비공개 글의 스냅샷을 복사하지 못하게 한다.
create or replace function public.report_board_post(p_id uuid, p_reason text, p_detail text)
returns void language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.can_read_post(p_id) then raise exception '글을 찾을 수 없습니다.'; end if;
  select * into p from public.posts where id = p_id and deleted_at is null;
  if not found then raise exception '글을 찾을 수 없습니다.'; end if;
  if char_length(coalesce(p_detail, '')) > 1000 then raise exception '상세 내용은 1000자 이하로 입력하세요.'; end if;
  insert into public.reports (reporter_id, target_type, target_id, reported_user_id, target_snapshot, reason, detail)
    values (auth.uid(), 'post', p.id::text, p.author_id, p.title || E'\n' || left(regexp_replace(p.body, '<[^>]*>', '', 'g'), 4000), p_reason, p_detail)
    on conflict (reporter_id, target_type, target_id) where status = 'pending' do nothing;
end $$;

-- 댓글 신고도 우회 경로에서 비공개 본문을 복사하지 못하게 한다.
create or replace function public.board_report_scope()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_board uuid; v_post uuid;
begin
  if new.target_type = 'post' then
    select id, board_id into v_post, v_board from public.posts where id::text = new.target_id;
  elsif new.target_type = 'comment' then
    select p.id, p.board_id into v_post, v_board from public.comments c join public.posts p on p.id = c.post_id where c.id::text = new.target_id;
  end if;
  new.board_id := v_board;
  if v_post is not null and not public.can_read_post(v_post) then raise exception '접근 권한이 없습니다.'; end if;
  return new;
end $$;

-- 공개 중 생성된 댓글 알림도 비공개 전환 후에는 타인에게 노출하지 않는다.
drop policy if exists notifications_training_visibility on public.notifications;
create policy notifications_training_visibility on public.notifications as restrictive for select to authenticated
  using (board_id is null or exists (
    select 1 from public.boards b where b.id = notifications.board_id and
      (b.slug <> 'training' or exists (select 1 from public.comments c where c.id = notifications.comment_id))
  ));

-- 기존 환경구축 글 작성자(강릉김선생) 명의로 원본을 01 단계에 보존한다.
-- 고정 ID로 중복 등록을 막고, 재실행해도 사용자가 이후 수정한 공개 상태를 덮어쓰지 않는다.
do $$
begin
  if not exists(select 1 from public.posts where id = '77725d5a-9a33-4e12-a199-a3aee2ca2cd3' and deleted_at is null) then
    raise exception '원본 환경구축 연수를 찾을 수 없습니다.';
  end if;
end $$;
insert into public.posts(id, board_id, author_id, title, body, training_stage, visibility, links, training_slides)
select '62dc3495-9d6e-49ba-a7ef-126e0f0c273a'::uuid, board_id, author_id,
  '왜 바이브코딩인가?',
  '<p>교사가 만드는 이유, 채팅창에서 내 PC로, 개발자이기 전에 교사. 바이브코딩을 시작하기 전 함께 생각해 보는 연수입니다.</p>',
  'vibecoding', 'private',
  '[{"kind":"slides","label":"왜 바이브코딩인가?","url":"https://special-edu-hub.vercel.app/training/share/62dc3495-9d6e-49ba-a7ef-126e0f0c273a/slides"}]'::jsonb,
  $slides$[
  {
    "kind": "reasons",
    "id": "why-reasons",
    "short": "교사가 만드는 이유",
    "title": "교사의 아이디어에 기술이 더해지면, 가능성은 무한해져요",
    "lead": "코딩을 몰라도 AI와 대화하며 내 수업에 필요한 것을 직접 만들 수 있어요.",
    "define": {
      "term": "바이브코딩",
      "text": "만들고 싶은 것을 말로 설명하면 AI가 코드를 써 주는 방식이에요.",
      "origin": "2025년 2월, AI 연구자 안드레이 카파시가 처음 붙인 이름이에요."
    },
    "points": [
      {
        "icon": "fix",
        "title": "현장의 문제를 직접 해결해요",
        "desc": "우리 반, 우리 아이들에게 꼭 맞는 도구가 없을 때 기다리지 않고 직접 만들어요."
      },
      {
        "icon": "idea",
        "title": "상상하던 것을 현실로 구체화해요",
        "desc": "‘이런 자료가 있으면 좋겠다’던 생각을 실제로 쓸 수 있는 앱으로 만들어요."
      }
    ]
  },
  {
    "kind": "compare",
    "id": "why-pc",
    "short": "채팅창에서 내 PC로",
    "title": "채팅창을 넘어, 내 PC에서 내 코드로",
    "lead": "처음엔 대부분 채팅창에서 시작해요. 그런데 만들수록 한계가 보여요.",
    "before": {
      "label": "채팅창에서 만들 때",
      "tools": "제미나이 · 구글 AI 스튜디오 · Claude 채팅",
      "points": [
        {
          "icon": "chat",
          "title": "코드가 대화 속에만 있어 내 것 같지 않아요"
        },
        {
          "icon": "history",
          "title": "고치고 키울수록 관리하기 어려워요"
        },
        {
          "icon": "share",
          "title": "나누려면 코드를 따로 옮겨야 해요"
        }
      ]
    },
    "after": {
      "label": "내 PC의 AI 에이전트와 만들 때",
      "tools": "Claude Code · Codex",
      "points": [
        {
          "icon": "folder",
          "title": "코드가 내 폴더에 파일로 남아요",
          "desc": "AI가 내 폴더의 파일을 직접 읽고 고쳐요."
        },
        {
          "icon": "history",
          "title": "버전을 기록하고 언제든 되돌려요",
          "desc": "Git이 고친 기록을 차곡차곡 남겨요."
        },
        {
          "icon": "cloud",
          "title": "보관·데이터·공유까지 이어져요",
          "desc": "깃허브에 보관하고, 슈파베이스에 데이터를 담고, 버셀로 주소를 만들어요."
        },
        {
          "icon": "robot",
          "title": "명령도 AI가 직접 실행해요",
          "desc": "백엔드를 만들고 배포하는 일까지 맡길 수 있어요."
        }
      ]
    },
    "closing": "버전을 올려 가며 다듬다 보면, 완성도 있는 교육자료가 돼요."
  },
  {
    "kind": "teacher",
    "id": "why-teacher",
    "short": "개발자이기 전에 교사",
    "title": "우리는 개발자이기 전에 교사예요",
    "lead": "AI 기술은 도구일 뿐, 교사의 본질이 아니에요.",
    "points": [
      {
        "icon": "heart",
        "title": "좋은 교육자료는 좋은 기술이 아니라, 교육적 고민과 깊이에서 나와요."
      },
      {
        "icon": "target",
        "title": "화려한 기술이 없어도, 내가 가르치는 아이들에게 맞는 자료라면 그게 정답이에요."
      },
      {
        "icon": "share",
        "title": "무엇이든 자신 있게 나누고 공유하며 함께 성장해요."
      },
      {
        "icon": "shield",
        "title": "AI가 만든 결과는 교사가 직접 확인해요. 학생 개인정보는 넣지 않아요."
      }
    ],
    "closing": {
      "label": "그래서 이 연수는",
      "text": "교사의 교육적 고민을 기술의 제약 없이 AI 에이전트와 함께 구현할 수 있도록, 최소한의 환경을 함께 갖춰요."
    }
  }
]$slides$::jsonb
from public.posts where id = '77725d5a-9a33-4e12-a199-a3aee2ca2cd3'
on conflict (id) do nothing;
commit;
