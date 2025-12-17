import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { IEssay, IRubric, IAnchorConsensusScore, IAnchorCoverageMatrix, IEssayWithCalibration } from '../types';
import './AnchorManagement.css';

/**
 * 관리자 모드: 앵커 에세이 관리 페이지
 * Blueprint v0.9: 앵커 에세이 포트폴리오 점검 및 범주 커버리지 확인
 * 업데이트: 실제 합의 점수 기반 커버리지 매트릭스
 */
export const AnchorManagement: React.FC = () => {
  const navigate = useNavigate();
  
  // 데이터 상태
  const [anchorEssays, setAnchorEssays] = useState<IEssayWithCalibration[]>([]);
  const [rubrics, setRubrics] = useState<IRubric[]>([]);
  const [consensusScores, setConsensusScores] = useState<IAnchorConsensusScore[]>([]);
  const [coverageMatrix, setCoverageMatrix] = useState<IAnchorCoverageMatrix[]>([]);
  
  // UI 상태
  const [loading, setLoading] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<IEssayWithCalibration | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 앵커 에세이 조회 (캘리브레이션 정보 포함)
      const { data: essays, error: essaysError } = await supabase
        .from('essays')
        .select('*')
        .eq('is_anchor', true)
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

      // 합의 점수 조회
      const { data: scoresData, error: scoresError } = await supabase
        .from('anchor_consensus_scores')
        .select('*');

      if (scoresError && scoresError.code !== 'PGRST116') {
        console.warn('합의 점수 조회 실패:', scoresError);
      }

      setAnchorEssays(essays || []);
      setRubrics(rubricsData || []);
      setConsensusScores(scoresData || []);

      // 커버리지 매트릭스 계산
      calculateCoverageMatrix(rubricsData || [], scoresData || [], essays || []);

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateCoverageMatrix = (
    rubrics: IRubric[], 
    scores: IAnchorConsensusScore[], 
    essays: IEssay[]
  ) => {
    const anchorEssayIds = new Set(essays.map(e => e.id));
    const anchorScores = scores.filter(s => anchorEssayIds.has(s.essay_id));

    const matrix: IAnchorCoverageMatrix[] = rubrics.map(rubric => {
      const rubricScores = anchorScores.filter(s => s.rubric_id === rubric.id);
      const boundary12Count = rubricScores.filter(s => s.is_boundary_1_2).length;
      const boundary23Count = rubricScores.filter(s => s.is_boundary_2_3).length;
      const totalEssays = new Set(rubricScores.map(s => s.essay_id)).size;

      let status: 'complete' | 'partial' | 'insufficient';
      if (boundary12Count >= 2 && boundary23Count >= 2) {
        status = 'complete';
      } else if (boundary12Count >= 1 || boundary23Count >= 1) {
        status = 'partial';
      } else {
        status = 'insufficient';
      }

      return {
        rubric_id: rubric.id,
        rubric_name: rubric.name,
        rubric_category: rubric.category,
        boundary_1_2_count: boundary12Count,
        boundary_2_3_count: boundary23Count,
        total_anchor_essays: totalEssays,
        coverage_status: status,
      };
    });

    setCoverageMatrix(matrix);
  };

  const getEssayConsensusScores = (essayId: string) => {
    return consensusScores.filter(s => s.essay_id === essayId);
  };

  const getCompletionStatus = (essayId: string) => {
    const essayScores = getEssayConsensusScores(essayId);
    const completedCount = essayScores.length;
    const totalCount = rubrics.length;
    return {
      completed: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  };

  const getOverallStats = () => {
    const totalAnchors = anchorEssays.length;
    const calibratedCount = anchorEssays.filter(e => e.is_calibrated).length;
    const completeRubrics = coverageMatrix.filter(c => c.coverage_status === 'complete').length;
    const partialRubrics = coverageMatrix.filter(c => c.coverage_status === 'partial').length;

    return {
      totalAnchors,
      calibratedCount,
      completeRubrics,
      partialRubrics,
      insufficientRubrics: rubrics.length - completeRubrics - partialRubrics,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return '#10b981';
      case 'partial': return '#f59e0b';
      case 'insufficient': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  if (loading) {
    return <div className="anchor-management loading">로딩 중...</div>;
  }

  const stats = getOverallStats();

  return (
    <div className="anchor-management">
      {/* 헤더 */}
      <div className="am-header">
        <div className="am-header-content">
          <h1>⚓ 앵커 에세이 관리</h1>
          <p>Blueprint v0.9 - 앵커 포트폴리오 점검 및 범주 커버리지 확인</p>
        </div>
        <div className="am-header-nav">
          <button onClick={() => navigate('/admin/consensus')} className="btn-nav consensus">
            ✍️ 합의점수 입력
          </button>
          <button onClick={() => navigate('/admin/calibration')} className="btn-nav calibration">
            ⚙️ 캘리브레이션
          </button>
          <button onClick={() => navigate('/admin')} className="btn-nav">
            ← 대시보드
          </button>
        </div>
      </div>

      {/* 전체 통계 */}
      <div className="am-stats">
        <div className="stat-card main">
          <div className="stat-value">{stats.totalAnchors}</div>
          <div className="stat-label">앵커 에세이</div>
          <div className="stat-target">권장: 12-16편</div>
          <div className={`stat-status ${stats.totalAnchors >= 12 && stats.totalAnchors <= 16 ? 'good' : stats.totalAnchors < 12 ? 'danger' : 'warning'}`}>
            {stats.totalAnchors >= 12 && stats.totalAnchors <= 16 ? '✓ 적정' : stats.totalAnchors < 12 ? '✕ 부족' : 'ℹ 초과'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.calibratedCount}</div>
          <div className="stat-label">캘리브레이션 완료</div>
        </div>
        <div className="stat-card good">
          <div className="stat-value">{stats.completeRubrics}</div>
          <div className="stat-label">완전 커버</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{stats.partialRubrics}</div>
          <div className="stat-label">부분 커버</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{stats.insufficientRubrics}</div>
          <div className="stat-label">커버 부족</div>
        </div>
      </div>

      {/* 뷰 모드 토글 */}
      <div className="view-toggle">
        <button 
          className={viewMode === 'grid' ? 'active' : ''} 
          onClick={() => setViewMode('grid')}
        >
          📋 그리드 보기
        </button>
        <button 
          className={viewMode === 'matrix' ? 'active' : ''} 
          onClick={() => setViewMode('matrix')}
        >
          📊 매트릭스 보기
        </button>
      </div>

      {viewMode === 'matrix' ? (
        /* 범주 경계 커버리지 매트릭스 */
        <div className="coverage-section">
          <h2>📊 범주 경계 커버리지 매트릭스</h2>
          <p className="section-description">
            각 평가요소에서 1↔2, 2↔3 경계 사례가 최소 2회 이상 노출되어야 합니다.
          </p>

          <div className="coverage-matrix">
            <table>
              <thead>
                <tr>
                  <th>범주</th>
                  <th>평가요소</th>
                  <th>1↔2 경계</th>
                  <th>2↔3 경계</th>
                  <th>앵커 수</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {coverageMatrix.map(item => (
                  <tr key={item.rubric_id} className={item.coverage_status}>
                    <td className="category">{item.rubric_category}</td>
                    <td className="rubric-name">{item.rubric_name}</td>
                    <td>
                      <span className={`count ${item.boundary_1_2_count >= 2 ? 'good' : item.boundary_1_2_count >= 1 ? 'warning' : 'danger'}`}>
                        {item.boundary_1_2_count}회
                      </span>
                      {item.boundary_1_2_count < 2 && (
                        <span className="need">(+{2 - item.boundary_1_2_count} 필요)</span>
                      )}
                    </td>
                    <td>
                      <span className={`count ${item.boundary_2_3_count >= 2 ? 'good' : item.boundary_2_3_count >= 1 ? 'warning' : 'danger'}`}>
                        {item.boundary_2_3_count}회
                      </span>
                      {item.boundary_2_3_count < 2 && (
                        <span className="need">(+{2 - item.boundary_2_3_count} 필요)</span>
                      )}
                    </td>
                    <td>{item.total_anchor_essays}편</td>
                    <td>
                      <span className={`status-badge ${item.coverage_status}`}>
                        {item.coverage_status === 'complete' && '✓ 완료'}
                        {item.coverage_status === 'partial' && '⚠ 부분'}
                        {item.coverage_status === 'insufficient' && '✕ 부족'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 앵커 에세이 그리드 */
        <div className="essay-grid-section">
          <h2>📋 앵커 에세이 목록</h2>

          {anchorEssays.length === 0 ? (
            <div className="empty-state">
              <p>앵커 에세이가 없습니다.</p>
              <button onClick={() => navigate('/admin/essays')} className="btn-add">
                + 에세이 관리에서 추가
              </button>
            </div>
          ) : (
            <div className="essay-grid">
              {anchorEssays.map(essay => {
                const status = getCompletionStatus(essay.id);
                const essayScores = getEssayConsensusScores(essay.id);
                const boundaries = {
                  b12: essayScores.filter(s => s.is_boundary_1_2).length,
                  b23: essayScores.filter(s => s.is_boundary_2_3).length,
                };

                return (
                  <div
                    key={essay.id}
                    className={`essay-card ${selectedEssay?.id === essay.id ? 'selected' : ''} ${essay.is_calibrated ? 'calibrated' : ''}`}
                    onClick={() => setSelectedEssay(essay)}
                  >
                    <div className="essay-card-header">
                      <h3>{essay.title}</h3>
                      <div className="essay-badges">
                        {essay.is_calibrated && (
                          <span className="badge calibrated">캘리브레이션됨</span>
                        )}
                        {essay.difficulty_level && (
                          <span className={`badge difficulty ${essay.difficulty_level}`}>
                            {essay.difficulty_level === 'low' && '쉬움'}
                            {essay.difficulty_level === 'medium' && '보통'}
                            {essay.difficulty_level === 'high' && '어려움'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="essay-card-meta">
                      <span>{essay.grade_level}</span>
                      {essay.word_count && <span>{essay.word_count}어절</span>}
                    </div>

                    <div className="essay-card-preview">
                      {essay.content.substring(0, 100)}...
                    </div>

                    <div className="consensus-progress">
                      <div className="progress-label">합의 점수 입력</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${status.percentage}%` }} />
                      </div>
                      <div className="progress-text">{status.completed}/{status.total}</div>
                    </div>

                    <div className="boundary-info">
                      <span className={`boundary ${boundaries.b12 > 0 ? 'has' : 'none'}`}>
                        1↔2: {boundaries.b12}
                      </span>
                      <span className={`boundary ${boundaries.b23 > 0 ? 'has' : 'none'}`}>
                        2↔3: {boundaries.b23}
                      </span>
                    </div>

                    {essay.is_calibrated && essay.difficulty_logit !== null && (
                      <div className="logit-value">
                        난이도: {essay.difficulty_logit.toFixed(2)} logit
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 선택된 에세이 상세 모달 */}
      {selectedEssay && (
        <div className="essay-modal" onClick={() => setSelectedEssay(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEssay.title}</h2>
              <button onClick={() => setSelectedEssay(null)} className="close-btn">✕</button>
            </div>

            <div className="modal-body">
              <div className="info-section">
                <h4>에세이 정보</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">학년:</span>
                    <span className="value">{selectedEssay.grade_level || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">난이도:</span>
                    <span className="value">{selectedEssay.difficulty_level || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">어절 수:</span>
                    <span className="value">{selectedEssay.word_count || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">캘리브레이션:</span>
                    <span className="value">
                      {selectedEssay.is_calibrated ? `완료 (${selectedEssay.difficulty_logit?.toFixed(2)} logit)` : '미완료'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="content-section">
                <h4>에세이 본문</h4>
                <div className="essay-full-content">{selectedEssay.content}</div>
              </div>

              {selectedEssay.anchor_explanation && (
                <div className="explanation-section">
                  <h4>앵커 해설 카드</h4>
                  <div className="anchor-explanation">{selectedEssay.anchor_explanation}</div>
                </div>
              )}

              <div className="scores-section">
                <h4>합의 점수</h4>
                <div className="scores-grid">
                  {rubrics.map(rubric => {
                    const score = consensusScores.find(
                      s => s.essay_id === selectedEssay.id && s.rubric_id === rubric.id
                    );
                    return (
                      <div key={rubric.id} className={`score-item ${score ? 'has-score' : 'no-score'}`}>
                        <span className="rubric-name">{rubric.name}</span>
                        <span className="score-value">
                          {score ? `${score.consensus_score}점` : '-'}
                        </span>
                        {score && (
                          <div className="boundary-tags">
                            {score.is_boundary_1_2 && <span className="btag b12">1↔2</span>}
                            {score.is_boundary_2_3 && <span className="btag b23">2↔3</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => navigate('/admin/consensus')} className="btn-edit">
                합의 점수 입력/수정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnchorManagement;
