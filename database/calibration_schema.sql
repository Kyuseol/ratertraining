-- ============================================================================
-- MFRM 캘리브레이션 시스템 스키마 확장
-- Blueprint v0.9: 고정척도 기반 앵커 에세이 시스템
-- 작성일: 2025-12-08
-- ============================================================================

-- ============================================================================
-- 1. ANCHOR_CONSENSUS_SCORES 테이블 (전문가 합의 점수)
-- ============================================================================
-- 목적: 앵커/캘리브레이션 에세이에 대한 전문가 패널의 합의 점수 저장
-- 이 점수는 초기 캘리브레이션의 입력 데이터가 됨

CREATE TABLE IF NOT EXISTS anchor_consensus_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 에세이 및 평가요소 연결
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    
    -- 합의 점수 (1, 2, 3)
    consensus_score INTEGER NOT NULL CHECK (consensus_score IN (1, 2, 3)),
    
    -- 경계 사례 지정
    -- 이 에세이-평가요소 조합이 특정 경계를 대표하는 사례인지 표시
    is_boundary_1_2 BOOLEAN DEFAULT FALSE,  -- 1점↔2점 경계 사례
    is_boundary_2_3 BOOLEAN DEFAULT FALSE,  -- 2점↔3점 경계 사례
    
    -- 패널 정보
    expert_panel_size INTEGER DEFAULT 1,           -- 패널 인원 수
    agreement_rate DECIMAL(5, 2),                  -- 일치율 (0-100%)
    
    -- 경계 근거 설명 (왜 이 점수인지)
    boundary_rationale TEXT,
    
    -- 메타데이터
    created_by UUID,                               -- 입력한 관리자
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 중복 방지 (에세이-평가요소 조합당 하나의 합의 점수)
    UNIQUE(essay_id, rubric_id)
);

-- 인덱스
CREATE INDEX idx_anchor_scores_essay ON anchor_consensus_scores(essay_id);
CREATE INDEX idx_anchor_scores_rubric ON anchor_consensus_scores(rubric_id);
CREATE INDEX idx_anchor_scores_boundary_1_2 ON anchor_consensus_scores(is_boundary_1_2) WHERE is_boundary_1_2 = TRUE;
CREATE INDEX idx_anchor_scores_boundary_2_3 ON anchor_consensus_scores(is_boundary_2_3) WHERE is_boundary_2_3 = TRUE;

-- 코멘트
COMMENT ON TABLE anchor_consensus_scores IS '앵커/캘리브레이션 에세이의 전문가 합의 점수';
COMMENT ON COLUMN anchor_consensus_scores.consensus_score IS '전문가 패널의 합의 점수 (1/2/3)';
COMMENT ON COLUMN anchor_consensus_scores.is_boundary_1_2 IS '1점↔2점 경계를 대표하는 사례 여부';
COMMENT ON COLUMN anchor_consensus_scores.is_boundary_2_3 IS '2점↔3점 경계를 대표하는 사례 여부';
COMMENT ON COLUMN anchor_consensus_scores.boundary_rationale IS '해당 점수의 경계 근거 설명';

-- ============================================================================
-- 2. ESSAYS 테이블 확장 (캘리브레이션 결과 저장)
-- ============================================================================
-- 캘리브레이션 후 에세이의 난이도 Logit 값을 저장

-- 난이도 Logit 값
ALTER TABLE essays ADD COLUMN IF NOT EXISTS difficulty_logit DECIMAL(10, 4);
ALTER TABLE essays ADD COLUMN IF NOT EXISTS difficulty_logit_se DECIMAL(10, 4);

-- 캘리브레이션 상태
ALTER TABLE essays ADD COLUMN IF NOT EXISTS is_calibrated BOOLEAN DEFAULT FALSE;
ALTER TABLE essays ADD COLUMN IF NOT EXISTS calibrated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE essays ADD COLUMN IF NOT EXISTS calibration_run_id UUID REFERENCES mfrm_runs(id);

-- 코멘트
COMMENT ON COLUMN essays.difficulty_logit IS '캘리브레이션된 난이도 (Logit scale)';
COMMENT ON COLUMN essays.difficulty_logit_se IS '난이도 표준오차';
COMMENT ON COLUMN essays.is_calibrated IS '캘리브레이션 완료 여부 (고정척도 확립)';
COMMENT ON COLUMN essays.calibration_run_id IS '캘리브레이션을 수행한 MFRM run ID';

