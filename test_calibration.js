/**
 * 전문가 5명 MFRM 캘리브레이션 테스트
 * Node.js로 R API 호출
 */

const R_API_URL = 'http://localhost:8000';

// 테스트 데이터 생성
function generateTestData() {
  const experts = ['expert_1', 'expert_2', 'expert_3', 'expert_4', 'expert_5'];
  const essays = Array.from({ length: 24 }, (_, i) => `essay_${i + 1}`);
  const rubrics = Array.from({ length: 8 }, (_, i) => `rubric_${i + 1}`);

  // 전문가별 엄격성 (양수 = 관대, 음수 = 엄격)
  const expertSeverity = {
    expert_1: 0.0,    // 중립
    expert_2: -0.5,   // 엄격
    expert_3: 0.2,    // 약간 관대
    expert_4: 0.5,    // 관대
    expert_5: -0.2    // 약간 엄격
  };

  // 에세이별 난이도 (랜덤 생성)
  const essayDifficulty = {};
  essays.forEach(e => {
    essayDifficulty[e] = (Math.random() - 0.5) * 3; // -1.5 ~ 1.5
  });

  const scores = [];

  experts.forEach(expert => {
    essays.forEach(essay => {
      rubrics.forEach(rubric => {
        // logit 계산
        const logit = -expertSeverity[expert] - essayDifficulty[essay] + (Math.random() - 0.5) * 0.6;
        const prob = 1 / (1 + Math.exp(-logit));

        // 3점 척도로 변환
        let score;
        if (prob < 0.33) score = 1;
        else if (prob < 0.67) score = 2;
        else score = 3;

        scores.push({
          expert_id: expert,
          essay_id: essay,
          rubric_id: rubric,
          score: score
        });
      });
    });
  });

  return { scores, expertSeverity, essayDifficulty };
}

async function runCalibrationTest() {
  console.log('='.repeat(60));
  console.log('전문가 5명 MFRM 캘리브레이션 테스트');
  console.log('='.repeat(60));
  console.log();

  // 테스트 데이터 생성
  console.log('=== 테스트 데이터 생성 ===');
  const { scores, expertSeverity, essayDifficulty } = generateTestData();
  
  console.log(`전문가: 5명`);
  console.log(`에세이: 24편`);
  console.log(`평가요소: 8개`);
  console.log(`총 관측치: ${scores.length}개`);
  console.log();

  console.log('전문가 엄격성 (진짜 값):');
  Object.entries(expertSeverity).forEach(([k, v]) => {
    const label = v < -0.3 ? '(엄격)' : v > 0.3 ? '(관대)' : '(중립)';
    console.log(`  ${k}: ${v >= 0 ? '+' : ''}${v.toFixed(2)} ${label}`);
  });
  console.log();

  // 점수 분포 확인
  const scoreCounts = { 1: 0, 2: 0, 3: 0 };
  scores.forEach(s => scoreCounts[s.score]++);
  console.log('점수 분포:');
  console.log(`  1점: ${scoreCounts[1]} (${(scoreCounts[1] / scores.length * 100).toFixed(1)}%)`);
  console.log(`  2점: ${scoreCounts[2]} (${(scoreCounts[2] / scores.length * 100).toFixed(1)}%)`);
  console.log(`  3점: ${scoreCounts[3]} (${(scoreCounts[3] / scores.length * 100).toFixed(1)}%)`);
  console.log();

  // 전문가별 평균
  console.log('전문가별 평균 점수:');
  Object.keys(expertSeverity).forEach(expert => {
    const expertScores = scores.filter(s => s.expert_id === expert).map(s => s.score);
    const mean = expertScores.reduce((a, b) => a + b, 0) / expertScores.length;
    console.log(`  ${expert}: ${mean.toFixed(2)}`);
  });
  console.log();

  // API 호출
  console.log('='.repeat(60));
  console.log('R API 캘리브레이션 호출');
  console.log('='.repeat(60));
  console.log();

  try {
    console.log(`POST ${R_API_URL}/api/calibration/run-expert`);
    console.log('요청 중...');
    
    const response = await fetch(`${R_API_URL}/api/calibration/run-expert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expert_scores: scores
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log();
    console.log('=== 캘리브레이션 결과 ===');
    console.log(`성공: ${result.success}`);
    console.log(`수렴: ${result.converged}`);
    console.log(`방법: ${result.method}`);
    console.log(`분리 신뢰도: ${(result.separation_reliability * 100).toFixed(1)}%`);
    console.log();

    console.log('--- 요약 ---');
    console.log(`총 전문가: ${result.summary.total_experts}명`);
    console.log(`총 에세이: ${result.summary.total_essays}편`);
    console.log(`총 관측치: ${result.summary.total_observations}개`);
    console.log(`난이도 평균: ${result.summary.mean_difficulty.toFixed(3)}`);
    console.log(`난이도 SD: ${result.summary.sd_difficulty.toFixed(3)}`);
    console.log();

    if (result.essay_parameters && result.essay_parameters.length > 0) {
      console.log('--- 에세이 파라미터 (상위 5개) ---');
      const sortedEssays = [...result.essay_parameters].sort((a, b) => b.difficulty_logit - a.difficulty_logit);
      sortedEssays.slice(0, 5).forEach(e => {
        console.log(`  ${e.essay_id}: diff=${e.difficulty_logit.toFixed(2)}, SE=${e.difficulty_se.toFixed(2)}, mean=${e.mean_score.toFixed(2)}`);
      });
      console.log('--- 에세이 파라미터 (하위 5개) ---');
      sortedEssays.slice(-5).forEach(e => {
        console.log(`  ${e.essay_id}: diff=${e.difficulty_logit.toFixed(2)}, SE=${e.difficulty_se.toFixed(2)}, mean=${e.mean_score.toFixed(2)}`);
      });
      console.log();
    }

    if (result.expert_parameters && result.expert_parameters.length > 0) {
      console.log('--- 전문가 파라미터 ---');
      result.expert_parameters.forEach(e => {
        const trueSev = expertSeverity[e.expert_id];
        console.log(`  ${e.expert_id}: 추정=${e.severity.toFixed(2)}, 진짜=${trueSev.toFixed(2)}, 평균점수=${e.mean_score.toFixed(2)}`);
      });
      console.log();

      // 상관계수 계산
      const estimated = result.expert_parameters.map(e => e.severity);
      const actual = result.expert_parameters.map(e => expertSeverity[e.expert_id]);
      const correlation = calculateCorrelation(estimated, actual);
      console.log(`전문가 엄격성 추정-진짜 상관계수: ${correlation.toFixed(3)}`);
    }

    console.log();
    console.log('✅ 테스트 완료!');

  } catch (error) {
    console.error();
    console.error('❌ API 호출 실패:', error.message);
    console.error();
    console.error('R Backend가 실행 중인지 확인해주세요:');
    console.error('  cd backend');
    console.error('  Rscript -e "plumber::plumb(\'fluber.R\')$run(host=\'0.0.0.0\', port=8000)"');
  }

  console.log();
  console.log('='.repeat(60));
}

// 상관계수 계산
function calculateCorrelation(x, y) {
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  
  return numerator / Math.sqrt(denomX * denomY);
}

// 실행
runCalibrationTest();

