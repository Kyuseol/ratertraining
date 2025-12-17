import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ICalibrationRun, 
  ICalibrationResult, 
  IExpertScore,
  IExpertRater,
  IExpertCalibrationReadiness 
} from '../types';
import './CalibrationPage.css';

const R_API_URL = process.env.REACT_APP_R_API_URL || 'http://localhost:8000';

/**
 * 관리자 모드: 캘리브레이션 실행 페이지
 * Blueprint v0.9: 전문가 개별 채점 기반 MFRM 캘리브레이션
 */
export const CalibrationPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 상태
  const [readiness, setReadiness] = useState<IExpertCalibrationReadiness | null>(null);
  const [expertScores, setExpertScores] = useState<IExpertScore[]>([]);
  const [experts, setExperts] = useState<IExpertRater[]>([]);
  const [calibrationRuns, setCalibrationRuns] = useState<ICalibrationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ICalibrationRun | null>(null);
  const [results, setResults] = useState<ICalibrationResult[]>([]);
  
  // UI 상태
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // 폼 상태
  const [runName, setRunName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 전문가 목록 조회
      const { data: expertsData, error: expertsError } = await supabase
        .from('expert_raters')
        .select('*')
        .eq('is_active', true);

      if (expertsError && expertsError.code !== 'PGRST116') {
        console.warn('전문가 조회 실패:', expertsError);
      }
      setExperts(expertsData || []);

      // 전문가 채점 조회
      const { data: scores, error: scoresError } = await supabase
        .from('expert_scores')
        .select('*');

      if (scoresError && scoresError.code !== 'PGRST116') {
        console.warn('전문가 채점 조회 실패:', scoresError);
      }
      setExpertScores(scores || []);

      // 캘리브레이션 실행 이력 조회
      const { data: runs, error: runsError } = await supabase
        .from('calibration_runs')
        .select('*')
        .order('created_at', { ascending: false });

      if (runsError && runsError.code !== 'PGRST116') {
        console.warn('캘리브레이션 이력 조회 실패:', runsError);
      }
      setCalibrationRuns(runs || []);

      // 준비 상태 계산
      await calculateReadiness(expertsData || [], scores || []);

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const calculateReadiness = async (experts: IExpertRater[], scores: IExpertScore[]) => {
    // 에세이 수 조회
    const { count: calibrationCount } = await supabase
      .from('essays')
      .select('*', { count: 'exact', head: true })
      .or('is_calibration.eq.true,is_anchor.eq.true')
      .eq('is_active', true);

    const { count: anchorCount } = await supabase
      .from('essays')
      .select('*', { count: 'exact', head: true })
      .eq('is_anchor', true)
      .eq('is_active', true);

    const { count: rubricCount } = await supabase
      .from('rubrics')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const activeExperts = experts.length;
    const essaysWithScores = new Set(scores.map(s => s.essay_id)).size;
    const totalScores = scores.length;
    
    // 최소 요구사항 (전문가 5명 × 에세이 20편 × 평가요소 8개 × 80% = 640개)
    const minExperts = 5;
    const minEssays = 20;
    const minScoresCoverage = 0.8;
    const expectedScores = activeExperts * (calibrationCount || 0) * (rubricCount || 8);
    const minScores = Math.floor(expectedScores * minScoresCoverage);

    const expertsPassed = activeExperts >= minExperts;
    const essaysPassed = (calibrationCount || 0) >= minEssays;
    const scoresPassed = totalScores >= minScores;

    const status = expertsPassed && essaysPassed && scoresPassed ? 'ready' : 'not_ready';

    let statusMessage = '';
    if (!expertsPassed) {
      statusMessage = `전문가 부족 (현재: ${activeExperts}명, 필요: ${minExperts}명 이상)`;
    } else if (!essaysPassed) {
      statusMessage = `캘리브레이션 에세이 부족 (현재: ${calibrationCount}편, 필요: ${minEssays}편 이상)`;
    } else if (!scoresPassed) {
      statusMessage = `전문가 채점 부족 (현재: ${totalScores}개, 필요: ${minScores}개 이상)`;
    } else {
      statusMessage = '캘리브레이션 준비 완료! 전문가 MFRM 분석을 실행할 수 있습니다.';
    }

    setReadiness({
      active_experts: activeExperts,
      calibration_essays: calibrationCount || 0,
      anchor_essays: anchorCount || 0,
      total_expert_scores: totalScores,
      essays_with_scores: essaysWithScores,
      status,
      message: statusMessage,
      checklist: {
        experts: { required: minExperts, current: activeExperts, passed: expertsPassed },
        essays: { required: minEssays, current: calibrationCount || 0, passed: essaysPassed },
        scores: { required: minScores, current: totalScores, passed: scoresPassed },
      },
    });
  };

  const runCalibration = async () => {
    if (!runName.trim()) {
      setMessage({ type: 'error', text: '캘리브레이션 이름을 입력해주세요.' });
      return;
    }

    if (expertScores.length === 0) {
      setMessage({ type: 'error', text: '전문가 채점 데이터가 없습니다. 먼저 전문가 채점을 진행해주세요.' });
      return;
    }

    if (readiness?.status !== 'ready') {
      const confirmRun = window.confirm(
        '캘리브레이션 준비가 완료되지 않았습니다. 그래도 실행하시겠습니까?\n\n' +
        '권장: 전문가 5명 이상, 에세이 20편 이상, 80% 이상 채점 완료'
      );
      if (!confirmRun) return;
    }

    setRunning(true);
    setMessage({ type: 'info', text: '전문가 MFRM 캘리브레이션 실행 중... (최대 2분 소요)' });

    try {
      // R API 호출 (전문가 기반 캘리브레이션)
      const response = await fetch(`${R_API_URL}/api/calibration/run-expert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expert_scores: expertScores.map(s => ({
            expert_id: s.expert_id,
            essay_id: s.essay_id,
            rubric_id: s.rubric_id,
            score: s.score,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '캘리브레이션 실행 실패');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '캘리브레이션 실패');
      }

      // 결과 저장
      const versionId = `cal_expert_v${Date.now()}`;
      
      // calibration_runs 테이블에 저장
      const { data: runData, error: runError } = await supabase
        .from('calibration_runs')
        .insert({
          name: runName,
          description: description || null,
          version_id: versionId,
          status: 'completed',
          is_active_version: false,
          essay_ids: [...new Set(expertScores.map(s => s.essay_id))],
          rubric_ids: [...new Set(expertScores.map(s => s.rubric_id))],
          total_observations: expertScores.length,
          convergence: data.converged,
          separation_reliability: data.separation_reliability,
          metadata: {
            method: data.method,
            expert_count: data.summary?.total_experts,
          },
        })
        .select()
        .single();

      if (runError) throw runError;

      // calibration_results 테이블에 에세이별 결과 저장
      if (data.essay_parameters && data.essay_parameters.length > 0) {
        const resultsToInsert = data.essay_parameters.map((ep: any) => ({
          calibration_run_id: runData.id,
          essay_id: ep.essay_id,
          difficulty_logit: ep.difficulty_logit,
          difficulty_se: ep.difficulty_se,
          difficulty_ci_lower: ep.difficulty_ci_lower,
          difficulty_ci_upper: ep.difficulty_ci_upper,
          infit: ep.infit,
          outfit: ep.outfit,
          mean_score: ep.mean_score,
          metadata: {
            expert_count: ep.expert_count,
            sd_score: ep.sd_score,
          },
        }));

        const { error: resultsError } = await supabase
          .from('calibration_results')
          .insert(resultsToInsert);

        if (resultsError) {
          console.warn('결과 저장 경고:', resultsError);
        }
      }

      setMessage({ 
        type: 'success', 
        text: `캘리브레이션 완료! 분리 신뢰도: ${(data.separation_reliability * 100).toFixed(1)}% (방법: ${data.method})` 
      });

      // 데이터 새로고침
      fetchData();
      setRunName('');
      setDescription('');

    } catch (err) {
      console.error('캘리브레이션 실패:', err);
      setMessage({ type: 'error', text: '캘리브레이션 실패: ' + (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const viewResults = async (run: ICalibrationRun) => {
    setSelectedRun(run);
    
    const { data, error } = await supabase
      .from('calibration_results')
      .select(`
        *,
        essays:essay_id (title)
      `)
      .eq('calibration_run_id', run.id);

    if (error) {
      console.error('결과 조회 실패:', error);
      return;
    }

    setResults(data || []);
  };

  const activateVersion = async (run: ICalibrationRun) => {
    if (!window.confirm(`"${run.name}"을 활성 버전으로 설정하시겠습니까?\n\n이 버전의 난이도 값이 앵커 에세이에 고정됩니다.`)) return;

    try {
      // 모든 버전 비활성화
      await supabase
        .from('calibration_runs')
        .update({ is_active_version: false })
        .neq('id', 'dummy');

      // 선택한 버전 활성화
      await supabase
        .from('calibration_runs')
        .update({ is_active_version: true })
        .eq('id', run.id);

      // 에세이 테이블에 난이도 고정
      const { data: resultsData } = await supabase
        .from('calibration_results')
        .select('*')
        .eq('calibration_run_id', run.id);

      if (resultsData) {
        for (const result of resultsData) {
          await supabase
            .from('essays')
            .update({
              difficulty_logit: result.difficulty_logit,
              difficulty_logit_se: result.difficulty_se,
              is_calibrated: true,
              calibrated_at: new Date().toISOString(),
              calibration_run_id: run.id,
            })
            .eq('id', result.essay_id);
        }
      }

      setMessage({ type: 'success', text: `"${run.name}"이 활성 버전으로 설정되었습니다. ${resultsData?.length || 0}편의 에세이 난이도가 고정되었습니다.` });
      fetchData();

    } catch (err) {
      console.error('활성화 실패:', err);
      setMessage({ type: 'error', text: '활성화 실패: ' + (err as Error).message });
    }
  };

  if (loading) {
    return <div className="calibration-page loading">로딩 중...</div>;
  }

  return (
    <div className="calibration-page">
      {/* 헤더 */}
      <div className="cal-header">
        <div className="cal-header-content">
          <h1>⚙️ MFRM 캘리브레이션</h1>
          <p>전문가 개별 채점 데이터를 사용하여 에세이 난이도를 추정하고 고정척도를 구축합니다.</p>
        </div>
        <div className="cal-header-nav">
          <button onClick={() => navigate('/admin/experts')} className="btn-nav">
            👨‍🏫 전문가 관리
          </button>
          <button onClick={() => navigate('/admin/expert-rating')} className="btn-nav">
            ✍️ 전문가 채점
          </button>
          <button onClick={() => navigate('/admin')} className="btn-nav">
            ← 대시보드
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`cal-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      <div className="cal-main">
        {/* 왼쪽: 준비 상태 및 실행 */}
        <div className="cal-left">
          {/* 준비 상태 */}
          <div className="readiness-card">
            <h3>📋 캘리브레이션 준비 상태</h3>
            
            <div className={`readiness-status ${readiness?.status}`}>
              {readiness?.status === 'ready' ? '✅ 준비 완료' : '⚠️ 준비 필요'}
            </div>
            
            <p className="readiness-message">{readiness?.message}</p>

            <div className="checklist">
              <div className={`checklist-item ${readiness?.checklist.experts.passed ? 'passed' : 'failed'}`}>
                <span className="check-icon">
                  {readiness?.checklist.experts.passed ? '✓' : '✗'}
                </span>
                <span>전문가: {readiness?.checklist.experts.current}/{readiness?.checklist.experts.required}명</span>
              </div>
              <div className={`checklist-item ${readiness?.checklist.essays.passed ? 'passed' : 'failed'}`}>
                <span className="check-icon">
                  {readiness?.checklist.essays.passed ? '✓' : '✗'}
                </span>
                <span>캘리브레이션 에세이: {readiness?.checklist.essays.current}/{readiness?.checklist.essays.required}편</span>
              </div>
              <div className={`checklist-item ${readiness?.checklist.scores.passed ? 'passed' : 'failed'}`}>
                <span className="check-icon">
                  {readiness?.checklist.scores.passed ? '✓' : '✗'}
                </span>
                <span>전문가 채점: {readiness?.checklist.scores.current}/{readiness?.checklist.scores.required}개</span>
              </div>
            </div>

            <div className="data-summary">
              <div className="summary-row">
                <span>채점된 에세이:</span>
                <strong>{readiness?.essays_with_scores || 0}편</strong>
              </div>
              <div className="summary-row">
                <span>총 채점 수:</span>
                <strong>{readiness?.total_expert_scores || 0}개</strong>
              </div>
            </div>
          </div>

          {/* 캘리브레이션 실행 */}
          <div className="run-card">
            <h3>🚀 캘리브레이션 실행</h3>
            
            <div className="form-group">
              <label>이름 *</label>
              <input
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                placeholder="예: 2025-1학기 초기 캘리브레이션"
              />
            </div>

            <div className="form-group">
              <label>설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="캘리브레이션에 대한 설명"
                rows={3}
              />
            </div>

            <div className="method-info">
              <strong>분석 방법:</strong> 전문가 개별 점수 기반 MFRM
              <br />
              <small>전문가를 평가자(rater)로, 에세이×평가요소를 문항(item)으로 처리하여 난이도 추정</small>
            </div>

            <button
              className="btn-run"
              onClick={runCalibration}
              disabled={running || expertScores.length === 0}
            >
              {running ? '⏳ 분석 중...' : '▶️ MFRM 캘리브레이션 실행'}
            </button>
          </div>
        </div>

        {/* 오른쪽: 실행 이력 및 결과 */}
        <div className="cal-right">
          {/* 실행 이력 */}
          <div className="history-card">
            <h3>📜 캘리브레이션 이력</h3>
            
            {calibrationRuns.length === 0 ? (
              <div className="empty-state">아직 캘리브레이션 이력이 없습니다.</div>
            ) : (
              <div className="run-list">
                {calibrationRuns.map(run => (
                  <div 
                    key={run.id} 
                    className={`run-item ${selectedRun?.id === run.id ? 'selected' : ''} ${run.is_active_version ? 'active' : ''}`}
                    onClick={() => viewResults(run)}
                  >
                    <div className="run-header">
                      <span className="run-name">{run.name}</span>
                      {run.is_active_version && <span className="active-badge">활성</span>}
                    </div>
                    <div className="run-meta">
                      <span>{new Date(run.created_at).toLocaleDateString()}</span>
                      <span>신뢰도: {((run.separation_reliability || 0) * 100).toFixed(1)}%</span>
                      <span>{(run.metadata as any)?.method || 'expert_mfrm'}</span>
                    </div>
                    {!run.is_active_version && run.status === 'completed' && (
                      <button 
                        className="btn-activate"
                        onClick={(e) => {
                          e.stopPropagation();
                          activateVersion(run);
                        }}
                      >
                        활성화
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 결과 상세 */}
          {selectedRun && (
            <div className="results-card">
              <h3>📊 "{selectedRun.name}" 결과</h3>
              
              <div className="results-summary">
                <div className="summary-item">
                  <span className="label">상태:</span>
                  <span className={`value ${selectedRun.status}`}>{selectedRun.status}</span>
                </div>
                <div className="summary-item">
                  <span className="label">분리 신뢰도:</span>
                  <span className="value">{((selectedRun.separation_reliability || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="summary-item">
                  <span className="label">총 관측치:</span>
                  <span className="value">{selectedRun.total_observations}</span>
                </div>
              </div>

              {results.length > 0 && (
                <div className="results-table-container">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>에세이</th>
                        <th>난이도 (Logit)</th>
                        <th>SE</th>
                        <th>평균 점수</th>
                        <th>전문가 수</th>
                        <th>Infit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(result => (
                        <tr key={result.id}>
                          <td>{(result as any).essays?.title || result.essay_id.slice(0, 8)}</td>
                          <td>{result.difficulty_logit?.toFixed(2) || '-'}</td>
                          <td>{result.difficulty_se?.toFixed(2) || '-'}</td>
                          <td>{result.mean_score?.toFixed(2) || '-'}</td>
                          <td>{(result.metadata as any)?.expert_count || '-'}</td>
                          <td>{result.infit?.toFixed(2) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalibrationPage;
