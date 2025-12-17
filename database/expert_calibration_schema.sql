-- ============================================================================
-- 전문가 개별 채점 기반 캘리브레이션 스키마
-- Blueprint v0.9: 진정한 MFRM 기반 고정척도 구축
-- 작성일: 2025-12-08
-- ============================================================================
-- 
-- 핵심 개념:
-- - 기존 "합의 점수"는 전문가들의 개별 채점을 집계한 결과
-- - 진정한 MFRM을 위해서는 전문가 개별 채점 데이터가 필요
-- - 전문가 5명 × 에세이 24편 × 평가요소 8개 = 960개 관측치
-- 
-- ============================================================================

-- ============================================================================
-- 1. EXPERT_RATERS 테이블 (전문가 평가자)
-- ============================================================================

CREATE TABLE IF NOT EXISTS expert_raters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    institution VARCHAR(200),                      -- 소속 기관
    expertise_area VARCHAR(100),                   -- 전문 분야
    
    -- 자격 정보
    years_of_experience INTEGER,                   -- 경력 년수
    qualification_level VARCHAR(50),               -- 자격 수준
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 메타데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 인덱스
CREATE INDEX idx_expert_raters_active ON expert_raters(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_expert_raters_email ON expert_raters(email);

-- 코멘트
COMMENT ON TABLE expert_raters IS '캘리브레이션 전문가 평가자 정보';
COMMENT ON COLUMN expert_raters.expertise_area IS '전문 분야 (예: 국어교육, 작문교육)';

-- ============================================================================
-- 2. EXPERT_SCORES 테이블 (전문가 개별 채점)
-- ============================================================================
-- 핵심: 각 전문가가 독립적으로 채점한 점수 저장
-- MFRM 분석의 원시 데이터

CREATE TABLE IF NOT EXISTS expert_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 연결
    expert_id UUID NOT NULL REFERENCES expert_raters(id) ON DELETE CASCADE,
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    
    -- 개별 채점 점수 (1, 2, 3)
    score INTEGER NOT NULL CHECK (score IN (1, 2, 3)),
    
    -- 채점 메타
    rating_duration_seconds INTEGER,               -- 채점 소요 시간
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),  -- 확신도 (1-5)
    
    -- 경계 사례 여부 (전문가 판단)
    is_boundary_case BOOLEAN DEFAULT FALSE,
    boundary_type VARCHAR(10),                     -- '1-2' 또는 '2-3'
    
    -- 채점 근거 (선택)
    rationale TEXT,
    
    -- 시간
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 전문가-에세이-평가요소 조합당 하나의 점수
    UNIQUE(expert_id, essay_id, rubric_id)
);

-- 인덱스
CREATE INDEX idx_expert_scores_expert ON expert_scores(expert_id);
CREATE INDEX idx_expert_scores_essay ON expert_scores(essay_id);
CREATE INDEX idx_expert_scores_rubric ON expert_scores(rubric_id);
CREATE INDEX idx_expert_scores_boundary ON expert_scores(is_boundary_case) WHERE is_boundary_case = TRUE;

-- 코멘트
COMMENT ON TABLE expert_scores IS '전문가 개별 채점 데이터 (MFRM 캘리브레이션 원시 데이터)';
COMMENT ON COLUMN expert_scores.score IS '전문가 개별 채점 점수 (1/2/3)';
COMMENT ON COLUMN expert_scores.confidence_level IS '채점 확신도 (1=매우 불확실, 5=매우 확신)';

-- ============================================================================
-- 3. CALIBRATION_PANELS 테이블 (캘리브레이션 패널)
-- ============================================================================
-- 특정 캘리브레이션에 참여한 전문가 그룹 관리

CREATE TABLE IF NOT EXISTS calibration_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 패널 구성
    expert_ids UUID[] NOT NULL,                    -- 참여 전문가 ID 목록
    essay_ids UUID[] NOT NULL,                     -- 대상 에세이 ID 목록
    
    -- 상태
    status VARCHAR(50) DEFAULT 'active',           -- active, completed, archived
    
    -- 통계
    total_expected_scores INTEGER,                 -- 예상 총 점수 수
    total_completed_scores INTEGER DEFAULT 0,      -- 완료된 점수 수
    
    -- 시간
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 코멘트
COMMENT ON TABLE calibration_panels IS '캘리브레이션 전문가 패널 정보';

-- ============================================================================
-- 4. 기존 anchor_consensus_scores 확장
-- ============================================================================
-- 전문가 개별 점수에서 합의 점수 도출 시 참조

