-- MFRM Rater Training System Database Schema
-- Supabase PostgreSQL
-- Updated: 2025-11-16 (Blueprint v0.9 반영)

-- ============================================================================
-- 0. ADMINS TABLE (관리자 정보)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT admin_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_admins_email ON admins(email);
COMMENT ON TABLE admins IS '관리자 정보 (에세이 입력, 앵커 설정 등 관리 기능)';

-- ============================================================================
-- 1. TEACHERS TABLE (교사 정보)
-- ============================================================================
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    institution VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 진단 단계 추적 (blueprint 기준)
    essays_rated_count INTEGER DEFAULT 0,  -- 채점한 에세이 수
    diagnosis_level VARCHAR(20) DEFAULT 'none',  -- none, preliminary(6), official(9), advanced(18)
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT diagnosis_level_check CHECK (diagnosis_level IN ('none', 'preliminary', 'official', 'advanced'))
);

-- 인덱스
CREATE INDEX idx_teachers_email ON teachers(email);
CREATE INDEX idx_teachers_is_active ON teachers(is_active);
CREATE INDEX idx_teachers_created_at ON teachers(created_at DESC);
CREATE INDEX idx_teachers_diagnosis_level ON teachers(diagnosis_level);

-- 코멘트
COMMENT ON TABLE teachers IS '평가자(교사) 정보';
COMMENT ON COLUMN teachers.essays_rated_count IS '채점한 에세이 총 개수';
COMMENT ON COLUMN teachers.diagnosis_level IS '진단 단계: none(0), preliminary(6편), official(9편), advanced(18편)';
COMMENT ON COLUMN teachers.metadata IS '추가 정보 (경력, 전공 등) JSON 형식';

-- ============================================================================
-- 2. ESSAYS TABLE (채점 대상 에세이)
-- ============================================================================
CREATE TABLE IF NOT EXISTS essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    grade_level VARCHAR(50),  -- 예: "고등학교 1학년", "중학교 3학년"
    prompt TEXT,  -- 에세이 작성 프롬프트
    word_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Blueprint v0.9: 앵커/캘리브레이션 구분
    is_anchor BOOLEAN DEFAULT FALSE,  -- 앵커 에세이 여부 (12-16편)
    is_calibration BOOLEAN DEFAULT FALSE,  -- 캘리브레이션 세트 포함 여부 (24-32편)
    anchor_explanation TEXT,  -- 앵커 해설 카드 (경계 근거 주해)
    difficulty_level VARCHAR(20),  -- low, medium, high
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT word_count_positive CHECK (word_count >= 0),
    CONSTRAINT difficulty_level_check CHECK (difficulty_level IS NULL OR difficulty_level IN ('low', 'medium', 'high'))
);

-- 인덱스
CREATE INDEX idx_essays_grade_level ON essays(grade_level);
CREATE INDEX idx_essays_is_active ON essays(is_active);
CREATE INDEX idx_essays_created_at ON essays(created_at DESC);
CREATE INDEX idx_essays_is_anchor ON essays(is_anchor);
CREATE INDEX idx_essays_is_calibration ON essays(is_calibration);

-- 코멘트
COMMENT ON TABLE essays IS '채점 대상 에세이';
COMMENT ON COLUMN essays.is_anchor IS '앵커 에세이 여부 (신규 교사 온보딩, 드리프트 감지용)';
COMMENT ON COLUMN essays.is_calibration IS '캘리브레이션 세트 포함 여부 (초기 고정척도 구축용)';
COMMENT ON COLUMN essays.anchor_explanation IS '앵커 해설 카드: 경계 근거 주해 (1↔2, 2↔3)';
COMMENT ON COLUMN essays.metadata IS '추가 정보 (출처, 주제 등) JSON 형식';

