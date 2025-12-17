-- ============================================================================
-- RLS INSERT 정책 추가 (MFRM 분석 결과 저장용)
-- ============================================================================
-- 문제: mfrm_runs, mfrm_results, essay_difficulties 테이블에 INSERT 정책이 없음
-- 해결: 관리자 및 인증된 사용자가 삽입할 수 있도록 정책 추가
-- ============================================================================

-- 1. mfrm_runs: 인증된 사용자가 삽입 가능
CREATE POLICY "Enable insert for authenticated users" ON mfrm_runs
    FOR INSERT 
    WITH CHECK (true);  -- 모든 인증된 사용자 허용

-- 2. mfrm_results: 인증된 사용자가 삽입 가능
CREATE POLICY "Enable insert for authenticated users" ON mfrm_results
    FOR INSERT 
    WITH CHECK (true);

-- 3. essay_difficulties: 인증된 사용자가 삽입 가능
CREATE POLICY "Enable insert for authenticated users" ON essay_difficulties
    FOR INSERT 
    WITH CHECK (true);

-- 4. UPDATE 정책도 추가 (활성 버전 변경 등)
CREATE POLICY "Enable update for authenticated users" ON mfrm_runs
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ RLS INSERT/UPDATE 정책이 추가되었습니다.';
    RAISE NOTICE '이제 프론트엔드에서 MFRM 분석 결과를 저장할 수 있습니다.';
END $$;