ALTER TABLE anchor_consensus_scores 
    ADD COLUMN IF NOT EXISTS derived_from_expert_scores BOOLEAN DEFAULT FALSE;

ALTER TABLE anchor_consensus_scores 
    ADD COLUMN IF NOT EXISTS expert_score_ids UUID[];

ALTER TABLE anchor_consensus_scores 
    ADD COLUMN IF NOT EXISTS score_distribution JSONB;  -- {1: 2, 2: 2, 3: 1} 형태

COMMENT ON COLUMN anchor_consensus_scores.derived_from_expert_scores IS '전문가 개별 점수에서 도출된 합의인지 여부';
COMMENT ON COLUMN anchor_consensus_scores.score_distribution IS '점수 분포 (예: {"1": 1, "2": 3, "3": 1})';

-- ============================================================================
-- 5. 유용한 뷰
-- ============================================================================

-- 전문가별 채점 진행률
CREATE OR REPLACE VIEW expert_scoring_progress AS
SELECT 
    er.id AS expert_id,
    er.name AS expert_name,
    er.email,
    COUNT(DISTINCT es.essay_id) AS essays_scored,
    COUNT(es.id) AS total_scores,
    (SELECT COUNT(*) FROM essays WHERE (is_anchor = TRUE OR is_calibration = TRUE) AND is_active = TRUE) AS target_essays,
    (SELECT COUNT(*) FROM rubrics WHERE is_active = TRUE) AS rubrics_per_essay,
    ROUND(
        COUNT(es.id)::DECIMAL / 
        NULLIF(
            (SELECT COUNT(*) FROM essays WHERE (is_anchor = TRUE OR is_calibration = TRUE) AND is_active = TRUE) *
            (SELECT COUNT(*) FROM rubrics WHERE is_active = TRUE),
            0
        ) * 100, 
        1
    ) AS completion_percentage
FROM expert_raters er
LEFT JOIN expert_scores es ON er.id = es.expert_id
WHERE er.is_active = TRUE
GROUP BY er.id, er.name, er.email
ORDER BY completion_percentage DESC;

COMMENT ON VIEW expert_scoring_progress IS '전문가별 채점 진행률';

-- 에세이별 전문가 채점 현황
CREATE OR REPLACE VIEW essay_expert_coverage AS
SELECT 
    e.id AS essay_id,
    e.title,
    e.is_anchor,
    e.is_calibration,
    COUNT(DISTINCT es.expert_id) AS expert_count,
    COUNT(DISTINCT es.rubric_id) AS rubrics_with_scores,
    (SELECT COUNT(*) FROM rubrics WHERE is_active = TRUE) AS total_rubrics,
    ROUND(AVG(es.score), 2) AS mean_score,
    ROUND(STDDEV(es.score), 2) AS score_sd,
    CASE 
        WHEN COUNT(DISTINCT es.expert_id) >= 5 
         AND COUNT(DISTINCT es.rubric_id) = (SELECT COUNT(*) FROM rubrics WHERE is_active = TRUE)
        THEN 'complete'
        WHEN COUNT(DISTINCT es.expert_id) >= 3
        THEN 'partial'
        ELSE 'insufficient'
    END AS coverage_status
FROM essays e
LEFT JOIN expert_scores es ON e.id = es.essay_id
WHERE (e.is_anchor = TRUE OR e.is_calibration = TRUE) AND e.is_active = TRUE
GROUP BY e.id, e.title, e.is_anchor, e.is_calibration
ORDER BY e.created_at;

COMMENT ON VIEW essay_expert_coverage IS '에세이별 전문가 채점 커버리지';

-- 에세이-평가요소별 점수 분포
CREATE OR REPLACE VIEW score_distribution_by_item AS
SELECT 
    e.id AS essay_id,
    e.title AS essay_title,
    r.id AS rubric_id,
    r.name AS rubric_name,
    r.category,
    COUNT(*) AS total_scores,
    SUM(CASE WHEN es.score = 1 THEN 1 ELSE 0 END) AS score_1_count,
    SUM(CASE WHEN es.score = 2 THEN 1 ELSE 0 END) AS score_2_count,
    SUM(CASE WHEN es.score = 3 THEN 1 ELSE 0 END) AS score_3_count,
    ROUND(AVG(es.score), 2) AS mean_score,
    ROUND(STDDEV(es.score), 2) AS score_sd,
    -- 최빈값 (합의 점수 후보)
    MODE() WITHIN GROUP (ORDER BY es.score) AS mode_score,
    -- 일치율 계산
    ROUND(
        GREATEST(
            SUM(CASE WHEN es.score = 1 THEN 1 ELSE 0 END),
            SUM(CASE WHEN es.score = 2 THEN 1 ELSE 0 END),
            SUM(CASE WHEN es.score = 3 THEN 1 ELSE 0 END)
        )::DECIMAL / NULLIF(COUNT(*), 0) * 100,
        1
    ) AS agreement_rate
