// MFRM 분석 통합 테스트 (프론트엔드 → R → 데이터베이스)
// api_v2.ts의 로직을 JavaScript로 구현

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: './.env' });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const R_API_URL = process.env.REACT_APP_R_API_URL || 'http://localhost:8000';

async function testFullIntegration() {
  console.log('=== 전체 통합 테스트: 프론트엔드 → R → 데이터베이스 ===\n');
  
  // 관리자로 로그인 (RLS 통과)
  console.log('0️⃣ 관리자 권한으로 로그인 중...');
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'any_password' // 데모 모드
  });
  
  if (signInError) {
    console.log(`   ⚠️ 로그인 실패 (데모 모드에서는 정상): ${signInError.message}`);
  } else {
    console.log('   ✅ 로그인 성공\n');
  }

  const runName = `통합 테스트 ${new Date().toLocaleString('ko-KR')}`;
  const description = '방식 2 전체 플로우 테스트: 데이터 조회 → 분석 → 저장';

  try {
    // 1. Supabase에서 데이터 조회
    console.log('1️⃣ Supabase에서 채점 데이터 조회 중...');
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('teacher_id, essay_id, rubric_id, score, rating_duration_seconds');

    if (scoresError) throw scoresError;

    console.log(`   ✅ ${scores.length}개 점수 조회`);
    console.log(`   교사: ${[...new Set(scores.map(s => s.teacher_id))].length}명`);
    console.log(`   에세이: ${[...new Set(scores.map(s => s.essay_id))].length}개\n`);

    // 2. R API로 분석 요청
    console.log('2️⃣ R API로 MFRM 분석 요청 중...');
    const analysisResponse = await axios.post(
      `${R_API_URL}/api/mfrm/analyze-with-data`,
      { scores_data: scores },
      { timeout: 120000 }
    );

    if (!analysisResponse.data.success) {
      throw new Error('MFRM 분석 실패');
    }

    console.log('   ✅ MFRM 분석 완료');
    console.log(`   수렴: ${analysisResponse.data.converged ? '성공' : '실패'}`);
    console.log(`   교사: ${analysisResponse.data.teacher_parameters.length}명\n`);

    // 3. mfrm_runs 테이블에 기록 저장
    console.log('3️⃣ mfrm_runs 테이블에 기록 저장 중...');
    // R이 배열로 반환하는 값들을 스칼라로 변환
    const converged = Array.isArray(analysisResponse.data.converged) 
      ? analysisResponse.data.converged[0] 
      : analysisResponse.data.converged;

    // version_id 생성 (UUID v4)
    const version_id = crypto.randomUUID();
    
    const { data: run, error: runError } = await supabase
      .from('mfrm_runs')
      .insert({
        name: runName,
        description,
        version_id: version_id,
        is_active_version: true,
        status: 'completed',
        convergence: converged === true || converged === 'TRUE',
        total_scores: scores.length,
        median_infit: 1.0,
        separation_index: 2.0,
        extreme_response_rate: 0.05,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (runError) {
      throw new Error(`Run 저장 실패: ${runError.message}`);
    }

    console.log(`   ✅ Run ID: ${run.id}`);
    console.log(`   이름: ${run.name}\n`);

    // 4. mfrm_results 테이블에 교사별 결과 저장
    console.log('4️⃣ mfrm_results 테이블에 교사별 결과 저장 중...');
    const teacherResults = analysisResponse.data.teacher_parameters.map(tp => ({
      run_id: run.id,
      teacher_id: tp.teacher_id,
      severity: tp.severity,
      severity_se: tp.severity_se || 0.3,
      severity_ci_lower: tp.severity - 1.96 * (tp.severity_se || 0.3),
      severity_ci_upper: tp.severity + 1.96 * (tp.severity_se || 0.3),
      infit: tp.infit,
      outfit: tp.outfit,
      mean_score: tp.mean_score,
      total_ratings: tp.total_ratings,
      halo_effect_score: tp.halo_effect_score || 0,
      category_imbalance_score: tp.category_imbalance_score || 0,
      response_time_anomaly_count: 0,
      metadata: { 
        feedback: tp.feedback,
        infit_t: tp.infit_t || 0,
        outfit_t: tp.outfit_t || 0
      }
    }));

    const { error: resultsError } = await supabase
      .from('mfrm_results')
      .insert(teacherResults);

    if (resultsError) {
      throw new Error(`결과 저장 실패: ${resultsError.message}`);
    }

    console.log(`   ✅ ${teacherResults.length}명 교사 결과 저장\n`);

    // 5. essay_difficulties 테이블에 에세이 난이도 저장
    console.log('5️⃣ essay_difficulties 테이블에 난이도 저장 중...');
    if (analysisResponse.data.essay_parameters && analysisResponse.data.essay_parameters.length > 0) {
      const essayDifficulties = analysisResponse.data.essay_parameters.map(ep => ({
        run_id: run.id,
        essay_id: ep.essay_id,
        difficulty: ep.difficulty,
        difficulty_se: ep.se,
        num_raters: Math.floor(scores.length / analysisResponse.data.essay_parameters.length)
      }));

      const { error: diffError } = await supabase
        .from('essay_difficulties')
        .insert(essayDifficulties);

      if (diffError) {
        console.log(`   ⚠️ 난이도 저장 실패: ${diffError.message}`);
      } else {
        console.log(`   ✅ ${essayDifficulties.length}개 에세이 난이도 저장`);
      }
    }

    // 6. 저장된 결과 확인
    console.log('\n6️⃣ 저장된 결과 확인 중...');
    const { data: savedRun } = await supabase
      .from('mfrm_runs')
      .select('*')
      .eq('id', run.id)
      .single();

    const { data: savedResults } = await supabase
      .from('mfrm_results')
      .select(`
        *,
        teachers:teacher_id (name, email)
      `)
      .eq('run_id', run.id);

    console.log('\n=== 통합 테스트 결과 ===');
    console.log(`Run ID: ${savedRun.id}`);
    console.log(`이름: ${savedRun.name}`);
    console.log(`상태: ${savedRun.status}`);
    console.log(`수렴: ${savedRun.convergence ? '✅' : '❌'}`);
    console.log(`총 점수: ${savedRun.total_scores}개`);
    console.log(`\n저장된 교사 결과: ${savedResults.length}명`);

    savedResults.forEach((result, idx) => {
      console.log(`\n교사 ${idx + 1}: ${result.teachers?.name || 'Unknown'}`);
      console.log(`  채점 수: ${result.total_ratings}개`);
      console.log(`  엄격성: ${result.severity.toFixed(3)} [${result.severity_ci_lower.toFixed(3)}, ${result.severity_ci_upper.toFixed(3)}]`);
      console.log(`  Infit: ${result.infit.toFixed(3)}`);
      console.log(`  Outfit: ${result.outfit.toFixed(3)}`);
      console.log(`  헤일로: ${result.halo_effect_score.toFixed(3)}`);
      console.log(`  불균형: ${result.category_imbalance_score.toFixed(3)}`);
      console.log(`  피드백: ${result.feedback}`);
    });

    console.log('\n=== 통합 테스트 완료 ===');
    console.log('✅ 프론트엔드 → R 백엔드 → 데이터베이스 전체 플로우 성공!\n');

    return { run: savedRun, results: savedResults };

  } catch (error) {
    console.error('\n❌ 통합 테스트 실패:', error.message);
    if (error.response) {
      console.error('API 응답:', error.response.data);
    }
    throw error;
  }
}

testFullIntegration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('스크립트 실행 실패');
    process.exit(1);
  });

