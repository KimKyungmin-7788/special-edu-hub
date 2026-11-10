-- ============================================================
-- 70_app_held_owner_email.sql — 자동 점검으로 공개가 보류되면 작성자에게도 메일 (2026-11-11)
--
-- 68 의 record_app_check 를 그대로 두고 한 가지만 더한다:
--  - 새로 보류(held)된 자료는 운영자뿐 아니라 작성자에게도 메일(app_held)을 보낸다.
--    무엇이 걸렸는지와 '다시 점검' 방법을 알려 준다(문구는 src/config/email.ts).
-- 동의 창의 "등록한 선생님께 조치를 위한 메시지를 보내 드립니다"를 실제 동작으로 맞춘다.
--
-- ⚠️ 적용 순서: 메일 문구가 들어간 코드를 먼저 배포한 뒤 실행한다
--    (먼저 실행하면 서버가 app_held 종류를 몰라 그 메일만 나가지 않는다 — 점검·보류는 정상).
--
-- 선행: 68(record_app_check·set_app_review), 47(request_email).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

create or replace function public.record_app_check(
  p_secret       text,
  p_app_id       text,
  p_trigger      text,
  p_requested_by uuid,
  p_result       jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_app    record;
  v_status text := p_result->>'status';
  v_review text;
  v_verif  text;
  v_first  text;
  v_email  text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'email_webhook_secret';
  if v_secret is null or p_secret is null or p_secret <> v_secret then
    raise exception '권한이 없습니다.';
  end if;
  if v_status is null or v_status not in ('pass', 'blocked', 'unverifiable') then
    raise exception '점검 결과가 올바르지 않습니다.';
  end if;

  select id, title, owner_id, app_url, review_status, verification_status
    into v_app from public.apps where id = p_app_id;
  if not found then
    raise exception '자료를 찾을 수 없습니다.';
  end if;

  insert into public.app_checks
    (app_id, trigger_kind, requested_by, url, final_url, status, reason, findings, facts, code_hash, file_count, scanner_version)
  values
    (p_app_id, p_trigger, p_requested_by, coalesce(v_app.app_url, ''),
     coalesce(p_result->>'finalUrl', ''), v_status, coalesce(p_result->>'reason', ''),
     coalesce(p_result->'findings', '[]'::jsonb), coalesce(p_result->'facts', '{}'::jsonb),
     p_result->>'codeHash', coalesce((p_result->>'fileCount')::integer, 0),
     coalesce(p_result->>'scannerVersion', ''));

  v_review := v_app.review_status;
  if v_status = 'blocked' then
    if v_app.review_status in ('pending', 'held') then
      v_review := 'held';
      v_verif := 'reviewing';
    elsif v_app.review_status = 'approved' then
      v_verif := 'reverify';   -- 이미 공개된 자료는 자동으로 내리지 않는다
    else
      v_verif := 'reviewing';
    end if;
  else
    if v_app.review_status in ('pending', 'held') then
      v_review := 'approved';
    end if;
    v_verif := case when v_status = 'pass' then 'verified' else 'unverified' end;
  end if;

  perform public.set_app_review(
    p_app_id, v_review, v_verif, null,
    case v_status when 'blocked' then '자동 점검: 확인이 필요한 항목 발견'
                  when 'pass' then '자동 점검: 걸린 것 없음'
                  else '자동 점검: 확인 불가' end
  );

  -- 새로 보류됐거나, 공개 중인 자료가 재검증 필요로 바뀌면 운영자에게 메일
  if v_status = 'blocked'
     and (v_app.review_status is distinct from v_review or v_app.verification_status is distinct from v_verif) then
    select f->>'evidence' into v_first
      from jsonb_array_elements(coalesce(p_result->'findings', '[]'::jsonb)) f
     where f->>'level' = 'block' limit 1;
    perform public.request_email(
      'staff_app_held', v_app.owner_id, null,
      jsonb_build_object('title', v_app.title, 'appId', p_app_id, 'reason', coalesce(v_first, ''),
                         'held', case when v_review = 'held' then 'yes' else '' end)
    );
  end if;

  -- 새로 보류된 자료는 작성자에게도 메일로 알린다(무엇이 걸렸는지, 다시 점검하는 방법)
  if v_status = 'blocked' and v_review = 'held' and v_app.review_status <> 'held' and v_app.owner_id is not null then
    select email into v_email from auth.users where id = v_app.owner_id;
    if v_email is not null then
      perform public.request_email(
        'app_held', v_app.owner_id, v_email,
        jsonb_build_object('title', v_app.title, 'appId', p_app_id, 'reason', coalesce(v_first, ''))
      );
    end if;
  end if;

  return jsonb_build_object('review_status', v_review, 'verification_status', v_verif);
end;
$$;

revoke all on function public.record_app_check(text, text, text, uuid, jsonb) from public;
grant execute on function public.record_app_check(text, text, text, uuid, jsonb) to anon, authenticated;
