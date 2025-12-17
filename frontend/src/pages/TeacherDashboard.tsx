import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ITeacher, IDiagnosisProgress } from '../types';
import './TeacherDashboard.css';

/**
 * 교사 대시보드
 * Blueprint v0.9: 진단 단계 추적 및 개인 통계
 */
export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<ITeacher | null>(null);
  const [progress, setProgress] = useState<IDiagnosisProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeacherData();
    }
  }, [user]);

  const fetchTeacherData = async () => {
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

      // 진단 진행 상황 계산
      const essaysRated = teacherData.essays_rated_count;
      const currentLevel = teacherData.diagnosis_level;

      let nextLevel: IDiagnosisProgress['next_level'] = 'preliminary';
      let essaysNeeded = 6;

      if (currentLevel === 'none') {
        nextLevel = 'preliminary';
        essaysNeeded = 6 - essaysRated;
      } else if (currentLevel === 'preliminary') {
        nextLevel = 'official';
        essaysNeeded = 9 - essaysRated;
      } else if (currentLevel === 'official') {
        nextLevel = 'advanced';
        essaysNeeded = 18 - essaysRated;
      } else {
        nextLevel = 'complete';
        essaysNeeded = 0;
      }

      const observationsCount = essaysRated * 9; // 9개 평가요소
      const estimatedSE =
        essaysRated < 6
          ? 0.5
          : essaysRated < 9
          ? 0.4
          : essaysRated < 18
          ? 0.32
          : 0.25;

      setProgress({
        teacher_id: user.id,
        teacher_name: user.name,
        essays_rated_count: essaysRated,
        current_level: currentLevel,
        next_level: nextLevel,
        essays_needed_for_next: Math.max(0, essaysNeeded),
        observations_count: observationsCount,
        estimated_se: estimatedSE,
      });
    } catch (err) {
      console.error('교사 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'none':
        return { label: '미진단', color: '#9E9E9E', description: '아직 채점을 시작하지 않았습니다.' };
      case 'preliminary':
        return {
          label: '예비 진단',
          color: '#FF9800',
          description: '6편 채점 완료 (SE ≈ 0.40-0.50)',
        };
      case 'official':
        return {
          label: '공식 진단',
          color: '#2196F3',
          description: '9편 채점 완료 (SE ≈ 0.30-0.35)',
        };
      case 'advanced':
        return {
          label: '정밀 추적',
          color: '#4CAF50',
          description: '18편 채점 완료 (SE ≈ 0.22-0.27)',
        };
      default:
        return { label: '알 수 없음', color: '#999', description: '' };
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!teacher || !progress) {
    return <div className="error">교사 정보를 불러올 수 없습니다.</div>;
  }

  const levelInfo = getLevelInfo(teacher.diagnosis_level);
  const progressPercent =
    teacher.diagnosis_level === 'advanced'
      ? 100
      : (progress.essays_rated_count / (progress.essays_rated_count + progress.essays_needed_for_next)) *
        100;

  return (
    <div className="teacher-dashboard">
      {/* 헤더 */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>안녕하세요, {teacher.name} 선생님! 👋</h1>
          <p className="subtitle">쓰기 평가 문식성 진단 시스템</p>
        </div>
        <div className="header-right">
          <div className="header-badge">
            <span className="level-badge" style={{ backgroundColor: levelInfo.color }}>
              {levelInfo.label}
            </span>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/teacher/rating')} className="header-btn">
              ✍️ 채점
            </button>
            <button onClick={() => navigate('/teacher/report')} className="header-btn">
              📈 리포트
            </button>
            <button onClick={() => navigate('/teacher/training')} className="header-btn">
              🎯 훈련
            </button>
            <button onClick={() => { /* logout 함수 추가 필요 */ window.location.href = '/login'; }} className="header-btn logout">
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="dashboard-content">
        {/* 진단 진행 상황 카드 */}
        <div className="progress-card card">
          <div className="card-header">
            <h2>📊 진단 진행 상황</h2>
          </div>
          <div className="card-body">
            <div className="level-description">
              <p>{levelInfo.description}</p>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <div className="stat-value">{progress.essays_rated_count}<span className="stat-unit">편</span></div>
                  <div className="stat-label">채점한 에세이</div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{progress.observations_count}<span className="stat-unit">개</span></div>
                  <div className="stat-label">총 관측치</div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <div className="stat-value">{progress.estimated_se.toFixed(2)}</div>
                  <div className="stat-label">추정 SE</div>
                </div>
              </div>
            </div>

            {progress.next_level !== 'complete' && (
              <div className="next-level-section">
                <div className="progress-bar-wrapper">
                  <div className="progress-info">
                    <span className="progress-label">
                      <strong>{getLevelInfo(progress.next_level).label}</strong>까지
                    </span>
                    <span className="progress-count">
                      <strong>{progress.essays_needed_for_next}편</strong> 남음
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${progressPercent}%`,
                        backgroundColor: getLevelInfo(progress.next_level).color 
                      }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 빠른 액션 그리드 */}
        <div className="section-title">
          <h2>🎯 빠른 액션</h2>
        </div>
        <div className="action-grid">
          <div className="action-card card" onClick={() => navigate('/teacher/rating')}>
            <div className="action-icon-large">✍️</div>
            <h3 className="action-title">에세이 채점하기</h3>
            <p className="action-description">새로운 에세이를 채점하고 진단 레벨을 올리세요</p>
            <button className="action-button primary">시작하기 →</button>
          </div>

          <div className="action-card card" onClick={() => navigate('/teacher/report')}>
            <div className="action-icon-large">📈</div>
            <h3 className="action-title">내 리포트 보기</h3>
            <p className="action-description">엄격성, 일관성 등 상세 분석 결과를 확인하세요</p>
            <button className="action-button secondary">보기 →</button>
          </div>

          <div className="action-card card" onClick={() => navigate('/teacher/training')}>
            <div className="action-icon-large">🎯</div>
            <h3 className="action-title">미세 조정 과제</h3>
            <p className="action-description">5-10분 완결형 훈련 과제로 실력을 향상시키세요</p>
            <button className="action-button secondary">도전하기 →</button>
          </div>
        </div>

        {/* 진단 단계 안내 */}
        <div className="section-title">
          <h2>ℹ️ 진단 단계 안내</h2>
          <span className="section-subtitle">Blueprint v0.9</span>
        </div>
        <div className="info-grid">
          <div className="info-card card">
            <div className="info-icon" style={{ backgroundColor: '#FF9800' }}>1</div>
            <h3 className="info-title">예비 진단</h3>
            <div className="info-requirement">6편 채점</div>
            <div className="info-details">
              <p>관측치 54개</p>
              <p>SE ≈ 0.40-0.50</p>
            </div>
            <p className="info-description">기본적인 채점 패턴 파악</p>
          </div>
          <div className="info-card card">
            <div className="info-icon" style={{ backgroundColor: '#2196F3' }}>2</div>
            <h3 className="info-title">공식 진단</h3>
            <div className="info-requirement">9편 채점</div>
            <div className="info-details">
              <p>관측치 81개</p>
              <p>SE ≈ 0.30-0.35</p>
            </div>
            <p className="info-description">"안정" 배지 획득, 정식 리포트 발행</p>
          </div>
          <div className="info-card card">
            <div className="info-icon" style={{ backgroundColor: '#4CAF50' }}>3</div>
            <h3 className="info-title">정밀 추적</h3>
            <div className="info-requirement">18편 채점</div>
            <div className="info-details">
              <p>관측치 162개</p>
              <p>SE ≈ 0.22-0.27</p>
            </div>
            <p className="info-description">월별 드리프트, 헤일로 효과 등 시계열 지표</p>
          </div>
        </div>
      </div>
    </div>
  );
};

