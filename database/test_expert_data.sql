-- ============================================================================
-- 전문가 캘리브레이션 테스트 데이터
-- 전문가 5명 × 캘리브레이션 에세이 채점
-- ============================================================================

-- 1. 전문가 5명 등록
INSERT INTO expert_raters (id, name, email, institution, expertise_area, years_of_experience, is_active)
VALUES 
    ('e1111111-1111-1111-1111-111111111111', '김전문', 'expert1@test.com', '서울교대', '국어교육', 15, true),
    ('e2222222-2222-2222-2222-222222222222', '이전문', 'expert2@test.com', '경인교대', '작문교육', 12, true),
    ('e3333333-3333-3333-3333-333333333333', '박전문', 'expert3@test.com', '부산교대', '국어교육', 10, true),
    ('e4444444-4444-4444-4444-444444444444', '최전문', 'expert4@test.com', '대구교대', '작문교육', 8, true),
    ('e5555555-5555-5555-5555-555555555555', '정전문', 'expert5@test.com', '공주교대', '국어교육', 20, true)
ON CONFLICT (email) DO NOTHING;

-- 2. 전문가 채점 데이터 생성
-- 캘리브레이션/앵커 에세이에 대해 전문가별 채점
-- 각 전문가는 약간 다른 엄격성을 가짐

-- 전문가 채점 함수 (PL/pgSQL)
DO $$
DECLARE
    expert_rec RECORD;
    essay_rec RECORD;
    rubric_rec RECORD;
    base_score INTEGER;
    expert_offset INTEGER;
    final_score INTEGER;
    essay_difficulty DECIMAL;
BEGIN
    -- 기존 테스트 데이터 삭제
    DELETE FROM expert_scores WHERE expert_id IN (
        'e1111111-1111-1111-1111-111111111111',
        'e2222222-2222-2222-2222-222222222222',
        'e3333333-3333-3333-3333-333333333333',
        'e4444444-4444-4444-4444-444444444444',
        'e5555555-5555-5555-5555-555555555555'
    );

    -- 전문가별 엄격성 오프셋 (양수=관대, 음수=엄격)
    -- expert1: 0 (중립), expert2: -1 (엄격), expert3: 0 (중립), expert4: 1 (관대), expert5: 0 (중립)
    
    FOR expert_rec IN 
        SELECT id, name, 
            CASE 
                WHEN id = 'e1111111-1111-1111-1111-111111111111' THEN 0
                WHEN id = 'e2222222-2222-2222-2222-222222222222' THEN -1  -- 엄격
                WHEN id = 'e3333333-3333-3333-3333-333333333333' THEN 0
                WHEN id = 'e4444444-4444-4444-4444-444444444444' THEN 1   -- 관대
                WHEN id = 'e5555555-5555-5555-5555-555555555555' THEN 0
                ELSE 0
            END AS severity_offset
        FROM expert_raters 
        WHERE id IN (
            'e1111111-1111-1111-1111-111111111111',
            'e2222222-2222-2222-2222-222222222222',
            'e3333333-3333-3333-3333-333333333333',
            'e4444444-4444-4444-4444-444444444444',
            'e5555555-5555-5555-5555-555555555555'
        )
    LOOP
        FOR essay_rec IN 
            SELECT id, title, difficulty_level,
                CASE difficulty_level
                    WHEN 'low' THEN 0.7    -- 쉬운 에세이 = 높은 점수 경향
                    WHEN 'medium' THEN 0.5
                    WHEN 'high' THEN 0.3   -- 어려운 에세이 = 낮은 점수 경향
                    ELSE 0.5
                END AS base_prob
            FROM essays 
            WHERE (is_calibration = true OR is_anchor = true) AND is_active = true
        LOOP
            FOR rubric_rec IN 
                SELECT id, name FROM rubrics WHERE is_active = true
            LOOP
                -- 기본 점수 결정 (난이도 기반)
                IF random() < essay_rec.base_prob THEN
                    IF random() < 0.6 THEN
                        base_score := 3;  -- 우수
                    ELSE
                        base_score := 2;  -- 보통
                    END IF;
                ELSE
                    IF random() < 0.6 THEN
                        base_score := 1;  -- 미흡
                    ELSE
                        base_score := 2;  -- 보통
                    END IF;
                END IF;
                
                -- 전문가 엄격성 적용
                final_score := base_score + expert_rec.severity_offset;
                
                -- 범위 제한 (1-3)
                IF final_score < 1 THEN final_score := 1; END IF;
                IF final_score > 3 THEN final_score := 3; END IF;
                
                -- 약간의 랜덤 노이즈 추가 (10% 확률로 ±1)
                IF random() < 0.1 THEN
                    IF random() < 0.5 AND final_score > 1 THEN
                        final_score := final_score - 1;
                    ELSIF final_score < 3 THEN
                        final_score := final_score + 1;
                    END IF;
                END IF;
                
                -- 채점 데이터 삽입
                INSERT INTO expert_scores (expert_id, essay_id, rubric_id, score, confidence_level)
                VALUES (
                    expert_rec.id,
                    essay_rec.id,
                    rubric_rec.id,
                    final_score,
                    FLOOR(random() * 3 + 3)::INTEGER  -- 확신도 3-5
                )
                ON CONFLICT (expert_id, essay_id, rubric_id) DO UPDATE
                SET score = EXCLUDED.score;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE '전문가 % 채점 완료', expert_rec.name;
    END LOOP;
END $$;

-- 3. 생성된 데이터 확인
SELECT '전문가 수' AS metric, COUNT(DISTINCT expert_id)::TEXT AS value FROM expert_scores
UNION ALL
SELECT '에세이 수', COUNT(DISTINCT essay_id)::TEXT FROM expert_scores
UNION ALL
SELECT '평가요소 수', COUNT(DISTINCT rubric_id)::TEXT FROM expert_scores
UNION ALL
SELECT '총 채점 수', COUNT(*)::TEXT FROM expert_scores;

-- 4. 전문가별 평균 점수 확인 (엄격성 검증)
SELECT 
    er.name AS expert_name,
    COUNT(*) AS total_scores,
    ROUND(AVG(es.score), 2) AS mean_score,
    ROUND(STDDEV(es.score), 2) AS sd_score
FROM expert_scores es
JOIN expert_raters er ON es.expert_id = er.id
GROUP BY er.id, er.name
ORDER BY mean_score;

-- 5. 에세이별 통계
SELECT 
    e.title,
    e.difficulty_level,
    COUNT(*) AS expert_count,
    ROUND(AVG(es.score), 2) AS mean_score,
    ROUND(STDDEV(es.score), 2) AS sd_score
FROM expert_scores es
JOIN essays e ON es.essay_id = e.id
GROUP BY e.id, e.title, e.difficulty_level
ORDER BY mean_score;

