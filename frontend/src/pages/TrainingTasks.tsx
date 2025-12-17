import React, { useState } from 'react';
import './TrainingTasks.css';

/**
 * 미세 조정 과제 페이지
 * Blueprint v0.9 섹션 7: 5-10분 완결형 훈련 과제
 */
export const TrainingTasks: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<number | null>(null);

  const tasks = [
    {
      id: 1,
      icon: '🎯',
      title: '범주 경계 퀴즈',
      description: '1↔2, 2↔3 경계 사례 4개를 선택하고 오답 시 앵커 근거 확인',
      duration: '5분',
      difficulty: 'Easy',
      status: '준비 중',
    },
    {
      id: 2,
      icon: '🔍',
      title: '근거 하이라이트',
      description: '주장/근거/예시/반론 태깅 후 누락 유형 즉시 피드백',
      duration: '7분',
      difficulty: 'Medium',
      status: '준비 중',
    },
    {
      id: 3,
      icon: '🔗',
      title: '루브릭-문장 매칭',
      description: '루브릭 진술과 실제 문장 샘플 드래그 앤 드롭',
      duration: '6분',
      difficulty: 'Medium',
      status: '준비 중',
    },
    {
      id: 4,
      icon: '📊',
      title: '스케일 정규화 미니게임',
      description: '6개 에세이 상대 서열·등간 배치로 관대/엄격 시각화',
      duration: '10분',
      difficulty: 'Hard',
      status: '준비 중',
    },
    {
      id: 5,
      icon: '✏️',
      title: '코멘트 리라이트',
      description: '자유 코멘트를 루브릭 근거가 명시된 코멘트로 재작성',
      duration: '8분',
      difficulty: 'Medium',
      status: '준비 중',
    },
    {
      id: 6,
      icon: '⚓',
      title: '앵커 샌드위치',
      description: '앵커A → 실전 → 앵커B 연속 채점으로 드리프트 감지',
      duration: '10분',
      difficulty: 'Hard',
      status: '준비 중',
    },
    {
      id: 7,
      icon: '📈',
      title: '범주 사용 분포 교정',
      description: '최근 50건 개인 분포 vs 합성 분포 대조쌍 퀴즈 3문항',
      duration: '5분',
      difficulty: 'Easy',
      status: '준비 중',
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return '#4CAF50';
      case 'Medium':
        return '#FF9800';
      case 'Hard':
        return '#F44336';
      default:
        return '#999';
    }
  };

  return (
    <div className="training-tasks">
      {/* 헤더 */}
      <div className="tasks-header">
        <div className="header-content">
          <h1>🎯 미세 조정 과제</h1>
          <p className="subtitle">
            5-10분 완결형 훈련으로 채점 능력을 향상시키세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="tasks-content">
        {/* 개요 카드 */}
        <div className="overview-card card">
          <div className="overview-icon">💡</div>
          <h3>미세 조정 과제란?</h3>
          <p>
            짧은 시간 내에 특정 채점 능력을 집중적으로 훈련하는 과제입니다.
            각 과제는 독립적으로 수행 가능하며, 즉시 피드백을 제공합니다.
          </p>
          
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-icon">📚</div>
              <div className="stat-value">7개</div>
              <div className="stat-label">전체 과제</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">⏱</div>
              <div className="stat-value">5-10분</div>
              <div className="stat-label">소요 시간</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">✅</div>
              <div className="stat-value">0개</div>
              <div className="stat-label">완료한 과제</div>
            </div>
          </div>
        </div>

      {/* 과제 목록 */}
      <div className="tasks-grid">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`task-card ${selectedTask === task.id ? 'selected' : ''}`}
            onClick={() => setSelectedTask(task.id)}
          >
            <div className="task-icon">{task.icon}</div>
            <div className="task-header">
              <h3>{task.title}</h3>
              <div className="task-badges">
                <span
                  className="difficulty-badge"
                  style={{ backgroundColor: getDifficultyColor(task.difficulty) }}
                >
                  {task.difficulty}
                </span>
                <span className="duration-badge">⏱ {task.duration}</span>
              </div>
            </div>
            <p className="task-description">{task.description}</p>
            <div className="task-footer">
              <span className="task-status">{task.status}</span>
              <button
                className="task-button"
                onClick={(e) => {
                  e.stopPropagation();
                  alert('이 과제는 아직 구현 중입니다. 곧 만나요! 🚀');
                }}
              >
                시작하기 →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 과제 상세 정보 (선택 시) */}
      {selectedTask && (
        <div className="task-detail-modal" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tasks.find((t) => t.id === selectedTask)?.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="close-button">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h4>과제 목표</h4>
                <p>{tasks.find((t) => t.id === selectedTask)?.description}</p>
              </div>

              <div className="detail-section">
                <h4>예상 효과</h4>
                <ul>
                  <li>특정 채점 기술의 집중 향상</li>
                  <li>즉시 피드백을 통한 빠른 학습</li>
                  <li>실전 채점 능력 개선</li>
                </ul>
              </div>

              <div className="detail-section">
                <h4>진행 방식</h4>
                <p>
                  1. 과제 시작 버튼 클릭
                  <br />
                  2. 제시된 문제 해결 (5-10분)
                  <br />
                  3. 즉시 피드백 확인 및 학습
                  <br />
                  4. 다음 과제로 이동 또는 재도전
                </p>
              </div>

              <button className="modal-start-button">과제 시작하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Blueprint 안내 */}
      <div className="info-section card">
        <h2>ℹ️ Blueprint v0.9 미세 조정 과제 안내</h2>
        <p className="info-description">
          이 과제들은 쓰기 평가 문식성의 특정 영역을 강화하기 위해 설계되었습니다.
          각 과제는 독립적으로 수행 가능하며, 자신의 약점에 맞는 과제를 선택하여
          집중적으로 훈련할 수 있습니다.
        </p>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">💡</div>
            <strong>Tip 1</strong>
            <p>개인 리포트에서 약점을 파악한 후 관련 과제를 선택하세요</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">💡</div>
            <strong>Tip 2</strong>
            <p>과제는 여러 번 반복 수행할 수 있습니다</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">💡</div>
            <strong>Tip 3</strong>
            <p>피드백을 주의 깊게 읽고 다음 채점에 적용하세요</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