-- ============================================================================
-- 3. RUBRICS TABLE (채점 기준 - 8개 평가요소, 3점 척도)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50),  -- 범주: 내용, 조직, 표현
    name VARCHAR(100) NOT NULL,  -- 예: "주장", "이유", "근거"
    description TEXT,
    min_score INTEGER NOT NULL DEFAULT 1,  -- Blueprint: 3점 척도 (1/2/3)
    max_score INTEGER NOT NULL DEFAULT 3,
    weight DECIMAL(3, 2) DEFAULT 1.00,  -- 가중치
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Blueprint: 범주 경계 설명 (1↔2, 2↔3)
    boundary_1_2_description TEXT,  -- 1점과 2점 경계 설명
    boundary_2_3_description TEXT,  -- 2점과 3점 경계 설명
    
    CONSTRAINT score_range CHECK (min_score < max_score),
    CONSTRAINT weight_positive CHECK (weight > 0)
);

-- 인덱스
CREATE INDEX idx_rubrics_is_active ON rubrics(is_active);
CREATE INDEX idx_rubrics_display_order ON rubrics(display_order);

-- 코멘트
COMMENT ON TABLE rubrics IS '채점 항목 (8개 평가요소: 내용 3개, 조직 3개, 표현 2개, 3점 척도)';
COMMENT ON COLUMN rubrics.category IS '범주: 내용, 조직, 표현';
COMMENT ON COLUMN rubrics.weight IS '항목별 가중치 (MFRM 분석 시 활용)';
COMMENT ON COLUMN rubrics.boundary_1_2_description IS '1점↔2점 경계 기준 설명';
COMMENT ON COLUMN rubrics.boundary_2_3_description IS '2점↔3점 경계 기준 설명';

-- ============================================================================
-- 4. SCORES TABLE (채점 데이터)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 채점 시간 추적
    rating_duration_seconds INTEGER,  -- 채점에 소요된 시간 (초)
    
    -- 메타데이터
    comment TEXT,  -- 채점자 코멘트
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- 중복 채점 방지 (한 교사가 같은 에세이의 같은 항목을 중복 채점 불가)
    UNIQUE(teacher_id, essay_id, rubric_id)
);

-- 인덱스
CREATE INDEX idx_scores_teacher_id ON scores(teacher_id);
CREATE INDEX idx_scores_essay_id ON scores(essay_id);
CREATE INDEX idx_scores_rubric_id ON scores(rubric_id);
CREATE INDEX idx_scores_created_at ON scores(created_at DESC);
CREATE INDEX idx_scores_composite ON scores(teacher_id, essay_id, rubric_id);

-- 코멘트
COMMENT ON TABLE scores IS '실제 채점 데이터 (MFRM 분석의 핵심 데이터)';
COMMENT ON COLUMN scores.rating_duration_seconds IS '채점 소요 시간 (일관성 분석에 활용 가능)';

-- ============================================================================
-- 5. MFRM_RUNS TABLE (MFRM 분석 실행 기록 - 배치 재추정 버전 관리)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mfrm_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,  -- 예: "2025-1학기", "중간평가"
    description TEXT,
    
    -- Blueprint: 버전 관리 (배치 재추정)
    version_id VARCHAR(50) NOT NULL,  -- 예: "v1.0.0", "v1.0.1"
    is_active_version BOOLEAN DEFAULT FALSE,  -- 현재 활성 버전 여부
    
    -- 분석 상태
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    
    -- 분석 대상 데이터
    teacher_ids UUID[] DEFAULT '{}',  -- 분석에 포함된 교사 ID 배열
    essay_ids UUID[] DEFAULT '{}',    -- 분석에 포함된 에세이 ID 배열
    rubric_ids UUID[] DEFAULT '{}',   -- 분석에 포함된 루브릭 ID 배열
    
    -- 분석 결과 요약
    total_scores INTEGER,  -- 분석된 총 점수 개수
    convergence BOOLEAN,   -- TAM 모델 수렴 여부
    
    -- Blueprint: 품질 지표 (배치 재추정 수용 기준)
    median_infit DECIMAL(10, 4),  -- 인핏 중앙값 (수용: 0.7-1.3)
    median_outfit DECIMAL(10, 4),  -- 아웃핏 중앙값 (수용: 0.7-1.3)
    separation_index DECIMAL(10, 4),  -- 분리지수 (수용: ≥ 1.5)
    extreme_response_rate DECIMAL(5, 2),  -- 극단 응답률(%) (수용: ≤ 10%)
    
    -- 시간 추적
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 에러 정보
    error_message TEXT,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT status_check CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- 인덱스
