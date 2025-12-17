-- ============================================================================
-- 추가 샘플 데이터 생성 (MFRM 분석 테스트용)
-- ============================================================================
-- 목적: MFRM 분석 최소 요구사항 충족 (30개 이상 점수)
-- 현재: 18개 점수 → 추가: 20개 점수 (총 38개)
-- ============================================================================

-- 현재 상태 확인
DO $$
DECLARE
    current_scores INTEGER;
    current_teachers INTEGER;
    current_essays INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_scores FROM scores;
    SELECT COUNT(*) INTO current_teachers FROM teachers WHERE is_active = TRUE;
    SELECT COUNT(*) INTO current_essays FROM essays WHERE is_active = TRUE;
    
    RAISE NOTICE '=== 현재 데이터 상태 ===';
    RAISE NOTICE '점수: % 개', current_scores;
    RAISE NOTICE '교사: % 명', current_teachers;
    RAISE NOTICE '에세이: % 개', current_essays;
END $$;

-- ============================================================================
-- 1. 추가 에세이 생성 (3개 더 추가 → 총 6개)
-- ============================================================================

INSERT INTO essays (title, prompt, content, grade_level, is_active, is_anchor, is_calibration)
VALUES
-- 에세이 4: 중간 난이도
('에세이 4: 환경 보호의 중요성', 
 '환경 보호가 왜 중요한지 설명하고, 우리가 실천할 수 있는 방법을 제시하시오.',
 '환경 보호는 우리의 미래를 위해 매우 중요한 과제입니다. 

첫째, 지구 온난화로 인해 극지방의 빙하가 녹고 있습니다. 이는 해수면 상승으로 이어져 해안 지역이 침수될 위험이 있습니다. 또한 기후 변화로 인해 이상 기후 현상이 빈번하게 발생하고 있습니다.

둘째, 생물 다양성이 감소하고 있습니다. 많은 동식물들이 서식지 파괴로 멸종 위기에 처해 있습니다. 생태계의 균형이 무너지면 인간도 큰 피해를 입을 수 있습니다.

우리가 실천할 수 있는 방법으로는 일회용품 사용을 줄이고, 대중교통을 이용하며, 재활용을 생활화하는 것이 있습니다. 작은 실천이 모여 큰 변화를 만들 수 있습니다.', 
 'high', TRUE, FALSE, TRUE),

-- 에세이 5: 쉬운 난이도
('에세이 5: 독서의 즐거움',
 '독서가 주는 즐거움에 대해 자신의 경험을 바탕으로 서술하시오.',
 '나는 책 읽는 것을 좋아한다. 책을 읽으면 새로운 세계를 경험할 수 있다.

특히 판타지 소설을 읽을 때가 가장 재미있다. 주인공이 되어 모험을 떠나는 상상을 하면 정말 신난다. 해리포터 시리즈를 읽을 때는 마법학교에 다니는 기분이었다.

또 책을 읽으면 지식도 늘어난다. 과학책을 읽으면 우주나 동물에 대해 알게 된다. 역사책을 읽으면 옛날 사람들의 삶을 알 수 있다.

친구들도 책을 많이 읽었으면 좋겠다. 게임만 하지 말고 책도 읽으면 더 재미있을 것이다.', 
 'middle', TRUE, FALSE, TRUE),

-- 에세이 6: 어려운 난이도
('에세이 6: 인공지능의 윤리적 문제',
 '인공지능 기술의 발전에 따른 윤리적 문제를 논하고, 해결 방안을 제시하시오.',
 '인공지능 기술이 급속도로 발전하면서 다양한 윤리적 문제가 대두되고 있다. 이는 단순한 기술적 이슈를 넘어 인간 사회의 근본적인 가치와 관련된 중대한 문제이다.

첫째, 알고리즘의 편향성 문제가 있다. AI는 학습 데이터의 편향을 그대로 반영하여 특정 집단에 대한 차별을 재생산할 수 있다. 예를 들어, 채용 AI가 과거 데이터를 학습하여 성별이나 인종에 따른 편향된 결정을 내릴 수 있다. 이는 평등권 침해로 이어질 수 있다.

둘째, 개인정보 보호와 프라이버시 침해 문제가 심각하다. AI 시스템은 방대한 개인 데이터를 수집하고 분석하는데, 이 과정에서 개인의 사생활이 침해될 수 있다. 안면 인식 기술이나 행동 패턴 분석은 개인의 동의 없이 감시 사회를 만들 위험이 있다.

셋째, 책임 소재의 불명확성이 문제된다. 자율주행차가 사고를 일으켰을 때 누가 책임을 져야 하는가? 제조사인가, 프로그래머인가, 아니면 AI 자체인가? 현행 법체계는 이러한 상황을 명확히 규정하지 못하고 있다.

넷째, 일자리 대체로 인한 사회경제적 불평등 심화가 우려된다. AI가 많은 직업을 대체하면서 대량 실업이 발생할 수 있으며, 이는 사회적 양극화를 더욱 심화시킬 것이다.

이러한 문제들을 해결하기 위해서는 다층적인 접근이 필요하다. 우선, 명확한 AI 윤리 가이드라인과 법적 규제가 마련되어야 한다. 유럽연합의 AI Act와 같이 위험도에 따른 단계별 규제가 효과적일 수 있다. 또한 AI 개발 과정에서 다양한 이해관계자의 참여를 보장하여 편향을 최소화해야 한다. 마지막으로 AI 리터러시 교육을 통해 시민들이 AI 기술을 비판적으로 이해하고 활용할 수 있도록 해야 한다.', 
 'high', TRUE, TRUE, TRUE); -- 앵커 에세이로 설정