-- ============================================================================
-- 3. CALIBRATION_RUNS 테이블 (캘리브레이션 실행 이력)
-- ============================================================================
-- mfrm_runs와 별도로 캘리브레이션 전용 실행 기록

CREATE TABLE IF NOT EXISTS calibration_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version_id VARCHAR(50) NOT NULL,              -- 예: "cal_v1.0", "cal_v1.1"
    
    -- 상태
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    is_active_version BOOLEAN DEFAULT FALSE,        -- 현재 활성 캘리브레이션
    
    -- 포함된 데이터
    essay_ids UUID[] DEFAULT '{}',                  -- 캘리브레이션에 포함된 에세이
    rubric_ids UUID[] DEFAULT '{}',                 -- 포함된 평가요소
    
    -- 결과 요약
    total_observations INTEGER,                     -- 총 관측치 수
    convergence BOOLEAN,                            -- 수렴 여부
    
    -- 품질 지표
    global_fit_chi_square DECIMAL(10, 4),
    global_fit_df INTEGER,
    global_fit_p_value DECIMAL(10, 6),
    separation_reliability DECIMAL(5, 4),           -- 분리 신뢰도
    
    -- 시간
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 에러 정보
    error_message TEXT,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT calibration_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- 인덱스
CREATE INDEX idx_calibration_runs_status ON calibration_runs(status);
CREATE INDEX idx_calibration_runs_version ON calibration_runs(version_id);
CREATE INDEX idx_calibration_runs_active ON calibration_runs(is_active_version) WHERE is_active_version = TRUE;

-- 코멘트
COMMENT ON TABLE calibration_runs IS '초기 캘리브레이션 실행 기록 (고정척도 구축)';
COMMENT ON COLUMN calibration_runs.is_active_version IS '현재 사용 중인 캘리브레이션 버전';

-- ============================================================================
-- 4. CALIBRATION_RESULTS 테이블 (에세이별 캘리브레이션 결과)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calibration_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 연결
    calibration_run_id UUID NOT NULL REFERENCES calibration_runs(id) ON DELETE CASCADE,
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    
    -- 난이도 파라미터
    difficulty_logit DECIMAL(10, 4),
    difficulty_se DECIMAL(10, 4),
    difficulty_ci_lower DECIMAL(10, 4),           -- 95% CI 하한
    difficulty_ci_upper DECIMAL(10, 4),           -- 95% CI 상한
    
    -- 적합도
    infit DECIMAL(10, 4),
    outfit DECIMAL(10, 4),
    
    -- 통계
    mean_score DECIMAL(5, 2),
    sd_score DECIMAL(5, 2),
    observation_count INTEGER,
    
    -- 시간
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- 중복 방지
    UNIQUE(calibration_run_id, essay_id)
);

-- 인덱스
CREATE INDEX idx_calibration_results_run ON calibration_results(calibration_run_id);
CREATE INDEX idx_calibration_results_essay ON calibration_results(essay_id);

-- 코멘트
COMMENT ON TABLE calibration_results IS '캘리브레이션 결과 (에세이별 난이도)';

-- ============================================================================
-- 5. 트리거: updated_at 자동 갱신
-- ============================================================================

CREATE TRIGGER update_anchor_scores_updated_at 
    BEFORE UPDATE ON anchor_consensus_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calibration_runs_updated_at 
    BEFORE UPDATE ON calibration_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. RLS 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE anchor_consensus_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_results ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (모든 사용자)
CREATE POLICY "Enable read access for all users" ON anchor_consensus_scores
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON calibration_runs
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON calibration_results
    FOR SELECT USING (true);

-- 쓰기 정책 (관리자용 - 추후 auth.uid() 기반으로 정교화)
CREATE POLICY "Enable write for admins" ON anchor_consensus_scores
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable write for admins" ON calibration_runs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable write for admins" ON calibration_results
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. 유용한 뷰
-- ============================================================================

-- 앵커 에세이 커버리지 뷰 (실제 합의 점수 기반)
CREATE OR REPLACE VIEW anchor_coverage_matrix AS
SELECT 
    r.id AS rubric_id,
    r.name AS rubric_name,
    r.category AS rubric_category,
    COUNT(DISTINCT CASE WHEN acs.is_boundary_1_2 THEN e.id END) AS boundary_1_2_count,
    COUNT(DISTINCT CASE WHEN acs.is_boundary_2_3 THEN e.id END) AS boundary_2_3_count,
    COUNT(DISTINCT e.id) AS total_anchor_essays,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN acs.is_boundary_1_2 THEN e.id END) >= 2 
         AND COUNT(DISTINCT CASE WHEN acs.is_boundary_2_3 THEN e.id END) >= 2 
        THEN 'complete'
        WHEN COUNT(DISTINCT CASE WHEN acs.is_boundary_1_2 THEN e.id END) >= 1 
         AND COUNT(DISTINCT CASE WHEN acs.is_boundary_2_3 THEN e.id END) >= 1 
        THEN 'partial'
        ELSE 'insufficient'
    END AS coverage_status