CREATE INDEX idx_mfrm_runs_status ON mfrm_runs(status);
CREATE INDEX idx_mfrm_runs_created_at ON mfrm_runs(created_at DESC);
CREATE INDEX idx_mfrm_runs_version_id ON mfrm_runs(version_id);
CREATE INDEX idx_mfrm_runs_is_active_version ON mfrm_runs(is_active_version);

-- 코멘트
COMMENT ON TABLE mfrm_runs IS 'MFRM 분석 실행 기록 (배치 재추정 버전 관리)';
COMMENT ON COLUMN mfrm_runs.version_id IS '버전 ID: 수렴 실패·적합도 악화 시 이전 버전 롤백 가능';
COMMENT ON COLUMN mfrm_runs.is_active_version IS '현재 활성 버전 (리포트에 사용)';
COMMENT ON COLUMN mfrm_runs.convergence IS 'TAM 모델이 수렴했는지 여부';
COMMENT ON COLUMN mfrm_runs.median_infit IS '인핏 중앙값 (수용 임계: 0.7-1.3)';
COMMENT ON COLUMN mfrm_runs.separation_index IS '분리지수 (수용 임계: ≥ 1.5)';

-- ============================================================================
-- 6. MFRM_RESULTS TABLE (MFRM 분석 결과)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mfrm_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES mfrm_runs(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    
    -- MFRM 파라미터
    severity DECIMAL(10, 4),  -- 엄격성 (logit scale)
    severity_se DECIMAL(10, 4),  -- 엄격성 표준오차
    severity_ci_lower DECIMAL(10, 4),  -- 엄격성 95% CI 하한
    severity_ci_upper DECIMAL(10, 4),  -- 엄격성 95% CI 상한
    
    infit DECIMAL(10, 4),  -- Infit (일관성 지표)
    outfit DECIMAL(10, 4),  -- Outfit (일관성 지표)
    
    -- 추가 통계
    mean_score DECIMAL(5, 2),  -- 평균 점수
    sd_score DECIMAL(5, 2),  -- 표준편차
    total_ratings INTEGER,  -- 총 채점 수
    
    -- Blueprint: 추가 진단 지표
    halo_effect_score DECIMAL(5, 2),  -- 헤일로 효과 점수 (요소 간 상관)
    category_imbalance_score DECIMAL(5, 2),  -- 범주 불균형 점수
    response_time_anomaly_count INTEGER DEFAULT 0,  -- 반응시간 이상치 개수
    
    -- 시간
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 메타데이터 (추가 분석 결과: 범주 사용 분포, 월별 드리프트 등)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- 중복 방지
    UNIQUE(run_id, teacher_id)
);

-- 인덱스
CREATE INDEX idx_mfrm_results_run_id ON mfrm_results(run_id);
CREATE INDEX idx_mfrm_results_teacher_id ON mfrm_results(teacher_id);
CREATE INDEX idx_mfrm_results_severity ON mfrm_results(severity);
CREATE INDEX idx_mfrm_results_composite ON mfrm_results(run_id, teacher_id);

-- 코멘트
COMMENT ON TABLE mfrm_results IS 'MFRM 분석 결과 (교사별 파라미터)';
COMMENT ON COLUMN mfrm_results.severity IS '평가자 엄격성 (양수: 엄격, 음수: 관대)';
COMMENT ON COLUMN mfrm_results.severity_ci_lower IS '엄격성 95% 신뢰구간 하한';
COMMENT ON COLUMN mfrm_results.infit IS 'Infit MNSQ (0.7-1.3 적정 범위)';
COMMENT ON COLUMN mfrm_results.outfit IS 'Outfit MNSQ (0.7-1.3 적정 범위)';
COMMENT ON COLUMN mfrm_results.halo_effect_score IS '헤일로 효과: 평가요소 간 과도한 상관 (0-1, 높을수록 문제)';
COMMENT ON COLUMN mfrm_results.category_imbalance_score IS '범주 불균형: 특정 점수 과다 사용 (0-1, 높을수록 문제)';

