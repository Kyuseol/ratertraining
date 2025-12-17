// MFRM 분석 테스트 (R 백엔드 사용, 데이터베이스 우회)
// Supabase에서 데이터를 가져와 R API로 전송

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: './.env' });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const R_API_URL = process.env.REACT_APP_R_API_URL || 'http://localhost:8000';

async function testMFRMWithR() {
  console.log('=== R 백엔드를 사용한 MFRM 분석 테스트 ===\n');

  try {
    // 1. Supabase에서 데이터 조회
    console.log('1️⃣ Supabase에서 채점 데이터 조회 중...');
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('teacher_id, essay_id, rubric_id, score');

    if (scoresError) throw scoresError;

    console.log(`   ✅ ${scores.length}개 점수 조회 완료`);
    console.log(`   교사: ${[...new Set(scores.map(s => s.teacher_id))].length}명`);
    console.log(`   에세이: ${[...new Set(scores.map(s => s.essay_id))].length}개`);
    console.log(`   루브릭: ${[...new Set(scores.map(s => s.rubric_id))].length}개\n`);

    // 2. R 백엔드 Health Check
    console.log('2️⃣ R 백엔드 연결 확인 중...');
    try {
      const healthResponse = await axios.get(`${R_API_URL}/health`);
      console.log(`   ✅ R 백엔드 연결 성공 (${healthResponse.data.service})`);
      console.log(`   R 버전: ${healthResponse.data.r_version}\n`);
    } catch (error) {
      console.error('   ❌ R 백엔드에 연결할 수 없습니다.');
      console.error(`   URL: ${R_API_URL}`);
      console.error(`   에러: ${error.message}`);
      console.error('\n   R 백엔드를 시작하세요:');
      console.error('   cd backend');
      console.error('   Rscript -e "pr <- plumber::plumb(\'fluber.R\'); pr$run(host=\'0.0.0.0\', port=8000)"\n');
      return;
    }

    // 3. R API로 MFRM 분석 요청
    console.log('3️⃣ R API로 MFRM 분석 요청 중...');
    console.log('   (TAM 패키지가 분석 중입니다... 최대 1분 소요)');

    const analysisResponse = await axios.post(
      `${R_API_URL}/api/mfrm/analyze-with-data`,
      {
        scores_data: scores
      },
      {
        timeout: 120000, // 2분
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!analysisResponse.data.success) {
      throw new Error('MFRM 분석 실패');
    }

    console.log('   ✅ MFRM 분석 완료!\n');

    // 4. 결과 출력
    const result = analysisResponse.data;

    console.log('=== MFRM 분석 결과 ===\n');

    console.log(`수렴 상태: ${result.converged ? '✅ 수렴 성공' : '❌ 수렴 실패'}`);
    console.log(`분석 점수: ${result.summary.total_scores}개`);
    console.log(`교사: ${result.summary.num_teachers}명`);
    console.log(`에세이: ${result.summary.num_essays}개`);
    console.log(`루브릭: ${result.summary.num_rubrics}개`);
    console.log(`\n모델 적합도:`);
    console.log(`  Deviance: ${Number(result.fit_statistics.deviance).toFixed(2)}`);
    console.log(`  AIC: ${Number(result.fit_statistics.aic).toFixed(2)}`);
    console.log(`  BIC: ${Number(result.fit_statistics.bic).toFixed(2)}`);
    console.log(`  반복: ${result.fit_statistics.iterations}회\n`);

    // 5. 교사별 파라미터
    console.log('=== 교사별 MFRM 파라미터 ===\n');

    // 교사 이름 조회
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, name, email');

    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = t;
    });

    result.teacher_parameters.forEach((teacher, index) => {
      const teacherInfo = teacherMap[teacher.teacher_id] || { name: 'Unknown', email: '' };
      
      console.log(`교사 ${index + 1}: ${teacherInfo.name} (${teacherInfo.email})`);
      console.log(`  채점 수: ${teacher.total_ratings}개`);
      console.log(`  평균 점수: ${teacher.mean_score.toFixed(2)}`);
      console.log(`  엄격성 (Severity): ${teacher.severity.toFixed(3)} (SE: ${teacher.severity_se.toFixed(3)}) ${getSeverityLabel(teacher.severity)}`);
      console.log(`  일관성 (Infit): ${teacher.infit.toFixed(3)} ${getConsistencyLabel(teacher.infit)}`);
      console.log(`  일관성 (Outfit): ${teacher.outfit.toFixed(3)} ${getConsistencyLabel(teacher.outfit)}`);
      console.log(`  헤일로 효과: ${(teacher.halo_effect_score || 0).toFixed(3)} ${getHaloLabel(teacher.halo_effect_score)}`);
      console.log(`  범주 불균형: ${teacher.category_imbalance_score.toFixed(3)} ${getImbalanceLabel(teacher.category_imbalance_score)}`);
      console.log(`  피드백: ${teacher.feedback}`);
      console.log('');
    });

    console.log('=== MFRM 분석 테스트 완료 ===');
    console.log('✅ R 백엔드를 사용한 실제 TAM 패키지 분석이 성공적으로 완료되었습니다!\n');

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    if (error.response) {
      console.error('API 응답:', error.response.data);
    }
  }
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
  if (!halo) return '(N/A)';
  if (halo > 0.7) return '(높음 ❌)';
  if (halo > 0.5) return '(주의 ⚠️)';
  return '(낮음 ✅)';
}

function getImbalanceLabel(imbalance) {
  if (imbalance > 0.7) return '(높음 ❌)';
  if (imbalance > 0.5) return '(주의 ⚠️)';
  return '(균형 ✅)';
}

testMFRMWithR()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });

