import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { IEssay, IRubric } from '../types';
import './RatingPage.css';

interface RatingData {
  [rubricId: string]: {
    score: number | null;
    startTime: number;
  };
}

interface AccordionItemProps {
  rubric: IRubric;
  index: number;
  total: number;
  score: number | null;
  isOpen: boolean;
  onToggle: () => void;
  onScoreSelect: (score: number) => void;
}

/**
 * 아코디언 항목 컴포넌트
 */
const AccordionItem: React.FC<AccordionItemProps> = ({
  rubric,
  index,
  total,
  score,
  isOpen,
  onToggle,
  onScoreSelect,
}) => {
  return (
    <div className={`accordion-item ${isOpen ? 'open' : ''}`}>
      <button className="accordion-header" onClick={onToggle}>
        <span className="accordion-title">
          {index + 1}. {rubric.name}
        </span>
        <span className="accordion-score">
          {score !== null ? `[${score}점]` : '[미채점]'}
        </span>
        <span className={`accordion-icon ${isOpen ? 'rotate' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="accordion-content">
          {rubric.description && (
            <p className="rubric-description">{rubric.description}</p>
          )}
          
          {/* 범주 경계 설명 */}
          {(rubric.boundary_1_2_description || rubric.boundary_2_3_description) && (
            <div className="boundary-info">
              {rubric.boundary_1_2_description && (
                <div className="boundary-item">
                  <strong>1↔2 경계:</strong> {rubric.boundary_1_2_description}
                </div>
              )}
              {rubric.boundary_2_3_description && (
                <div className="boundary-item">
                  <strong>2↔3 경계:</strong> {rubric.boundary_2_3_description}
                </div>
              )}
            </div>
          )}
          
          {/* 3점 척도 선택 */}
          <div className="score-buttons">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                className={`score-btn ${score === s ? 'selected' : ''}`}
                onClick={() => onScoreSelect(s)}
              >
                <span className="score-number">{s}점</span>
                <span className="score-label">
                  {s === 1 && '(미흡)'}
                  {s === 2 && '(보통)'}
                  {s === 3 && '(우수)'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 채점 페이지
 * Blueprint v0.9: 9개 평가요소, 3점 척도, 앵커 혼입, 반응시간 측정
 */
export const RatingPage: React.FC = () => {
  const { user } = useAuth();
  const [essay, setEssay] = useState<IEssay | null>(null);
  const [rubrics, setRubrics] = useState<IRubric[]>([]);
  const [ratings, setRatings] = useState<RatingData>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openAccordionIndex, setOpenAccordionIndex] = useState<number | null>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchRubrics();
  }, []);

  useEffect(() => {
    if (rubrics.length > 0) {
      fetchNextEssay();
    }
  }, [rubrics]);

  const fetchRubrics = async () => {
    const { data, error } = await supabase
      .from('rubrics')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('루브릭 조회 실패:', error);
      return;
    }

    setRubrics(data || []);
  };

  const fetchNextEssay = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 1. 이미 채점한 에세이 ID 목록 조회
      const { data: ratedEssays, error: ratedError } = await supabase
        .from('scores')
        .select('essay_id')
        .eq('teacher_id', user.id);

      if (ratedError) throw ratedError;

      // 이미 채점한 에세이의 모든 루브릭을 완료한 경우만 제외
      const ratedEssayIds = ratedEssays
        ? [...new Set(ratedEssays.map((s) => s.essay_id))]
        : [];

      // 2. 아직 채점하지 않은 에세이 조회
      // Blueprint: 앵커 혼입률 고려 (신규 25%, 유지 15-20%)
      const { data: allEssays, error: essaysError } = await supabase
        .from('essays')
        .select('*')
        .eq('is_active', true);

      if (essaysError) throw essaysError;

      // 이미 채점한 에세이 제외
      const availableEssays = allEssays?.filter(
        (essay) => !ratedEssayIds.includes(essay.id)
      ) || [];

      const data = availableEssays;
      const error = null;

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('채점할 에세이가 없습니다.\n모든 에세이를 이미 채점하셨습니다!');
        return;
      }

      // 랜덤으로 하나 선택
      const randomEssay = data[Math.floor(Math.random() * data.length)];
      setEssay(randomEssay);

      // 채점 데이터 초기화 (시작 시간 기록)
      const initialRatings: RatingData = {};
      rubrics.forEach((rubric) => {
        initialRatings[rubric.id] = {
          score: null,
          startTime: Date.now(),
        };
      });
      setRatings(initialRatings);
      setOpenAccordionIndex(0);
    } catch (err) {
      console.error('에세이 조회 실패:', err);
      alert('에세이를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSelect = (rubricId: string, score: number) => {
    setRatings((prev) => ({
      ...prev,
      [rubricId]: {
        ...prev[rubricId],
        score,
      },
    }));

    // 자동으로 다음 루브릭으로 이동
    const currentIndex = rubrics.findIndex(r => r.id === rubricId);
    if (currentIndex < rubrics.length - 1) {
      setTimeout(() => {
        setOpenAccordionIndex(currentIndex + 1);
      }, 300);
    }
  };

  const handleSubmit = async () => {
    if (!user || !essay) return;

    // 모든 루브릭 채점 완료 확인
    const allRated = rubrics.every((r) => ratings[r.id]?.score !== null);
    if (!allRated) {
      alert('모든 평가요소를 채점해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. UPSERT 전에 기존 채점 여부 확인 (카운트 증가 판단용)
      const { data: existingScores } = await supabase
        .from('scores')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('essay_id', essay.id)
        .limit(1);

      const isFirstRating = !existingScores || existingScores.length === 0;

      // 2. 각 루브릭별로 점수 저장 (UPSERT: 중복 시 업데이트)
      const scores = rubrics.map((rubric) => ({
        teacher_id: user.id,
        essay_id: essay.id,
        rubric_id: rubric.id,
        score: ratings[rubric.id].score!,
        rating_duration_seconds: Math.round((Date.now() - ratings[rubric.id].startTime) / 1000),
        updated_at: new Date().toISOString(),
      }));

      // upsert: 중복되면 업데이트, 없으면 삽입
      const { error } = await supabase
        .from('scores')
        .upsert(scores, {
          onConflict: 'teacher_id,essay_id,rubric_id',
          ignoreDuplicates: false, // 중복 시 업데이트
        });

      if (error) throw error;

      // 3. 처음 채점하는 경우에만 교사의 essays_rated_count 증가
      if (isFirstRating) {
        const { error: updateError } = await supabase.rpc('increment_essays_rated', {
          teacher_uuid: user.id,
        });

        if (updateError) {
          console.error('교사 통계 업데이트 실패:', updateError);
        }
      }

      // 성공 메시지 표시
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        fetchNextEssay();
      }, 2000);
    } catch (err) {
      console.error('채점 저장 실패:', err);
      alert('채점 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (window.confirm('이 에세이를 건너뛰시겠습니까?')) {
      fetchNextEssay();
    }
  };

  const ratedCount = rubrics.filter(r => ratings[r.id]?.score !== null).length;
  const allRated = ratedCount === rubrics.length;

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!essay) {
    return <div className="empty">채점할 에세이를 준비 중입니다...</div>;
  }

  return (
    <div className="rating-page">
      {/* 헤더 */}
      <div className="rating-page-header">
        <div className="header-left">
          <h1>MFRM 쓰기 평가 문항분석</h1>
        </div>
        <div className="header-right">
          <span className="user-info">👤 {user?.name || '교사'}</span>
          <button onClick={handleSkip} className="skip-button">
            건너뛰기
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="success-overlay">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <div className="success-text">채점이 완료되었습니다!</div>
          </div>
        </div>
      )}

      {/* 2단 분할 레이아웃 */}
      <div className="rating-split-container">
        {/* 왼쪽: 에세이 패널 */}
        <div className="essay-panel">
          <div className="essay-panel-header">
            <h3>{essay.title}</h3>
            <div className="essay-meta">
              <span>{essay.grade_level || '학년 미지정'}</span>
              <span>•</span>
              <span>{essay.word_count || '?'}어절</span>
              {essay.is_anchor && (
                <>
                  <span>•</span>
                  <span className="anchor-badge">⚓ 앵커</span>
                </>
              )}
            </div>
          </div>

          {essay.prompt && (
            <div className="essay-prompt">
              <strong>작성 주제:</strong> {essay.prompt}
            </div>
          )}

          <div className="essay-content-scroll">
            <div className="essay-content">{essay.content}</div>
          </div>

          {essay.is_anchor && essay.anchor_explanation && (
            <details className="anchor-explanation">
              <summary>📌 앵커 해설 카드 보기</summary>
              <div className="explanation-content">{essay.anchor_explanation}</div>
            </details>
          )}
        </div>

        {/* 오른쪽: 루브릭 패널 */}
        <div className="rubric-panel">
          <div className="rubric-panel-header">
            <h4>채점 진행 상황 ({ratedCount}/{rubrics.length})</h4>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${(ratedCount / rubrics.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="accordion-container">
            {rubrics.map((rubric, index) => (
              <AccordionItem
                key={rubric.id}
                rubric={rubric}
                index={index}
                total={rubrics.length}
                score={ratings[rubric.id]?.score ?? null}
                isOpen={openAccordionIndex === index}
                onToggle={() => setOpenAccordionIndex(openAccordionIndex === index ? null : index)}
                onScoreSelect={(score) => handleScoreSelect(rubric.id, score)}
              />
            ))}
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!allRated || submitting}
            className={`submit-button ${allRated ? 'ready' : 'disabled'}`}
          >
            {submitting ? '저장 중...' : allRated ? '✓ 채점 완료 및 제출' : `${ratedCount}/${rubrics.length} 완료`}
          </button>
        </div>
      </div>
    </div>
  );
};

