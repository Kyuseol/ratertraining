import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ICalibrationStats, IAnchorEssayStats } from '../types';
import './AdminDashboard.css';

/**
 * 관리자 모드: 대시보드
 * Blueprint v0.9: 시스템 상태 모니터링
 */
export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    totalEssays: 0,
    anchorEssays: 0,
    calibrationEssays: 0,
    totalTeachers: 0,
    totalScores: 0,
    activeTeachers: 0,
  });

  const [calibrationStats, setCalibrationStats] = useState<ICalibrationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 에세이 통계
      const { count: totalEssays } = await supabase
        .from('essays')
        .select('*', { count: 'exact', head: true });

      const { count: anchorEssays } = await supabase
        .from('essays')
        .select('*', { count: 'exact', head: true })
        .eq('is_anchor', true);

      const { count: calibrationEssays } = await supabase
        .from('essays')
        .select('*', { count: 'exact', head: true })
        .eq('is_calibration', true);

      // 교사 통계
      const { count: totalTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true });

      const { count: activeTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 채점 통계
      const { count: totalScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalEssays: totalEssays || 0,
        anchorEssays: anchorEssays || 0,
        calibrationEssays: calibrationEssays || 0,
        totalTeachers: totalTeachers || 0,
        totalScores: totalScores || 0,
        activeTeachers: activeTeachers || 0,
      });

      // 캘리브레이션 통계 계산
      const panelSize = activeTeachers || 5; // 기본값 5
      const observationsPerFacet = Math.floor((totalScores || 0) / 9); // 9개 평가요소

      setCalibrationStats({
        total_calibration_count: calibrationEssays || 0,
        required_min: Math.ceil(120 / panelSize),
        recommended_min: 32,
        panel_size: panelSize,
        observations_per_facet: observationsPerFacet,
      });
    } catch (err) {
      console.error('통계 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCalibrationStatus = () => {
    if (!calibrationStats) return { text: '-', className: '' };

    if (calibrationStats.total_calibration_count >= calibrationStats.recommended_min) {
      return { text: '✓ 충분', className: 'good' };
    } else if (calibrationStats.total_calibration_count >= calibrationStats.required_min) {
      return { text: '⚠ 권장치 미달', className: 'warning' };
    } else {
      return { text: '✕ 부족', className: 'danger' };
    }
  };

  const getAnchorStatus = () => {
    if (stats.anchorEssays >= 12 && stats.anchorEssays <= 16) {
      return { text: '✓ 적정', className: 'good' };
    } else if (stats.anchorEssays < 12) {
      return { text: '✕ 부족', className: 'danger' };
    } else {
      return { text: 'ℹ 초과', className: 'info' };
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  const calibrationStatus = getCalibrationStatus();
  const anchorStatus = getAnchorStatus();

  return (
    <div className="admin-dashboard">
      {/* 헤더 */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>관리자 대시보드 🔧</h1>
          <p className="subtitle">MFRM 쓰기 평가 문식성 시스템 - Blueprint v0.9</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/admin/essays')} className="header-btn">
            📝 에세이
          </button>
          <button onClick={() => navigate('/admin/anchor')} className="header-btn">
            ⚓ 앵커
          </button>
          <button onClick={() => navigate('/admin/experts')} className="header-btn experts">
            👨‍🏫 전문가
          </button>
          <button onClick={() => navigate('/admin/calibration')} className="header-btn calibration">
            ⚙️ 캘리브레이션
          </button>
          <button onClick={() => navigate('/admin/analysis')} className="header-btn">
            📊 분석
          </button>
          <button onClick={logout} className="header-btn logout">
            로그아웃
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="dashboard-content">
        {/* Blueprint 구성 상태 */}
        <div className="section-title">
          <h2>📋 Blueprint 구성 상태</h2>
        </div>
        <div className="status-grid">
          <div className={`status-card card ${anchorStatus.className}`}>
            <div className="status-icon-wrapper">
              <div className="status-icon">⚓</div>
            </div>
            <h3 className="status-label">앵커 에세이</h3>
            <div className="status-value">
              {stats.anchorEssays}편 <span className="status-target">/ 12-16편</span>
            </div>
            <div className={`status-badge ${anchorStatus.className}`}>
              {anchorStatus.text}
            </div>
          </div>

          <div className={`status-card card ${calibrationStatus.className}`}>
            <div className="status-icon-wrapper">
              <div className="status-icon">📐</div>
            </div>
            <h3 className="status-label">캘리브레이션 세트</h3>
            <div className="status-value">
              {calibrationStats?.total_calibration_count}편{' '}
              <span className="status-target">/ {calibrationStats?.recommended_min}편</span>
            </div>
            <div className={`status-badge ${calibrationStatus.className}`}>
              {calibrationStatus.text}
            </div>
          </div>

          <div className="status-card card">
            <div className="status-icon-wrapper">
              <div className="status-icon">👥</div>
            </div>
            <h3 className="status-label">활성 교사</h3>
            <div className="status-value">{stats.activeTeachers}명</div>
            <div className="status-info">패널 크기</div>
          </div>

          <div className="status-card card">
            <div className="status-icon-wrapper">
              <div className="status-icon">📊</div>
            </div>
            <h3 className="status-label">총 채점 수</h3>
            <div className="status-value">{stats.totalScores}개</div>
            <div className="status-info">
              {calibrationStats?.observations_per_facet}개/요소
            </div>
          </div>
        </div>

        {/* 시스템 통계 */}
        <div className="section-title">
          <h2>📈 시스템 통계</h2>
        </div>
        <div className="system-stats-grid">
          <div className="stat-box card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalEssays}</div>
              <div className="stat-label">전체 에세이</div>
            </div>
          </div>
          <div className="stat-box card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalTeachers}</div>
              <div className="stat-label">전체 교사</div>
            </div>
          </div>
          <div className="stat-box card">
            <div className="stat-icon">✍️</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalScores}</div>
              <div className="stat-label">전체 채점</div>
            </div>
          </div>
          <div className="stat-box card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">
                {stats.activeTeachers > 0
                  ? Math.round(stats.totalScores / stats.activeTeachers)
                  : 0}
              </div>
              <div className="stat-label">평균 채점/교사</div>
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="section-title">
          <h2>⚡ 빠른 액션</h2>
        </div>
        <div className="action-grid">
          <div className="action-card card" onClick={() => navigate('/admin/essays')}>
            <div className="action-icon-large">📝</div>
            <h3 className="action-title">에세이 관리</h3>
            <p className="action-description">에세이 추가, 수정, 삭제</p>
            <button className="action-button primary">열기 →</button>
          </div>

          <div className="action-card card" onClick={() => navigate('/admin/anchor')}>
            <div className="action-icon-large">⚓</div>
            <h3 className="action-title">앵커 관리</h3>
            <p className="action-description">앵커 포트폴리오 점검</p>
            <button className="action-button primary">열기 →</button>
          </div>

          <div className="action-card card" onClick={() => navigate('/admin/analysis')}>
            <div className="action-icon-large">📐</div>
            <h3 className="action-title">MFRM 분석</h3>
            <p className="action-description">배치 재추정 및 품질 관리</p>
            <button className="action-button primary">열기 →</button>
          </div>

          <div className="action-card card" onClick={() => navigate('/admin/teachers')}>
            <div className="action-icon-large">👥</div>
            <h3 className="action-title">교사 관리</h3>
            <p className="action-description">교사 정보 및 진단 단계</p>
            <button className="action-button primary">열기 →</button>
          </div>
        </div>

        {/* Blueprint 요구사항 요약 */}
        <div className="section-title">
          <h2>📖 Blueprint v0.9 요구사항</h2>
        </div>
        <div className="requirements-grid">
          <div className="requirement-card card">
            <div className="requirement-icon">🎯</div>
            <h3 className="requirement-title">교사 진단 최소 요구량</h3>
            <ul className="requirement-list">
              <li><strong>예비 진단:</strong> 6편 (관측치 54) → SE ≈ 0.40-0.50</li>
              <li><strong>공식 진단:</strong> 9편 (관측치 81) → SE ≈ 0.30-0.35</li>
              <li><strong>정밀 추적:</strong> 18편 (관측치 162) → SE ≈ 0.22-0.27</li>
            </ul>
          </div>

          <div className="requirement-card card">
            <div className="requirement-icon">⚓</div>
            <h3 className="requirement-title">앵커 혼입률</h3>
            <ul className="requirement-list">
              <li><strong>신규 교사:</strong> 25%</li>
              <li><strong>유지:</strong> 15-20%</li>
              <li><strong>이중 채점:</strong> 30-40%</li>
            </ul>
          </div>

          <div className="requirement-card card">
            <div className="requirement-icon">📊</div>
            <h3 className="requirement-title">배치 재추정 기준</h3>
            <ul className="requirement-list">
              <li><strong>인핏/아웃핏:</strong> 0.7-1.3</li>
              <li><strong>분리지수:</strong> ≥ 1.5</li>
              <li><strong>극단 응답률:</strong> ≤ 10%</li>
            </ul>
          </div>

          <div className="requirement-card card">
            <div className="requirement-icon">✍️</div>
            <h3 className="requirement-title">평가요소 (9개, 3점 척도)</h3>
            <ol className="requirement-list numbered">
              <li>주장의 명료성</li>
              <li>근거의 타당성</li>
              <li>예시의 적절성</li>
              <li>논리적 전개</li>
              <li>반론 고려</li>
              <li>어휘 사용</li>
              <li>문법 정확성</li>
              <li>글의 구조</li>
              <li>전체적 완성도</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};