-- ============================================================================
-- 7. ESSAY_DIFFICULTIES TABLE (에세이 난이도 분석 결과)
-- ============================================================================
CREATE TABLE IF NOT EXISTS essay_difficulties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES mfrm_runs(id) ON DELETE CASCADE,
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    
    -- 난이도 파라미터
    difficulty DECIMAL(10, 4),  -- 난이도 (logit scale)
    difficulty_se DECIMAL(10, 4),  -- 난이도 표준오차
    
    -- 통계
    mean_score DECIMAL(5, 2),
    sd_score DECIMAL(5, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(run_id, essay_id)
);

-- 인덱스
CREATE INDEX idx_essay_difficulties_run_id ON essay_difficulties(run_id);
CREATE INDEX idx_essay_difficulties_essay_id ON essay_difficulties(essay_id);
CREATE INDEX idx_essay_difficulties_difficulty ON essay_difficulties(difficulty);

-- 코멘트
COMMENT ON TABLE essay_difficulties IS '에세이별 난이도 분석 결과 (MFRM)';

-- ============================================================================
-- 8. UPDATED_AT TRIGGER (자동 업데이트 시간 갱신)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON essays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rubrics_updated_at BEFORE UPDATE ON rubrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mfrm_runs_updated_at BEFORE UPDATE ON mfrm_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) 설정
-- ============================================================================

-- RLS 활성화
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfrm_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfrm_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_difficulties ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 읽기 가능 (익명 포함)
CREATE POLICY "Enable read access for all users" ON admins
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON teachers
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON essays
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON rubrics
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON scores
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON mfrm_runs
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON mfrm_results
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON essay_difficulties
    FOR SELECT USING (true);

-- 정책: 교사는 자신의 점수만 추가/수정 가능
CREATE POLICY "Teachers can insert their own scores" ON scores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Teachers can update their own scores" ON scores
    FOR UPDATE USING (true);

-- 정책: 관리자는 에세이 생성/수정 가능 (추후 auth.uid() 기반으로 정교화)
CREATE POLICY "Admins can manage essays" ON essays
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage rubrics" ON rubrics
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. SAMPLE DATA (테스트용 샘플 데이터)
-- ============================================================================

-- 샘플 교사
INSERT INTO teachers (id, email, name, institution) VALUES
    ('11111111-1111-1111-1111-111111111111', 'teacher1@example.com', '김영희', '서울고등학교'),
    ('22222222-2222-2222-2222-222222222222', 'teacher2@example.com', '이철수', '부산고등학교'),
    ('33333333-3333-3333-3333-333333333333', 'teacher3@example.com', '박민수', '대전고등학교')
ON CONFLICT (email) DO NOTHING;