FROM essays e
CROSS JOIN rubrics r
LEFT JOIN expert_scores es ON e.id = es.essay_id AND r.id = es.rubric_id
WHERE (e.is_anchor = TRUE OR e.is_calibration = TRUE) 
  AND e.is_active = TRUE 
  AND r.is_active = TRUE
GROUP BY e.id, e.title, r.id, r.name, r.category, r.display_order
ORDER BY e.title, r.display_order;

COMMENT ON VIEW score_distribution_by_item IS '에세이-평가요소별 전문가 점수 분포';

-- 캘리브레이션 준비 상태 (전문가 기반)
CREATE OR REPLACE VIEW calibration_readiness_expert AS
SELECT 
    (SELECT COUNT(*) FROM expert_raters WHERE is_active = TRUE) AS active_experts,
    (SELECT COUNT(*) FROM essays WHERE is_calibration = TRUE AND is_active = TRUE) AS calibration_essays,
    (SELECT COUNT(*) FROM essays WHERE is_anchor = TRUE AND is_active = TRUE) AS anchor_essays,
    (SELECT COUNT(*) FROM expert_scores) AS total_expert_scores,
    (SELECT COUNT(DISTINCT essay_id) FROM expert_scores) AS essays_with_scores,
    -- 최소 요구사항 체크
    CASE 
        WHEN (SELECT COUNT(*) FROM expert_raters WHERE is_active = TRUE) >= 5
         AND (SELECT COUNT(*) FROM essays WHERE is_calibration = TRUE AND is_active = TRUE) >= 24
         AND (SELECT COUNT(DISTINCT essay_id) FROM expert_scores) >= 20
         AND (SELECT COUNT(*) FROM expert_scores) >= 
             (SELECT COUNT(*) FROM expert_raters WHERE is_active = TRUE) * 20 * 
             (SELECT COUNT(*) FROM rubrics WHERE is_active = TRUE) * 0.8
        THEN 'ready'
        ELSE 'not_ready'
    END AS status,
    -- 상세 메시지
    CASE 
        WHEN (SELECT COUNT(*) FROM expert_raters WHERE is_active = TRUE) < 5
        THEN '전문가 부족 (최소 5명 필요, 현재: ' || 
             (SELECT COUNT(*) FROM expert_raters WHERE is_active = TRUE) || '명)'
        WHEN (SELECT COUNT(*) FROM essays WHERE is_calibration = TRUE AND is_active = TRUE) < 24
        THEN '캘리브레이션 에세이 부족 (최소 24편 필요)'
        WHEN (SELECT COUNT(DISTINCT essay_id) FROM expert_scores) < 20
        THEN '전문가 채점 데이터 부족'
        ELSE '캘리브레이션 준비 완료!'
    END AS message;

COMMENT ON VIEW calibration_readiness_expert IS '전문가 기반 캘리브레이션 준비 상태';

-- ============================================================================
-- 6. 함수: 전문가 점수 → 합의 점수 도출
-- ============================================================================

CREATE OR REPLACE FUNCTION derive_consensus_from_experts(
    target_essay_id UUID,
    target_rubric_id UUID,
    min_experts INTEGER DEFAULT 3
)
RETURNS TABLE (
    consensus_score INTEGER,
    agreement_rate DECIMAL,
    expert_count INTEGER,
    score_distribution JSONB,
    is_boundary BOOLEAN,
    boundary_type VARCHAR(10)
) AS $$
DECLARE
    score_counts RECORD;
    max_count INTEGER;
    total_count INTEGER;
    derived_score INTEGER;
    dist JSONB;
