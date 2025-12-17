-- ============================================================================
-- RLS 임시 비활성화 (테스트 및 개발용)
-- ============================================================================
-- ⚠️ 경고: 프로덕션 환경에서는 사용하지 마세요!
-- 개발/테스트 환경에서만 사용하세요.
-- ============================================================================

-- mfrm_runs, mfrm_results, essay_difficulties 테이블의 RLS 비활성화
ALTER TABLE mfrm_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE mfrm_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE essay_difficulties DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '⚠️ RLS가 비활성화되었습니다 (테스트용).';
    RAISE NOTICE '프로덕션 배포 전에 fix_rls_policies.sql을 실행하여 RLS를 다시 활성화하세요.';
END $$;

