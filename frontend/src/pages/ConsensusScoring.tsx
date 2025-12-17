import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IEssay, IRubric, IAnchorConsensusScore, IAnchorConsensusScoreInput } from '../types';
import './ConsensusScoring.css';

/**
 * 관리자 모드: 앵커/캘리브레이션 에세이 합의 점수 입력 페이지
 * Blueprint v0.9: 전문가 패널의 합의 점수 입력 및 경계 사례 태깅
 */
export const ConsensusScoring: React.FC = () => {
  // 데이터 상태
  const [essays, setEssays] = useState<IEssay[]>([]);
  const [rubrics, setRubrics] = useState<IRubric[]>([]);
  const [existingScores, setExistingScores] = useState<IAnchorConsensusScore[]>([]);
  
  // UI 상태
  const [selectedEssay, setSelectedEssay] = useState<IEssay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // 점수 입력 상태
  const [scores, setScores] = useState<{ [rubricId: string]: IAnchorConsensusScoreInput }>({});
  
  // 전문가 패널 정보
  const [panelSize, setPanelSize] = useState<number>(5);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEssay) {
      loadExistingScores(selectedEssay.id);
    }
  }, [selectedEssay]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 캘리브레이션/앵커 에세이 조회
      const { data: essaysData, error: essaysError } = await supabase
        .from('essays')
        .select('*')
        .or('is_anchor.eq.true,is_calibration.eq.true')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (essaysError) throw essaysError;

      // 루브릭 조회
      const { data: rubricsData, error: rubricsError } = await supabase
        .from('rubrics')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (rubricsError) throw rubricsError;

      // 기존 합의 점수 조회
      const { data: scoresData, error: scoresError } = await supabase
        .from('anchor_consensus_scores')
        .select('*');

      if (scoresError && scoresError.code !== 'PGRST116') {
        // 테이블이 없는 경우는 무시
        console.warn('anchor_consensus_scores 테이블이 없습니다:', scoresError);
      }

      setEssays(essaysData || []);
      setRubrics(rubricsData || []);
      setExistingScores(scoresData || []);

      // 첫 번째 에세이 선택
      if (essaysData && essaysData.length > 0) {
        setSelectedEssay(essaysData[0]);
      }
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingScores = (essayId: string) => {
    const essayScores = existingScores.filter(s => s.essay_id === essayId);
    const scoresMap: { [rubricId: string]: IAnchorConsensusScoreInput } = {};

    rubrics.forEach(rubric => {
      const existing = essayScores.find(s => s.rubric_id === rubric.id);
      if (existing) {
        scoresMap[rubric.id] = {
          essay_id: essayId,
          rubric_id: rubric.id,
          consensus_score: existing.consensus_score as 1 | 2 | 3,
          is_boundary_1_2: existing.is_boundary_1_2,
          is_boundary_2_3: existing.is_boundary_2_3,
          expert_panel_size: existing.expert_panel_size,
          agreement_rate: existing.agreement_rate || undefined,
          boundary_rationale: existing.boundary_rationale || undefined,
        };
      }
    });

    setScores(scoresMap);
  };

  const handleScoreChange = (rubricId: string, score: 1 | 2 | 3) => {
    if (!selectedEssay) return;

    setScores(prev => ({
      ...prev,
      [rubricId]: {
        ...prev[rubricId],
        essay_id: selectedEssay.id,
        rubric_id: rubricId,
        consensus_score: score,
        expert_panel_size: panelSize,
      },
    }));
  };

  const handleBoundaryToggle = (rubricId: string, boundaryType: 'is_boundary_1_2' | 'is_boundary_2_3') => {
    setScores(prev => ({
      ...prev,
      [rubricId]: {
        ...prev[rubricId],
        [boundaryType]: !prev[rubricId]?.[boundaryType],
      },
    }));
  };

  const handleRationaleChange = (rubricId: string, rationale: string) => {
    setScores(prev => ({
      ...prev,
      [rubricId]: {
        ...prev[rubricId],
        boundary_rationale: rationale,
      },
    }));
  };

  const handleSaveScores = async () => {
    if (!selectedEssay) return;

    const scoresToSave = Object.values(scores).filter(s => s.consensus_score);

    if (scoresToSave.length === 0) {
      setMessage({ type: 'error', text: '저장할 점수가 없습니다.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Upsert 사용 (기존 점수 있으면 업데이트, 없으면 삽입)
      const { error } = await supabase
        .from('anchor_consensus_scores')
        .upsert(
          scoresToSave.map(s => ({
            essay_id: s.essay_id,
            rubric_id: s.rubric_id,
            consensus_score: s.consensus_score,
            is_boundary_1_2: s.is_boundary_1_2 || false,
            is_boundary_2_3: s.is_boundary_2_3 || false,
            expert_panel_size: s.expert_panel_size || panelSize,
            agreement_rate: s.agreement_rate,
            boundary_rationale: s.boundary_rationale,
          })),
          { onConflict: 'essay_id,rubric_id' }
        );

      if (error) throw error;

      // 기존 점수 목록 갱신
      const { data: updatedScores } = await supabase
        .from('anchor_consensus_scores')
        .select('*');

      setExistingScores(updatedScores || []);
      setMessage({ type: 'success', text: `${scoresToSave.length}개 평가요소의 합의 점수가 저장되었습니다.` });
    } catch (err) {
      console.error('저장 실패:', err);
      setMessage({ type: 'error', text: '저장에 실패했습니다. ' + (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const getCompletionStatus = (essayId: string) => {
    const essayScores = existingScores.filter(s => s.essay_id === essayId);
    const completedCount = essayScores.length;
    const totalCount = rubrics.length;
    return {
      completed: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  };

  const getTotalStats = () => {
    const essaysWithScores = new Set(existingScores.map(s => s.essay_id));
    const fullyCompleted = essays.filter(e => {
      const status = getCompletionStatus(e.id);
      return status.percentage === 100;
    }).length;

    const boundary12Count = existingScores.filter(s => s.is_boundary_1_2).length;
    const boundary23Count = existingScores.filter(s => s.is_boundary_2_3).length;

    return {
      totalEssays: essays.length,
      essaysWithScores: essaysWithScores.size,
      fullyCompleted,
      boundary12Count,
      boundary23Count,
    };
  };

  if (loading) {
    return <div className="consensus-scoring loading">로딩 중...</div>;
  }

  const stats = getTotalStats();

  return (
    <div className="consensus-scoring">
      {/* 헤더 */}
      <div className="cs-header">
        <div className="cs-header-content">
          <h1>📝 전문가 합의 점수 입력</h1>
          <p>앵커/캘리브레이션 에세이에 대한 전문가 패널의 합의 점수를 입력합니다.</p>
        </div>
        <div className="cs-header-nav">
          <button onClick={() => window.history.back()} className="btn-back">
            ← 돌아가기
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`cs-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* 전체 통계 */}
      <div className="cs-stats">
        <div className="cs-stat-card">
          <div className="stat-value">{stats.totalEssays}</div>
          <div className="stat-label">전체 에세이</div>
        </div>
        <div className="cs-stat-card">
          <div className="stat-value">{stats.fullyCompleted}</div>
          <div className="stat-label">입력 완료</div>
        </div>
        <div className="cs-stat-card">
          <div className="stat-value">{stats.boundary12Count}</div>
          <div className="stat-label">1↔2 경계 사례</div>
        </div>
        <div className="cs-stat-card">
          <div className="stat-value">{stats.boundary23Count}</div>
          <div className="stat-label">2↔3 경계 사례</div>
        </div>
        <div className="cs-stat-card panel">
          <div className="stat-label">패널 인원</div>
          <input
            type="number"
            min="1"
            max="20"
            value={panelSize}
            onChange={(e) => setPanelSize(parseInt(e.target.value) || 5)}
            className="panel-input"
          />
        </div>
      </div>

      <div className="cs-main">
        {/* 왼쪽: 에세이 목록 */}
        <div className="cs-essay-list">
          <h3>에세이 목록</h3>
          <div className="essay-items">
            {essays.map(essay => {
              const status = getCompletionStatus(essay.id);
              return (
                <div
                  key={essay.id}
                  className={`essay-item ${selectedEssay?.id === essay.id ? 'selected' : ''} ${status.percentage === 100 ? 'complete' : ''}`}
                  onClick={() => setSelectedEssay(essay)}
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
                      <div
                        className="progress-fill"
                        style={{ width: `${status.percentage}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {status.completed}/{status.total} ({status.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: 점수 입력 */}
        <div className="cs-score-input">
          {selectedEssay ? (
            <>
              <div className="score-input-header">
                <h2>{selectedEssay.title}</h2>
                <div className="essay-meta">
                  <span>{selectedEssay.grade_level}</span>
                  <span>{selectedEssay.word_count}어절</span>
                  {selectedEssay.difficulty_level && (
                    <span className={`difficulty ${selectedEssay.difficulty_level}`}>
                      난이도: {selectedEssay.difficulty_level}
                    </span>
                  )}
                </div>
              </div>

              {/* 에세이 본문 미리보기 */}
              <div className="essay-preview">
                <h4>에세이 본문</h4>
                <div className="essay-content">
                  {selectedEssay.content.substring(0, 500)}
                  {selectedEssay.content.length > 500 && '...'}
                </div>
                <button
                  className="btn-expand"
                  onClick={() => {
                    // 전체 보기 모달 (간단히 alert로 대체)
                    alert(selectedEssay.content);
                  }}
                >
                  전체 보기
                </button>
              </div>

              {/* 평가요소별 점수 입력 */}
              <div className="rubric-scores">
                <h4>평가요소별 합의 점수</h4>
                
                {['내용', '조직', '표현'].map(category => (
                  <div key={category} className="rubric-category">
                    <h5>{category}</h5>
                    {rubrics
                      .filter(r => r.category === category)
                      .map(rubric => {
                        const currentScore = scores[rubric.id];
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
                                  className={`score-btn ${currentScore?.consensus_score === score ? 'selected' : ''}`}
                                  onClick={() => handleScoreChange(rubric.id, score as 1 | 2 | 3)}
                                >
                                  {score}점
                                </button>
                              ))}
                            </div>

                            <div className="boundary-toggles">
                              <label className={`boundary-toggle ${currentScore?.is_boundary_1_2 ? 'active' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={currentScore?.is_boundary_1_2 || false}
                                  onChange={() => handleBoundaryToggle(rubric.id, 'is_boundary_1_2')}
                                />
                                1↔2 경계
                              </label>
                              <label className={`boundary-toggle ${currentScore?.is_boundary_2_3 ? 'active' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={currentScore?.is_boundary_2_3 || false}
                                  onChange={() => handleBoundaryToggle(rubric.id, 'is_boundary_2_3')}
                                />
                                2↔3 경계
                              </label>
                            </div>

                            {(currentScore?.is_boundary_1_2 || currentScore?.is_boundary_2_3) && (
                              <div className="rationale-input">
                                <input
                                  type="text"
                                  placeholder="경계 근거를 입력하세요..."
                                  value={currentScore?.boundary_rationale || ''}
                                  onChange={(e) => handleRationaleChange(rubric.id, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>

              {/* 저장 버튼 */}
              <div className="save-section">
                <button
                  className="btn-save"
                  onClick={handleSaveScores}
                  disabled={saving}
                >
                  {saving ? '저장 중...' : '💾 합의 점수 저장'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              왼쪽에서 에세이를 선택해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsensusScoring;

