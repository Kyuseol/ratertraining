import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { IExpertRater, IExpertScore, IEssay, IRubric } from '../types';
import './ExpertRating.css';

/**
 * 관리자 모드: 전문가 채점 페이지
 * Blueprint v0.9: 전문가 개별 채점 기반 캘리브레이션
 */
export const ExpertRating: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 데이터 상태
  const [experts, setExperts] = useState<IExpertRater[]>([]);
  const [essays, setEssays] = useState<IEssay[]>([]);
  const [rubrics, setRubrics] = useState<IRubric[]>([]);
  const [existingScores, setExistingScores] = useState<IExpertScore[]>([]);
  
  // 선택 상태
  const [selectedExpert, setSelectedExpert] = useState<IExpertRater | null>(null);
  const [selectedEssay, setSelectedEssay] = useState<IEssay | null>(null);
  
  // 현재 채점 상태
  const [currentScores, setCurrentScores] = useState<{ [rubricId: string]: { score: number; confidence?: number } }>({});
  
  // UI 상태
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // URL 파라미터에서 전문가 ID 확인
    const expertId = searchParams.get('expert');
    if (expertId && experts.length > 0) {
      const expert = experts.find(e => e.id === expertId);
      if (expert) {
        setSelectedExpert(expert);
      }
    }
  }, [searchParams, experts]);

  useEffect(() => {
    if (selectedExpert && selectedEssay) {
      loadExistingScores();
    }
  }, [selectedExpert, selectedEssay]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 전문가 목록
      const { data: expertsData, error: expertsError } = await supabase
        .from('expert_raters')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (expertsError && expertsError.code !== 'PGRST116') throw expertsError;

      // 캘리브레이션/앵커 에세이
      const { data: essaysData, error: essaysError } = await supabase
        .from('essays')
        .select('*')
        .or('is_anchor.eq.true,is_calibration.eq.true')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (essaysError) throw essaysError;

      // 루브릭
      const { data: rubricsData, error: rubricsError } = await supabase
        .from('rubrics')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (rubricsError) throw rubricsError;

      // 모든 전문가 채점
      const { data: scoresData, error: scoresError } = await supabase
        .from('expert_scores')
        .select('*');

      if (scoresError && scoresError.code !== 'PGRST116') {
        console.warn('전문가 채점 조회 실패:', scoresError);
      }

      setExperts(expertsData || []);
      setEssays(essaysData || []);
      setRubrics(rubricsData || []);
      setExistingScores(scoresData || []);

      // 첫 번째 에세이 선택
      if (essaysData && essaysData.length > 0 && !selectedEssay) {
        setSelectedEssay(essaysData[0]);
      }

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingScores = () => {
    if (!selectedExpert || !selectedEssay) return;

    const essayScores = existingScores.filter(
      s => s.expert_id === selectedExpert.id && s.essay_id === selectedEssay.id
    );

    const scoresMap: { [rubricId: string]: { score: number; confidence?: number } } = {};
    essayScores.forEach(s => {
      scoresMap[s.rubric_id] = {
        score: s.score,
        confidence: s.confidence_level || undefined,
      };
    });

    setCurrentScores(scoresMap);
  };

  const handleScoreChange = (rubricId: string, score: number) => {
    setCurrentScores(prev => ({
      ...prev,
      [rubricId]: {
        ...prev[rubricId],
        score,
      },
    }));
  };

  const handleConfidenceChange = (rubricId: string, confidence: number) => {
    setCurrentScores(prev => ({
      ...prev,
      [rubricId]: {
        ...prev[rubricId],
        confidence,
      },
    }));
  };

  const handleSaveScores = async () => {
    if (!selectedExpert || !selectedEssay) {
      setMessage({ type: 'error', text: '전문가와 에세이를 선택해주세요.' });
      return;
    }

    const scoresToSave = Object.entries(currentScores)
      .filter(([_, data]) => data.score)
      .map(([rubricId, data]) => ({
        expert_id: selectedExpert.id,
        essay_id: selectedEssay.id,
        rubric_id: rubricId,
        score: data.score,
        confidence_level: data.confidence || null,
      }));

    if (scoresToSave.length === 0) {
      setMessage({ type: 'error', text: '저장할 점수가 없습니다.' });
      return;
    }

    setSaving(true);
    setMessage({ type: 'info', text: '저장 중...' });

    try {
      // Upsert
      const { error } = await supabase
        .from('expert_scores')
        .upsert(scoresToSave, { onConflict: 'expert_id,essay_id,rubric_id' });

      if (error) throw error;

      // 기존 점수 목록 갱신
      const { data: updatedScores } = await supabase
        .from('expert_scores')
        .select('*');

      setExistingScores(updatedScores || []);
      setMessage({ type: 'success', text: `${scoresToSave.length}개 평가요소 점수가 저장되었습니다.` });

    } catch (err) {
      console.error('저장 실패:', err);
      setMessage({ type: 'error', text: '저장에 실패했습니다. ' + (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const getEssayCompletionForExpert = (essayId: string, expertId: string) => {
    const essayScores = existingScores.filter(
      s => s.essay_id === essayId && s.expert_id === expertId
    );
    return {
      completed: essayScores.length,
      total: rubrics.length,
      percentage: rubrics.length > 0 ? Math.round((essayScores.length / rubrics.length) * 100) : 0,
    };
  };

  const getOverallProgress = () => {
    if (!selectedExpert) return { essays: 0, scores: 0, percentage: 0 };

    const expertScores = existingScores.filter(s => s.expert_id === selectedExpert.id);
    const essaysScored = new Set(expertScores.map(s => s.essay_id)).size;
    const totalScores = expertScores.length;
    const totalExpected = essays.length * rubrics.length;

    return {
      essays: essaysScored,
      scores: totalScores,
      percentage: totalExpected > 0 ? Math.round((totalScores / totalExpected) * 100) : 0,
    };
  };

  const moveToNextEssay = () => {
    if (!selectedEssay) return;
    const currentIndex = essays.findIndex(e => e.id === selectedEssay.id);
    if (currentIndex < essays.length - 1) {
      setSelectedEssay(essays[currentIndex + 1]);
      setCurrentScores({});
    }
  };

  const moveToPrevEssay = () => {
    if (!selectedEssay) return;
    const currentIndex = essays.findIndex(e => e.id === selectedEssay.id);
    if (currentIndex > 0) {
      setSelectedEssay(essays[currentIndex - 1]);
      setCurrentScores({});
    }
  };

  if (loading) {
    return <div className="expert-rating loading">로딩 중...</div>;
  }

  const progress = getOverallProgress();

  return (
    <div className="expert-rating">
      {/* 헤더 */}
      <div className="er-header">
        <div className="er-header-content">
          <h1>✍️ 전문가 채점</h1>
          <p>캘리브레이션을 위한 전문가 개별 채점</p>
        </div>
        <div className="er-header-nav">
          <button onClick={() => navigate('/admin/experts')} className="btn-nav">
            👨‍🏫 전문가 관리
          </button>
          <button onClick={() => navigate('/admin')} className="btn-nav">
            ← 대시보드
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`er-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* 전문가 선택 */}
      <div className="expert-selector">
        <label>채점 전문가:</label>
        <select
          value={selectedExpert?.id || ''}
          onChange={(e) => {
            const expert = experts.find(ex => ex.id === e.target.value);
            setSelectedExpert(expert || null);
            setCurrentScores({});
          }}
        >
          <option value="">전문가 선택...</option>
          {experts.map(expert => (
            <option key={expert.id} value={expert.id}>
              {expert.name} ({expert.institution || '소속 미지정'})
            </option>
          ))}
        </select>

        {selectedExpert && (
          <div className="expert-progress-summary">
            <span className="progress-text">
              진행률: {progress.essays}/{essays.length} 에세이, {progress.scores}개 채점 ({progress.percentage}%)
            </span>
            <div className="mini-progress-bar">
              <div className="fill" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>
        )}
      </div>

      {!selectedExpert ? (
        <div className="no-expert-selected">
          <p>👆 위에서 채점할 전문가를 선택해주세요.</p>
        </div>
      ) : (
        <div className="er-main">
          {/* 왼쪽: 에세이 목록 */}
          <div className="essay-list">
            <h3>에세이 목록 ({essays.length}편)</h3>
            <div className="essay-items">
              {essays.map(essay => {
                const completion = getEssayCompletionForExpert(essay.id, selectedExpert.id);
                return (
                  <div
                    key={essay.id}
                    className={`essay-item ${selectedEssay?.id === essay.id ? 'selected' : ''} ${completion.percentage === 100 ? 'complete' : ''}`}
                    onClick={() => {
                      setSelectedEssay(essay);
                      setCurrentScores({});
                    }}
                  >
                    <div className="essay-item-header">
                      <span className="essay-title">{essay.title}</span>
                      <div className="essay-tags">
                        {essay.is_anchor && <span className="tag anchor">앵커</span>}
                        {essay.is_calibration && <span className="tag calibration">캘리브</span>}
                      </div>
                    </div>
                    <div className="essay-item-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${completion.percentage}%` }} />
                      </div>
                      <span className="progress-text">{completion.completed}/{completion.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 오른쪽: 채점 영역 */}
          <div className="rating-area">
            {selectedEssay ? (
              <>
                {/* 에세이 내용 */}
                <div className="essay-content-section">
                  <div className="essay-header">
                    <h2>{selectedEssay.title}</h2>
                    <div className="essay-meta">
                      <span>{selectedEssay.grade_level}</span>
                      {selectedEssay.word_count && <span>{selectedEssay.word_count}어절</span>}
                    </div>
                  </div>
                  <div className="essay-content">
                    {selectedEssay.content}
                  </div>
                </div>

                {/* 채점 폼 */}
                <div className="scoring-form">
                  <h3>평가요소별 채점</h3>
                  <p className="scoring-instruction">
                    각 평가요소에 대해 1점(미흡), 2점(보통), 3점(우수)으로 채점해주세요.
                  </p>

                  {['내용', '조직', '표현'].map(category => (
                    <div key={category} className="rubric-category">
                      <h4>{category}</h4>
                      {rubrics
                        .filter(r => r.category === category)
                        .map(rubric => {
                          const currentData = currentScores[rubric.id];
                          return (
                            <div key={rubric.id} className="rubric-row">
                              <div className="rubric-info">
                                <span className="rubric-name">{rubric.name}</span>
                                <span className="rubric-desc">{rubric.description}</span>
                              </div>

                              <div className="score-buttons">
                                {[1, 2, 3].map(score => (
                                  <button
                                    key={score}
                                    className={`score-btn ${currentData?.score === score ? 'selected' : ''}`}
                                    onClick={() => handleScoreChange(rubric.id, score)}
                                  >
                                    {score}
                                  </button>
                                ))}
                              </div>

                              <div className="confidence-selector">
                                <label>확신도:</label>
                                <select
                                  value={currentData?.confidence || ''}
                                  onChange={(e) => handleConfidenceChange(rubric.id, parseInt(e.target.value))}
                                >
                                  <option value="">-</option>
                                  <option value="1">1 (불확실)</option>
                                  <option value="2">2</option>
                                  <option value="3">3 (보통)</option>
                                  <option value="4">4</option>
                                  <option value="5">5 (확신)</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>

                {/* 액션 버튼 */}
                <div className="action-buttons">
                  <button className="btn-nav-essay" onClick={moveToPrevEssay} disabled={essays.findIndex(e => e.id === selectedEssay.id) === 0}>
                    ← 이전
                  </button>
                  <button className="btn-save" onClick={handleSaveScores} disabled={saving}>
                    {saving ? '저장 중...' : '💾 저장'}
                  </button>
                  <button
                    className="btn-save-next"
                    onClick={async () => {
                      await handleSaveScores();
                      moveToNextEssay();
                    }}
                    disabled={saving || essays.findIndex(e => e.id === selectedEssay.id) === essays.length - 1}
                  >
                    저장 후 다음 →
                  </button>
                  <button className="btn-nav-essay" onClick={moveToNextEssay} disabled={essays.findIndex(e => e.id === selectedEssay.id) === essays.length - 1}>
                    다음 →
                  </button>
                </div>
              </>
            ) : (
              <div className="no-essay-selected">
                <p>왼쪽에서 채점할 에세이를 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertRating;