-- ============================================================================
-- 2. 추가 채점 데이터 생성
-- ============================================================================
-- 전략: 각 교사가 3개 에세이(기존) + 3개 에세이(신규) = 총 6개 에세이 채점
--       각 에세이당 9개 루브릭 × 3명 교사 × 6개 에세이 = 162개 점수
--       현재 18개 있으므로, 144개 추가 필요
--       실제로는 50개 정도만 추가하여 총 68개로 만들겠습니다 (충분함)

-- 기존 교사 ID 조회 및 저장
DO $$
DECLARE
    teacher1_id UUID;
    teacher2_id UUID;
    teacher3_id UUID;
    essay1_id UUID;
    essay2_id UUID;
    essay3_id UUID;
    essay4_id UUID;
    essay5_id UUID;
    essay6_id UUID;
    rubric_ids UUID[];
    r_id UUID;
    score_val INTEGER;
BEGIN
    -- 교사 ID 조회
    SELECT id INTO teacher1_id FROM teachers WHERE email = 'teacher1@example.com' LIMIT 1;
    SELECT id INTO teacher2_id FROM teachers WHERE email = 'teacher2@example.com' LIMIT 1;
    SELECT id INTO teacher3_id FROM teachers WHERE email = 'teacher3@example.com' LIMIT 1;
    
    -- 에세이 ID 조회 (제목으로)
    SELECT id INTO essay1_id FROM essays WHERE title LIKE '%에세이 1%' LIMIT 1;
    SELECT id INTO essay2_id FROM essays WHERE title LIKE '%에세이 2%' LIMIT 1;
    SELECT id INTO essay3_id FROM essays WHERE title LIKE '%에세이 3%' LIMIT 1;
    SELECT id INTO essay4_id FROM essays WHERE title LIKE '%에세이 4%' LIMIT 1;
    SELECT id INTO essay5_id FROM essays WHERE title LIKE '%에세이 5%' LIMIT 1;
    SELECT id INTO essay6_id FROM essays WHERE title LIKE '%에세이 6%' LIMIT 1;
    
    -- 루브릭 ID 배열 (9개)
    SELECT ARRAY_AGG(id ORDER BY order_number) INTO rubric_ids FROM rubrics WHERE is_active = TRUE;
    
    RAISE NOTICE '=== 추가 점수 생성 시작 ===';
    
    -- Teacher 1: 에세이 3, 4, 5 채점 (각 9개 루브릭)
    FOREACH r_id IN ARRAY rubric_ids LOOP
        -- 에세이 3
        score_val := (RANDOM() * 2 + 1)::INTEGER; -- 1, 2, 3 중 랜덤
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher1_id, essay3_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
        
        -- 에세이 4
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher1_id, essay4_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
        
        -- 에세이 5
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher1_id, essay5_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
    END LOOP;
    
    -- Teacher 2: 에세이 3, 4, 5, 6 채점
    FOREACH r_id IN ARRAY rubric_ids LOOP
        -- 에세이 3
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher2_id, essay3_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
        
        -- 에세이 4
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher2_id, essay4_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
        
        -- 에세이 5
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher2_id, essay5_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
        
        -- 에세이 6
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher2_id, essay6_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
    END LOOP;
    
    -- Teacher 3: 에세이 4, 5, 6 채점
    FOREACH r_id IN ARRAY rubric_ids LOOP
        -- 에세이 4
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher3_id, essay4_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
        
        -- 에세이 5
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher3_id, essay5_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
        
        -- 에세이 6
        score_val := (RANDOM() * 2 + 1)::INTEGER;
        INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds)
        VALUES (teacher3_id, essay6_id, r_id, score_val, (RANDOM() * 120 + 30)::INTEGER)
        ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE '추가 점수 생성 완료';
END $$;

-- ============================================================================
-- 3. 결과 확인
-- ============================================================================

DO $$
DECLARE
    total_scores INTEGER;
    total_teachers INTEGER;
    total_essays INTEGER;
    anchor_essays INTEGER;
    calibration_essays INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_scores FROM scores;
    SELECT COUNT(*) INTO total_teachers FROM teachers WHERE is_active = TRUE;
    SELECT COUNT(*) INTO total_essays FROM essays WHERE is_active = TRUE;
    SELECT COUNT(*) INTO anchor_essays FROM essays WHERE is_anchor = TRUE AND is_active = TRUE;
    SELECT COUNT(*) INTO calibration_essays FROM essays WHERE is_calibration = TRUE AND is_active = TRUE;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 샘플 데이터 추가 완료 ===';
    RAISE NOTICE '총 점수: % 개 (MFRM 분석 %)', total_scores, CASE WHEN total_scores >= 30 THEN '가능 ✅' ELSE '불가능 ❌' END;
    RAISE NOTICE '총 교사: % 명', total_teachers;
    RAISE NOTICE '총 에세이: % 개', total_essays;
    RAISE NOTICE '앵커 에세이: % 개', anchor_essays;
    RAISE NOTICE '캘리브레이션 에세이: % 개', calibration_essays;
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계: R 백엔드를 실행하고 MFRM 분석을 시작하세요!';
END $$;

-- 교사별 채점 현황 표시
SELECT 
    t.name AS "교사명",
    t.email AS "이메일",
    COUNT(DISTINCT s.essay_id) AS "채점한_에세이_수",
    COUNT(*) AS "총_점수",
    t.diagnosis_level AS "진단_레벨"
FROM teachers t
LEFT JOIN scores s ON t.id = s.teacher_id
WHERE t.is_active = TRUE
GROUP BY t.id, t.name, t.email, t.diagnosis_level
ORDER BY COUNT(*) DESC;

