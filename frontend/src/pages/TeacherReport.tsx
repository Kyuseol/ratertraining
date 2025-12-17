import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { IMFRMResult, ITeacher } from '../types';
import './TeacherReport.css';

/**
 * 교사 개인 리포트 페이지
 * Blueprint v0.9: 엄격성, 일관성, 헤일로 효과, 범주 불균형 등
 */
export const TeacherReport: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<ITeacher | null>(null);
  const [latestResult, setLatestResult] = useState<IMFRMResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user]);

  const fetchReportData = async () => {
    if (!user) return;

    try {
      // 교사 정보 조회
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', user.id)
        .single();

      if (teacherError) throw teacherError;
      setTeacher(teacherData);

      // 최신 MFRM 결과 조회 (활성 버전)
      const { data: runData } = await supabase
        .from('mfrm_runs')
        .select('id')
        .eq('is_active_version', true)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (runData) {
        const { data: resultData } = await supabase
          .from('mfrm_results')
          .select('*')
          .eq('run_id', runData.id)
          .eq('teacher_id', user.id)
          .single();

        setLatestResult(resultData);
      }
    } catch (err) {
      console.error('리포트 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityInterpretation = (severity: number | null) => {
    if (severity === null) return { text: '분석 대기 중', color: '#999', description: '' };
    if (severity > 0.5)
      return { text: '매우 엄격', color: '#F44336', description: '다른 교사들보다 훨씬 낮은 점수를 부여하는 경향' };
    if (severity > 0.2)
      return { text: '다소 엄격', color: '#FF9800', description: '평균보다 조금 낮은 점수를 부여하는 경향' };
    if (severity > -0.2)
      return { text: '적정', color: '#4CAF50', description: '다른 교사들과 비슷한 수준으로 채점' };
    if (severity > -0.5)
      return { text: '다소 관대', color: '#FF9800', description: '평균보다 조금 높은 점수를 부여하는 경향' };
    return { text: '매우 관대', color: '#F44336', description: '다른 교사들보다 훨씬 높은 점수를 부여하는 경향' };
  };

  const getConsistencyInterpretation = (infit: number | null) => {
    if (infit === null) return { text: '분석 대기 중', color: '#999', description: '' };
    if (infit < 0.7)
      return { text: '과도하게 일관적', color: '#FF9800', description: '의심스러운 패턴 (동일 점수 반복 가능성)' };
    if (infit <= 1.3)
      return { text: '일관적', color: '#4CAF50', description: '채점 기준이 일관되게 적용됨' };
    if (infit <= 2.0)
      return { text: '다소 불일치', color: '#FF9800', description: '채점 기준이 일부 불일치' };
    return { text: '매우 불일치', color: '#F44336', description: '채점 기준이 크게 불일치 (재검토 필요)' };
  };

  const getHaloEffectLevel = (score: number | null) => {
    if (score === null) return { text: '분석 대기 중', level: 0 };
    if (score < 0.3) return { text: '문제 없음', level: 1 };
    if (score < 0.6) return { text: '주의 필요', level: 2 };
    return { text: '개선 필요', level: 3 };
  };

  const getCategoryImbalanceLevel = (score: number | null) => {
    if (score === null) return { text: '분석 대기 중', level: 0 };
    if (score < 0.3) return { text: '균형적', level: 1 };
    if (score < 0.6) return { text: '다소 편중', level: 2 };
    return { text: '심각한 편중', level: 3 };
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!teacher) {
    return <div className="error">교사 정보를 불러올 수 없습니다.</div>;
  }

  const hasResult = latestResult !== null;
  const minEssaysForReport = 6;
  const needsMoreData = teacher.essays_rated_count < minEssaysForReport;

  const severityInfo = hasResult ? getSeverityInterpretation(latestResult.severity) : { text: '-', color: '#999', description: '' };
  const consistencyInfo = hasResult ? getConsistencyInterpretation(latestResult.infit) : { text: '-', color: '#999', description: '' };
  const haloInfo = hasResult ? getHaloEffectLevel(latestResult.halo_effect_score) : { text: '-', level: 0 };
  const categoryInfo = hasResult ? getCategoryImbalanceLevel(latestResult.category_imbalance_score) : { text: '-', level: 0 };

  return (
    <div className="teacher-report">
      {/* 헤더 */}
      <div className="report-header">
        <div className="header-content">
          <h1>📈 내 리포트</h1>
          <p className="subtitle">MFRM 분석 기반 개인화된 채점 진단</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="report-content">
        {needsMoreData ? (
          <div className="insufficient-data card">
            <div className="warning-icon-large">⚠️</div>
            <h2>분석을 위한 데이터가 부족합니다</h2>
            <div className="data-status">
              <div className="status-item">
                <span className="status-label">현재 채점한 에세이</span>
                <span className="status-value">{teacher.essays_rated_count}편</span>
              </div>
              <div className="status-divider">→</div>
              <div className="status-item">
                <span className="status-label">최소 필요</span>
                <span className="status-value required">{minEssaysForReport}편</span>
              </div>
            </div>
            <p className="guide-text">
              최소 6편을 채점하시면 예비 진단 리포트가 제공됩니다.
              <br />
              더 정확한 분석을 위해서는 9편 이상 채점을 권장합니다.
            </p>
            <button onClick={() => navigate('/teacher/rating')} className="cta-button">
              채점하러 가기 →
            </button>
          </div>
        ) : (
          <>
          {/* 주요 지표 */}
          <div className="metrics-section">
            <h2>핵심 지표</h2>
            <div className="metrics-grid">
              {/* 엄격성 */}
              <div className="metric-card">
                <div className="metric-header">
                  <h3>엄격성 (Severity)</h3>
                  <span className="metric-badge" style={{ backgroundColor: severityInfo.color }}>
                    {severityInfo.text}
                  </span>
                </div>
                <div className="metric-value">
                  {latestResult?.severity !== null ? latestResult?.severity?.toFixed(2) : '-'} logit
                </div>
                {latestResult?.severity_ci_lower && latestResult?.severity_ci_upper && (
                  <div className="metric-ci">
                    95% CI: [{latestResult.severity_ci_lower.toFixed(2)}, {latestResult.severity_ci_upper.toFixed(2)}]
                  </div>
                )}
                <p className="metric-description">{severityInfo.description}</p>
                {latestResult?.severity && Math.abs(latestResult.severity) > 0.3 && (
                  <div className="metric-feedback">
                    💡 다른 교사들의 채점과 비교하여 자신의 기준을 조정해보세요.
                  </div>
                )}
              </div>

              {/* 일관성 */}
              <div className="metric-card">
                <div className="metric-header">
                  <h3>일관성 (Infit)</h3>
                  <span className="metric-badge" style={{ backgroundColor: consistencyInfo.color }}>
                    {consistencyInfo.text}
                  </span>
                </div>
                <div className="metric-value">{latestResult?.infit?.toFixed(2) || '-'}</div>
                <div className="metric-range">적정 범위: 0.7 - 1.3</div>
                <p className="metric-description">{consistencyInfo.description}</p>
                {latestResult?.infit && (latestResult.infit < 0.7 || latestResult.infit > 1.3) && (
                  <div className="metric-feedback">
                    💡 채점 기준을 재검토하고 일관성을 높여보세요.
                  </div>
                )}
              </div>

              {/* 헤일로 효과 */}
              <div className="metric-card">
                <div className="metric-header">
                  <h3>헤일로 효과</h3>
                  <span className={`metric-badge level-${haloInfo.level}`}>{haloInfo.text}</span>
                </div>
                <div className="metric-value">{latestResult?.halo_effect_score?.toFixed(2) || '-'}</div>
                <p className="metric-description">
                  평가요소 간 과도한 상관 (0에 가까울수록 좋음)
                </p>
                {latestResult?.halo_effect_score && latestResult.halo_effect_score > 0.5 && (
                  <div className="metric-feedback">
                    💡 각 평가요소를 독립적으로 평가하도록 주의하세요.
                  </div>
                )}
              </div>

              {/* 범주 불균형 */}
              <div className="metric-card">
                <div className="metric-header">
                  <h3>범주 불균형</h3>
                  <span className={`metric-badge level-${categoryInfo.level}`}>{categoryInfo.text}</span>
                </div>
                <div className="metric-value">
                  {latestResult?.category_imbalance_score?.toFixed(2) || '-'}
                </div>
                <p className="metric-description">
                  특정 점수의 과다 사용 (0에 가까울수록 좋음)
                </p>
                {latestResult?.category_imbalance_score && latestResult.category_imbalance_score > 0.5 && (
                  <div className="metric-feedback">
                    💡 1/2/3점을 고르게 사용하도록 노력하세요.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 채점 통계 */}
          <div className="stats-section">
            <h2>채점 통계</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">총 채점 수</div>
                <div className="stat-value">{latestResult?.total_ratings || 0}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">평균 점수</div>
                <div className="stat-value">{latestResult?.mean_score?.toFixed(2) || '-'}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">표준편차</div>
                <div className="stat-value">{latestResult?.sd_score?.toFixed(2) || '-'}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Outfit</div>
                <div className="stat-value">{latestResult?.outfit?.toFixed(2) || '-'}</div>
              </div>
            </div>
          </div>

          {/* 개선 제안 */}
          <div className="recommendations-section">
            <h2>💡 개선 제안</h2>
            <div className="recommendations-list">
              {latestResult?.severity && Math.abs(latestResult.severity) > 0.5 && (
                <div className="recommendation-item">
                  <div className="recommendation-icon">🎯</div>
                  <div className="recommendation-content">
                    <h4>채점 기준 조정</h4>
                    <p>
                      다른 교사들과 비교하여 채점 기준이 {latestResult.severity > 0 ? '엄격' : '관대'}합니다.
                      앵커 에세이를 참고하여 기준을 조정해보세요.
                    </p>
                  </div>
                </div>
              )}
              {latestResult?.infit && latestResult.infit > 1.3 && (
                <div className="recommendation-item">
                  <div className="recommendation-icon">📏</div>
                  <div className="recommendation-content">
                    <h4>일관성 향상</h4>
                    <p>
                      채점의 일관성을 높이기 위해 각 평가요소의 경계 기준을 명확히 숙지하세요.
                      미세 조정 과제의 범주 경계 퀴즈를 추천합니다.
                    </p>
                  </div>
                </div>
              )}
              {latestResult?.halo_effect_score && latestResult.halo_effect_score > 0.6 && (
                <div className="recommendation-item">
                  <div className="recommendation-icon">🔍</div>
                  <div className="recommendation-content">
                    <h4>헤일로 효과 주의</h4>
                    <p>
                      한 평가요소에서 좋은/나쁜 인상이 다른 요소에 영향을 주고 있습니다.
                      각 요소를 독립적으로 평가하도록 의식적으로 노력하세요.
                    </p>
                  </div>
                </div>
              )}
              {(!latestResult ||
                (latestResult.severity && Math.abs(latestResult.severity) < 0.3 && latestResult.infit && latestResult.infit >= 0.7 && latestResult.infit <= 1.3)) && (
                <div className="recommendation-item positive">
                  <div className="recommendation-icon">✅</div>
                  <div className="recommendation-content">
                    <h4>양호한 채점 패턴</h4>
                    <p>
                      현재 채점 패턴이 매우 우수합니다. 이 수준을 유지하면서 계속 채점하시면 됩니다!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 다음 단계 */}
          <div className="next-steps">
            <h2>다음 단계</h2>
            <div className="next-steps-grid">
              <a href="/teacher/training" className="next-step-card">
                <div className="step-icon">🎯</div>
                <h4>미세 조정 과제</h4>
                <p>5-10분 완결형 훈련으로 약점 보완</p>
              </a>
              <a href="/teacher/rating" className="next-step-card">
                <div className="step-icon">✍️</div>
                <h4>추가 채점</h4>
                <p>더 정확한 분석을 위해 계속 채점하기</p>
              </a>
            </div>
          </div>
        </>
        )}
      </div>
    </div>
  );
};

