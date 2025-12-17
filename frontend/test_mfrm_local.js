// 로컬 MFRM 분석 테스트 (데이터베이스 연결 우회)
// R 백엔드 없이 Supabase에서 직접 데이터를 가져와 분석 시뮬레이션

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function simulateMFRMAnalysis() {
  console.log('=== MFRM 분석 시뮬레이션 시작 ===\n');

  try {
    // 1. 데이터 수집
    console.log('1️⃣ 채점 데이터 조회 중...');
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select(`
        id,
        teacher_id,
        essay_id,
        rubric_id,
        score,
        rating_duration_seconds,
        teachers:teacher_id (name, email),
        essays:essay_id (title),
        rubrics:rubric_id (name)
      `);

    if (scoresError) throw scoresError;

    console.log(`   ✅ 총 ${scores.length}개 점수 조회 완료`);
    console.log(`   교사: ${[...new Set(scores.map(s => s.teacher_id))].length}명`);
    console.log(`   에세이: ${[...new Set(scores.map(s => s.essay_id))].length}개`);
    console.log(`   루브릭: ${[...new Set(scores.map(s => s.rubric_id))].length}개\n`);

    // 2. 기초 통계 계산
    console.log('2️⃣ 기초 통계 계산 중...');
    
    const teacherStats = {};
    scores.forEach(score => {
      const tid = score.teacher_id;
      if (!teacherStats[tid]) {
        teacherStats[tid] = {
          teacher_id: tid,
          teacher_name: score.teachers?.name || 'Unknown',
          teacher_email: score.teachers?.email || '',
          scores: [],
          total_ratings: 0,
          mean_score: 0,
          // 시뮬레이션된 MFRM 파라미터
          severity: 0,
          infit: 1.0,
          outfit: 1.0,
          halo_effect_score: 0,
          category_imbalance_score: 0
        };
      }
      teacherStats[tid].scores.push(score.score);
      teacherStats[tid].total_ratings++;
    });

    // 3. 교사별 파라미터 계산 (간단한 시뮬레이션)
    console.log('3️⃣ MFRM 파라미터 시뮬레이션 중...\n');
    
    Object.values(teacherStats).forEach(teacher => {
      // 평균 점수
      teacher.mean_score = teacher.scores.reduce((a, b) => a + b, 0) / teacher.scores.length;
      
      // 엄격성 (Severity): 평균 점수를 로짓으로 변환
      // 낮은 평균 = 더 엄격 (양수), 높은 평균 = 더 관대 (음수)
      teacher.severity = (2.0 - teacher.mean_score) * 0.5 + (Math.random() - 0.5) * 0.3;
      
      // 일관성 (Infit/Outfit): 1.0 근처가 이상적
      const variance = teacher.scores.reduce((sum, score) => {
        return sum + Math.pow(score - teacher.mean_score, 2);
      }, 0) / teacher.scores.length;
      
      teacher.infit = 0.8 + variance * 0.2 + (Math.random() - 0.5) * 0.2;
      teacher.outfit = teacher.infit + (Math.random() - 0.5) * 0.1;
      
      // 헤일로 효과 (0-1, 낮을수록 좋음)
      teacher.halo_effect_score = Math.random() * 0.3;
      
      // 범주 불균형 (0-1, 낮을수록 좋음)
      const scoreCounts = [0, 0, 0, 0]; // [0, 1, 2, 3]
      teacher.scores.forEach(s => scoreCounts[s]++);
      const maxCount = Math.max(...scoreCounts);
      const minCount = Math.min(...scoreCounts.filter(c => c > 0));
      teacher.category_imbalance_score = minCount === 0 ? 1.0 : (maxCount - minCount) / maxCount;
      
      // 피드백 생성
      teacher.feedback = generateFeedback(teacher);
    });

    // 4. 결과 출력
    console.log('=== MFRM 분석 결과 ===\n');
    Object.values(teacherStats).forEach((teacher, index) => {
      console.log(`교사 ${index + 1}: ${teacher.teacher_name} (${teacher.teacher_email})`);
      console.log(`  채점 수: ${teacher.total_ratings}개`);
      console.log(`  평균 점수: ${teacher.mean_score.toFixed(2)}`);
      console.log(`  엄격성 (Severity): ${teacher.severity.toFixed(3)} ${getSeverityLabel(teacher.severity)}`);
      console.log(`  일관성 (Infit): ${teacher.infit.toFixed(3)} ${getConsistencyLabel(teacher.infit)}`);
      console.log(`  일관성 (Outfit): ${teacher.outfit.toFixed(3)} ${getConsistencyLabel(teacher.outfit)}`);
      console.log(`  헤일로 효과: ${teacher.halo_effect_score.toFixed(3)} ${getHaloLabel(teacher.halo_effect_score)}`);
      console.log(`  범주 불균형: ${teacher.category_imbalance_score.toFixed(3)} ${getImbalanceLabel(teacher.category_imbalance_score)}`);
      console.log(`  피드백: ${teacher.feedback}`);
      console.log('');
    });

    // 5. 데이터베이스에 결과 저장 (선택사항)
    console.log('5️⃣ 결과를 데이터베이스에 저장할까요? (Y/N)');
    console.log('   (이것은 시뮬레이션이므로 저장하지 않습니다)\n');

    console.log('=== MFRM 분석 시뮬레이션 완료 ===');
    console.log('✅ 실제 R 백엔드 연결이 복구되면 정확한 MFRM 분석이 실행됩니다.\n');

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
  }
}

function generateFeedback(teacher) {
  const feedbacks = [];
  
  if (Math.abs(teacher.severity) > 0.5) {
    if (teacher.severity > 0) {
      feedbacks.push('엄격한 채점 경향');
    } else {
      feedbacks.push('관대한 채점 경향');
    }
  } else {
    feedbacks.push('적정한 엄격성');
  }
  
  if (teacher.infit > 1.3 || teacher.outfit > 1.3) {
    feedbacks.push('일관성 개선 필요');
  } else if (teacher.infit < 0.7 || teacher.outfit < 0.7) {
    feedbacks.push('과도하게 일관적 (재검토 필요)');
  } else {
    feedbacks.push('일관성 양호');
  }
  
  if (teacher.halo_effect_score > 0.3) {
    feedbacks.push('헤일로 효과 주의');
  }
  
  if (teacher.category_imbalance_score > 0.5) {
    feedbacks.push('범주 사용 불균형');
  }
  
  return feedbacks.join(', ');
}

function getSeverityLabel(severity) {
  if (severity > 0.5) return '(엄격 ⚠️)';
  if (severity > 0.2) return '(약간 엄격)';
  if (severity < -0.5) return '(관대 ⚠️)';
  if (severity < -0.2) return '(약간 관대)';
  return '(적정 ✅)';
}

function getConsistencyLabel(fit) {
  if (fit > 1.3) return '(불일치 ❌)';
  if (fit > 1.2) return '(주의 ⚠️)';
  if (fit < 0.7) return '(과적합 ⚠️)';
  return '(양호 ✅)';
}

function getHaloLabel(halo) {
  if (halo > 0.5) return '(높음 ❌)';
  if (halo > 0.3) return '(주의 ⚠️)';
  return '(낮음 ✅)';
}

function getImbalanceLabel(imbalance) {
  if (imbalance > 0.7) return '(높음 ❌)';
  if (imbalance > 0.5) return '(주의 ⚠️)';
  return '(균형 ✅)';
}

simulateMFRMAnalysis()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });

