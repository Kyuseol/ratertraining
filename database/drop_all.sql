-- MFRM 데이터베이스 초기화 스크립트
-- 기존 테이블, 뷰, 함수를 모두 삭제합니다
-- ⚠️ 주의: 모든 데이터가 삭제됩니다!

-- 1. 뷰 삭제
DROP VIEW IF EXISTS latest_mfrm_results CASCADE;
DROP VIEW IF EXISTS essay_statistics CASCADE;
DROP VIEW IF EXISTS teacher_statistics CASCADE;

-- 2. 함수 삭제
DROP FUNCTION IF EXISTS get_teacher_severity(UUID) CASCADE;
DROP FUNCTION IF EXISTS increment_essays_rated() CASCADE;

-- 3. 테이블 삭제 (역순으로, 외래키 의존성 고려)
DROP TABLE IF EXISTS essay_difficulties CASCADE;
DROP TABLE IF EXISTS mfrm_results CASCADE;
DROP TABLE IF EXISTS mfrm_runs CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS rubrics CASCADE;
DROP TABLE IF EXISTS essays CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- 4. 인덱스 삭제 (혹시 남아있는 것들)
DROP INDEX IF EXISTS idx_teachers_email;
DROP INDEX IF EXISTS idx_essays_is_anchor;
DROP INDEX IF EXISTS idx_essays_is_calibration;
DROP INDEX IF EXISTS idx_scores_teacher_id;
DROP INDEX IF EXISTS idx_scores_essay_id;
DROP INDEX IF EXISTS idx_scores_rubric_id;
DROP INDEX IF EXISTS idx_mfrm_runs_version_id;
DROP INDEX IF EXISTS idx_mfrm_runs_is_active;
DROP INDEX IF EXISTS idx_mfrm_results_run_id;
DROP INDEX IF EXISTS idx_mfrm_results_teacher_id;

-- 완료 메시지
SELECT '✅ 모든 테이블, 뷰, 함수 삭제 완료!' as status;