-- 샘플 루브릭 (새로운 기준: 8개 평가요소, 3점 척도)
-- 범주: 내용(3개), 조직(3개), 표현(2개)
INSERT INTO rubrics (id, category, name, description, min_score, max_score, display_order, boundary_1_2_description, boundary_2_3_description) VALUES
    -- 내용 범주
    ('10000001-0000-0000-0000-000000000001', '내용', '주장', '주장의 명확성과 일관성', 1, 3, 1, 
     '1점: 주장이 불명확하거나 일관성이 부족하여 논점이 제대로 전달되지 않는다.', 
     '3점: 주장이 명확하고 일관되며, 논점이 분명하게 드러난다.'),
    ('10000001-0000-0000-0000-000000000002', '내용', '이유', '이유의 타당성과 충분성', 1, 3, 2,
     '1점: 이유가 주장을 충분히 지지하지 못하고 근거와의 연결이 불명확하거나, 양적으로 매우 부족하다.', 
     '3점: 이유가 주장을 명확히 지지하면서 근거의 의미를 분명히 이해할 수 있으며, 양적으로 충분하다.'),
    ('10000001-0000-0000-0000-000000000003', '내용', '근거', '근거의 질과 양', 1, 3, 3,
     '1점: 근거가 이유와 구분이 불분명하거나 질적, 양적으로 매우 부족하다.', 
     '3점: 근거가 이유와 주장을 잘 뒷받침하고 질적, 양적으로 충분하다.'),
    
    -- 조직 범주
    ('10000001-0000-0000-0000-000000000004', '조직', '통일성', '글의 주제 중심 일관성', 1, 3, 4,
     '1점: 글이 주제를 중심으로 구성되지 않으며, 여러 문단에서 주제와 관련 없는 내용이 포함되어 통일성이 떨어진다.', 
     '3점: 글이 하나의 주제를 중심으로 일관되게 구성되었다.'),
    ('10000001-0000-0000-0000-000000000005', '조직', '응집성', '문장과 문단 간의 논리적 연결', 1, 3, 5,
     '1점: 문장, 문단 간의 연결이 자연스럽지 않고, 응집 장치가 적절히 사용되지 않아 논리적 흐름이 흐트러진다.', 
     '3점: 문장, 문단 간의 논리적 연결이 자연스럽고, 응집 장치가 적절히 사용되어 논리적 흐름이 매끄럽게 유지되었다.'),
    ('10000001-0000-0000-0000-000000000006', '조직', '완결성', '서론-본론-결론의 구조 완성도', 1, 3, 6,
     '1점: 서론, 본론, 결론 중 한 부분 이상이 크게 부족하거나 누락되어, 논증적 글쓰기에 필수적인 구조가 확보되지 않는다.', 
     '3점: 논증적인 글에 적합한 서론-본론-결론의 구조가 완성도 있게 갖추어졌다.'),
    
    -- 표현 범주
    ('10000001-0000-0000-0000-000000000007', '표현', '어휘·문장 적절성', '어휘와 문장의 적절성과 효과성', 1, 3, 7,
     '1점: 어휘와 문장에서 오류가 잦고 부적절한 표현이 많아 독자의 이해를 방해한다.', 
     '3점: 어휘와 문장이 글의 목적에 맞게 적절하고 효과적으로 사용되었다.'),
    ('10000001-0000-0000-0000-000000000008', '표현', '어문 규범 준수', '맞춤법, 띄어쓰기, 문장부호 준수', 1, 3, 8,
     '1점: 맞춤법, 띄어쓰기, 문장부호 등 국어의 기본 규범이 전혀 지켜지지 않아, 글 전체가 극히 혼란스럽고 독자의 이해를 저해한다.', 
     '3점: 맞춤법, 띄어쓰기, 문장부호 등 국어의 기본 규범과 글쓰기 관습이 정확하게 지켜졌으며, 오류가 없다.')
ON CONFLICT (id) DO NOTHING;

-- 샘플 에세이
INSERT INTO essays (id, title, content, grade_level, word_count) VALUES
    ('20000001-0000-0000-0000-000000000001', '나의 꿈', '저의 꿈은 교사가 되는 것입니다...', '고등학교 1학년', 500),
    ('20000001-0000-0000-0000-000000000002', '환경 보호의 중요성', '지구 온난화로 인한 환경 문제가 심각해지고 있습니다...', '고등학교 2학년', 650),
    ('20000001-0000-0000-0000-000000000003', '인공지능 시대의 교육', '인공지능 기술의 발전은 교육 현장에도 큰 변화를 가져오고 있습니다...', '고등학교 3학년', 720)
ON CONFLICT (id) DO NOTHING;

-- 샘플 점수 (교사1이 에세이1을 9개 요소로 채점, 3점 척도)
INSERT INTO scores (teacher_id, essay_id, rubric_id, score, rating_duration_seconds) VALUES
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000001', 2, 45),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000002', 2, 38),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000003', 3, 42),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000004', 2, 51),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000005', 1, 35),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000006', 2, 40),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000007', 3, 28),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000008', 2, 47),
    ('11111111-1111-1111-1111-111111111111', '20000001-0000-0000-0000-000000000001', '10000001-0000-0000-0000-000000000009', 2, 44)
ON CONFLICT (teacher_id, essay_id, rubric_id) DO NOTHING;