FROM rubrics r
LEFT JOIN anchor_consensus_scores acs ON r.id = acs.rubric_id
LEFT JOIN essays e ON acs.essay_id = e.id AND e.is_anchor = true AND e.is_active = true
WHERE r.is_active = true
GROUP BY r.id, r.name, r.category
ORDER BY r.display_order;

COMMENT ON VIEW anchor_coverage_matrix IS '평가요소별 앵커 에세이 경계 커버리지 현황';

-- 캘리브레이션 준비 상태 뷰
CREATE OR REPLACE VIEW calibration_readiness AS
SELECT 
    (SELECT COUNT(*) FROM essays WHERE is_calibration = true AND is_active = true) AS calibration_essay_count,
    (SELECT COUNT(*) FROM essays WHERE is_anchor = true AND is_active = true) AS anchor_essay_count,
    (SELECT COUNT(DISTINCT essay_id) FROM anchor_consensus_scores) AS essays_with_consensus,
    (SELECT COUNT(*) FROM anchor_consensus_scores) AS total_consensus_scores,
    (SELECT COUNT(*) FROM rubrics WHERE is_active = true) AS rubric_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM essays WHERE is_calibration = true AND is_active = true) >= 24
         AND (SELECT COUNT(DISTINCT essay_id) FROM anchor_consensus_scores) >= 24
         AND (SELECT COUNT(*) FROM anchor_consensus_scores) >= 24 * 8
        THEN 'ready'
        ELSE 'not_ready'
    END AS status,
    CASE 
        WHEN (SELECT COUNT(*) FROM essays WHERE is_calibration = true AND is_active = true) < 24
        THEN '캘리브레이션 에세이 부족 (최소 24편 필요)'
        WHEN (SELECT COUNT(DISTINCT essay_id) FROM anchor_consensus_scores) < 24
        THEN '합의 점수 입력된 에세이 부족'
        WHEN (SELECT COUNT(*) FROM anchor_consensus_scores) < 24 * 8
        THEN '합의 점수 입력 불완전 (에세이별 8개 평가요소 필요)'
        ELSE '캘리브레이션 준비 완료'
    END AS message;

COMMENT ON VIEW calibration_readiness IS '캘리브레이션 실행 준비 상태 확인';

-- ============================================================================
-- 8. 유틸리티 함수
-- ============================================================================

-- 앵커 에세이 고정 함수 (캘리브레이션 완료 후 호출)
CREATE OR REPLACE FUNCTION fix_anchor_parameters(calibration_run_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    fixed_count INTEGER := 0;
BEGIN
    -- 캘리브레이션 결과를 essays 테이블에 반영
    UPDATE essays e
    SET 
        difficulty_logit = cr.difficulty_logit,
        difficulty_logit_se = cr.difficulty_se,
        is_calibrated = true,
        calibrated_at = NOW(),
        calibration_run_id = calibration_run_uuid
    FROM calibration_results cr
    WHERE cr.essay_id = e.id
      AND cr.calibration_run_id = calibration_run_uuid
      AND e.is_anchor = true;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    -- 캘리브레이션 run을 활성 버전으로 설정
    UPDATE calibration_runs SET is_active_version = FALSE WHERE is_active_version = TRUE;
    UPDATE calibration_runs SET is_active_version = TRUE WHERE id = calibration_run_uuid;
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fix_anchor_parameters IS '캘리브레이션 결과를 앵커 에세이에 고정';

-- ============================================================================
-- 완료!
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== 캘리브레이션 스키마 확장 완료 ===';
    RAISE NOTICE '새 테이블: anchor_consensus_scores, calibration_runs, calibration_results';
    RAISE NOTICE 'essays 확장: difficulty_logit, is_calibrated, calibration_run_id';
    RAISE NOTICE '새 뷰: anchor_coverage_matrix, calibration_readiness';
    RAISE NOTICE '새 함수: fix_anchor_parameters';
END $$;