BEGIN
    -- 점수 분포 계산
    SELECT 
        COALESCE(SUM(CASE WHEN es.score = 1 THEN 1 ELSE 0 END), 0) AS c1,
        COALESCE(SUM(CASE WHEN es.score = 2 THEN 1 ELSE 0 END), 0) AS c2,
        COALESCE(SUM(CASE WHEN es.score = 3 THEN 1 ELSE 0 END), 0) AS c3,
        COUNT(*) AS total
    INTO score_counts
    FROM expert_scores es
    WHERE es.essay_id = target_essay_id AND es.rubric_id = target_rubric_id;
    
    total_count := score_counts.total;
    
    -- 최소 전문가 수 체크
    IF total_count < min_experts THEN
        RETURN QUERY SELECT 
            NULL::INTEGER,
            NULL::DECIMAL,
            total_count::INTEGER,
            NULL::JSONB,
            NULL::BOOLEAN,
            NULL::VARCHAR(10);
        RETURN;
    END IF;
    
    -- 최빈값 결정
    max_count := GREATEST(score_counts.c1, score_counts.c2, score_counts.c3);
    
    IF score_counts.c1 = max_count THEN
        derived_score := 1;
    ELSIF score_counts.c2 = max_count THEN
        derived_score := 2;
    ELSE
        derived_score := 3;
    END IF;
    
    -- 점수 분포 JSON
    dist := jsonb_build_object('1', score_counts.c1, '2', score_counts.c2, '3', score_counts.c3);
    
    -- 경계 사례 판단 (점수 분포가 인접 범주에 걸쳐있으면 경계)
    RETURN QUERY SELECT 
        derived_score,
        ROUND(max_count::DECIMAL / total_count * 100, 1),
        total_count::INTEGER,
        dist,
        (score_counts.c1 > 0 AND score_counts.c2 > 0) OR (score_counts.c2 > 0 AND score_counts.c3 > 0),
        CASE 
            WHEN score_counts.c1 > 0 AND score_counts.c2 > 0 AND score_counts.c3 = 0 THEN '1-2'
            WHEN score_counts.c1 = 0 AND score_counts.c2 > 0 AND score_counts.c3 > 0 THEN '2-3'
            WHEN score_counts.c1 > 0 AND score_counts.c2 > 0 AND score_counts.c3 > 0 THEN 'mixed'
            ELSE NULL
        END::VARCHAR(10);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION derive_consensus_from_experts IS '전문가 개별 점수에서 합의 점수 도출';

-- ============================================================================
-- 7. 트리거
-- ============================================================================

CREATE TRIGGER update_expert_raters_updated_at 
    BEFORE UPDATE ON expert_raters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_scores_updated_at 
    BEFORE UPDATE ON expert_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calibration_panels_updated_at 
    BEFORE UPDATE ON calibration_panels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. RLS 정책
-- ============================================================================

ALTER TABLE expert_raters ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_panels ENABLE ROW LEVEL SECURITY;

-- 읽기: 모두 허용
CREATE POLICY "Enable read for all" ON expert_raters FOR SELECT USING (true);
CREATE POLICY "Enable read for all" ON expert_scores FOR SELECT USING (true);
CREATE POLICY "Enable read for all" ON calibration_panels FOR SELECT USING (true);

-- 쓰기: 모두 허용 (추후 관리자만으로 제한)
CREATE POLICY "Enable write for all" ON expert_raters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable write for all" ON expert_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable write for all" ON calibration_panels FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 9. 샘플 데이터 (테스트용, 필요시 주석 해제)
-- ============================================================================

/*
-- 샘플 전문가 5명
INSERT INTO expert_raters (name, email, institution, expertise_area, years_of_experience)
VALUES 
    ('김전문', 'expert1@test.com', '서울교대', '국어교육', 15),
    ('이전문', 'expert2@test.com', '경인교대', '작문교육', 12),
    ('박전문', 'expert3@test.com', '부산교대', '국어교육', 10),
    ('최전문', 'expert4@test.com', '대구교대', '작문교육', 8),
    ('정전문', 'expert5@test.com', '공주교대', '국어교육', 20);
*/

-- ============================================================================
-- 완료!
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== 전문가 개별 채점 스키마 추가 완료 ===';
    RAISE NOTICE '새 테이블: expert_raters, expert_scores, calibration_panels';
    RAISE NOTICE '새 뷰: expert_scoring_progress, essay_expert_coverage, score_distribution_by_item, calibration_readiness_expert';
    RAISE NOTICE '새 함수: derive_consensus_from_experts';
    RAISE NOTICE '';
    RAISE NOTICE '== 워크플로 ==';
    RAISE NOTICE '1. 전문가 등록 (expert_raters)';
    RAISE NOTICE '2. 전문가 개별 채점 (expert_scores)';
    RAISE NOTICE '3. 합의 점수 도출 (derive_consensus_from_experts 함수)';
    RAISE NOTICE '4. MFRM 캘리브레이션 실행';
END $$;