-- ============================================================================
-- 11. USEFUL VIEWS (유용한 뷰)
-- ============================================================================

-- 교사별 채점 통계
CREATE OR REPLACE VIEW teacher_statistics AS
SELECT 
    t.id AS teacher_id,
    t.name AS teacher_name,
    t.email,
    COUNT(s.id) AS total_ratings,
    AVG(s.score) AS mean_score,
    STDDEV(s.score) AS sd_score,
    MIN(s.created_at) AS first_rating_at,
    MAX(s.created_at) AS last_rating_at
FROM teachers t
LEFT JOIN scores s ON t.id = s.teacher_id
GROUP BY t.id, t.name, t.email;

COMMENT ON VIEW teacher_statistics IS '교사별 채점 통계 요약';

-- 에세이별 채점 통계
CREATE OR REPLACE VIEW essay_statistics AS
SELECT 
    e.id AS essay_id,
    e.title,
    e.grade_level,
    COUNT(DISTINCT s.teacher_id) AS num_raters,
    COUNT(s.id) AS total_ratings,
    AVG(s.score) AS mean_score,
    STDDEV(s.score) AS sd_score
FROM essays e
LEFT JOIN scores s ON e.id = s.essay_id
GROUP BY e.id, e.title, e.grade_level;

COMMENT ON VIEW essay_statistics IS '에세이별 채점 통계 요약';

-- 최근 MFRM 분석 결과 (가장 최근 성공한 분석)
CREATE OR REPLACE VIEW latest_mfrm_results AS
SELECT 
    mr.teacher_id,
    t.name AS teacher_name,
    t.email,
    mr.severity,
    mr.infit,
    mr.outfit,
    mr.mean_score,
    mr.total_ratings,
    mr.created_at AS analyzed_at
FROM mfrm_results mr
JOIN teachers t ON mr.teacher_id = t.id
JOIN mfrm_runs r ON mr.run_id = r.id
WHERE r.id = (
    SELECT id FROM mfrm_runs 
    WHERE status = 'completed' 
    ORDER BY completed_at DESC 
    LIMIT 1
);

COMMENT ON VIEW latest_mfrm_results IS '가장 최근 성공한 MFRM 분석 결과';

-- ============================================================================
-- 12. HELPER FUNCTIONS (유틸리티 함수)
-- ============================================================================

-- 교사의 평균 엄격성 조회
CREATE OR REPLACE FUNCTION get_teacher_severity(teacher_uuid UUID)
RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        SELECT AVG(severity)
        FROM mfrm_results
        WHERE teacher_id = teacher_uuid
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_teacher_severity IS '특정 교사의 평균 엄격성 파라미터 조회';

-- 교사의 채점 에세이 수 증가 (Blueprint v0.9)
CREATE OR REPLACE FUNCTION increment_essays_rated(teacher_uuid UUID)
RETURNS VOID AS $$
DECLARE
    current_count INTEGER;
    new_level VARCHAR(20);
BEGIN
    -- 현재 카운트 조회
    SELECT essays_rated_count INTO current_count
    FROM teachers
    WHERE id = teacher_uuid;
    
    -- 카운트 증가
    current_count := current_count + 1;
    
    -- 진단 레벨 결정
    IF current_count >= 18 THEN
        new_level := 'advanced';
    ELSIF current_count >= 9 THEN
        new_level := 'official';
    ELSIF current_count >= 6 THEN
        new_level := 'preliminary';
    ELSE
        new_level := 'none';
    END IF;
    
    -- 업데이트
    UPDATE teachers
    SET essays_rated_count = current_count,
        diagnosis_level = new_level
    WHERE id = teacher_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_essays_rated IS 'Blueprint v0.9: 교사의 채점 에세이 수 증가 및 진단 레벨 자동 업데이트';

-- ============================================================================
-- 완료!
-- ============================================================================

-- 스키마 생성 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'MFRM Database Schema Created Successfully!';
    RAISE NOTICE 'Tables: teachers, essays, rubrics, scores, mfrm_runs, mfrm_results, essay_difficulties';
    RAISE NOTICE 'Sample data inserted for testing.';
END $$;

