// ============================================================================
// 샘플 데이터 추가 스크립트 (Node.js)
// ============================================================================
// 실행: node add_sample_data.js
// 목적: MFRM 분석 테스트를 위한 충분한 샘플 데이터 생성
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

// Supabase 클라이언트 생성
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수를 찾을 수 없습니다.');
  console.error('.env 파일에 REACT_APP_SUPABASE_URL과 REACT_APP_SUPABASE_ANON_KEY를 설정하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 샘플 데이터 추가 시작 ===\n');

  try {
    // 1. 현재 상태 확인
    console.log('1️⃣ 현재 데이터 확인 중...');
    const { data: currentScores } = await supabase.from('scores').select('id');
    const { data: currentTeachers } = await supabase.from('teachers').select('id').eq('is_active', true);
    const { data: currentEssays } = await supabase.from('essays').select('id').eq('is_active', true);
    
    console.log(`   점수: ${currentScores?.length || 0}개`);
    console.log(`   교사: ${currentTeachers?.length || 0}명`);
    console.log(`   에세이: ${currentEssays?.length || 0}개\n`);

    // 2. 추가 에세이 생성
    console.log('2️⃣ 추가 에세이 생성 중...');
    const newEssays = [
      {
        title: '에세이 4: 환경 보호의 중요성',
        prompt: '환경 보호가 왜 중요한지 설명하고, 우리가 실천할 수 있는 방법을 제시하시오.',
        content: '환경 보호는 우리의 미래를 위해 매우 중요한 과제입니다.\n\n첫째, 지구 온난화로 인해 극지방의 빙하가 녹고 있습니다. 이는 해수면 상승으로 이어져 해안 지역이 침수될 위험이 있습니다. 또한 기후 변화로 인해 이상 기후 현상이 빈번하게 발생하고 있습니다.\n\n둘째, 생물 다양성이 감소하고 있습니다. 많은 동식물들이 서식지 파괴로 멸종 위기에 처해 있습니다. 생태계의 균형이 무너지면 인간도 큰 피해를 입을 수 있습니다.\n\n우리가 실천할 수 있는 방법으로는 일회용품 사용을 줄이고, 대중교통을 이용하며, 재활용을 생활화하는 것이 있습니다. 작은 실천이 모여 큰 변화를 만들 수 있습니다.',
        grade_level: 'high',
        is_active: true,
        is_anchor: false,
        is_calibration: true
      },
      {
        title: '에세이 5: 독서의 즐거움',
        prompt: '독서가 주는 즐거움에 대해 자신의 경험을 바탕으로 서술하시오.',
        content: '나는 책 읽는 것을 좋아한다. 책을 읽으면 새로운 세계를 경험할 수 있다.\n\n특히 판타지 소설을 읽을 때가 가장 재미있다. 주인공이 되어 모험을 떠나는 상상을 하면 정말 신난다. 해리포터 시리즈를 읽을 때는 마법학교에 다니는 기분이었다.\n\n또 책을 읽으면 지식도 늘어난다. 과학책을 읽으면 우주나 동물에 대해 알게 된다. 역사책을 읽으면 옛날 사람들의 삶을 알 수 있다.\n\n친구들도 책을 많이 읽었으면 좋겠다. 게임만 하지 말고 책도 읽으면 더 재미있을 것이다.',
        grade_level: 'middle',
        is_active: true,
        is_anchor: false,
        is_calibration: true
      },
      {
        title: '에세이 6: 인공지능의 윤리적 문제',
        prompt: '인공지능 기술의 발전에 따른 윤리적 문제를 논하고, 해결 방안을 제시하시오.',
        content: '인공지능 기술이 급속도로 발전하면서 다양한 윤리적 문제가 대두되고 있다. 이는 단순한 기술적 이슈를 넘어 인간 사회의 근본적인 가치와 관련된 중대한 문제이다.\n\n첫째, 알고리즘의 편향성 문제가 있다. AI는 학습 데이터의 편향을 그대로 반영하여 특정 집단에 대한 차별을 재생산할 수 있다. 예를 들어, 채용 AI가 과거 데이터를 학습하여 성별이나 인종에 따른 편향된 결정을 내릴 수 있다. 이는 평등권 침해로 이어질 수 있다.\n\n둘째, 개인정보 보호와 프라이버시 침해 문제가 심각하다. AI 시스템은 방대한 개인 데이터를 수집하고 분석하는데, 이 과정에서 개인의 사생활이 침해될 수 있다. 안면 인식 기술이나 행동 패턴 분석은 개인의 동의 없이 감시 사회를 만들 위험이 있다.\n\n넷째, 일자리 대체로 인한 사회경제적 불평등 심화가 우려된다. AI가 많은 직업을 대체하면서 대량 실업이 발생할 수 있으며, 이는 사회적 양극화를 더욱 심화시킬 것이다.\n\n이러한 문제들을 해결하기 위해서는 다층적인 접근이 필요하다. 우선, 명확한 AI 윤리 가이드라인과 법적 규제가 마련되어야 한다. 유럽연합의 AI Act와 같이 위험도에 따른 단계별 규제가 효과적일 수 있다. 또한 AI 개발 과정에서 다양한 이해관계자의 참여를 보장하여 편향을 최소화해야 한다.',
        grade_level: 'high',
        is_active: true,
        is_anchor: true,
        is_calibration: true,
        anchor_explanation: '이 에세이는 복잡한 사회 문제를 다각도로 분석하고 구체적인 해결 방안을 제시합니다. 주장의 명료성(3점), 근거의 타당성(3점), 논리적 전개(3점) 영역에서 경계 사례로 활용 가능합니다.'
      }
    ];

    const { data: insertedEssays, error: essayError } = await supabase
      .from('essays')
      .insert(newEssays)
      .select();

    if (essayError) {
      // 이미 존재하는 에세이일 경우 무시
      console.log(`   ⚠️ 에세이 추가 건너뜀: ${essayError.message.substring(0, 100)}`);
      // 기존 에세이 조회
      const { data: existingEssays } = await supabase
        .from('essays')
        .select('*')
        .in('title', newEssays.map(e => e.title));
      console.log(`   ✅ 기존 에세이 ${existingEssays?.length || 0}개 사용\n`);
    } else {
      console.log(`   ✅ 에세이 ${insertedEssays?.length || 0}개 추가 완료\n`);
    }

    // 3. 교사, 에세이, 루브릭 ID 조회
    console.log('3️⃣ 교사, 에세이, 루브릭 정보 조회 중...');
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, email, name')
      .eq('is_active', true);

    const { data: essays } = await supabase
      .from('essays')
      .select('id, title')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    const { data: rubrics } = await supabase
      .from('rubrics')
      .select('id, name')
      .eq('is_active', true);

    console.log(`   교사: ${teachers?.length || 0}명`);
    console.log(`   에세이: ${essays?.length || 0}개`);
    console.log(`   루브릭: ${rubrics?.length || 0}개\n`);

    if (!teachers || teachers.length < 3) {
      console.error('❌ 교사가 부족합니다. 최소 3명 필요');
      return;
    }

    if (!essays || essays.length < 4) {
      console.error('❌ 에세이가 부족합니다. 최소 4개 필요');
      return;
    }

    if (!rubrics || rubrics.length < 9) {
      console.error('❌ 루브릭이 부족합니다. 9개 필요');
      return;
    }

    // 4. 추가 채점 데이터 생성
    console.log('4️⃣ 추가 채점 데이터 생성 중...');
    const scoresToInsert = [];
    const randomScore = () => Math.floor(Math.random() * 3) + 1; // 1, 2, 3
    const randomDuration = () => Math.floor(Math.random() * 120) + 30; // 30-150초

    // Teacher 1: 에세이 1, 2, 3 채점 (각 9개 루브릭 = 27개 점수)
    for (let essayIdx = 0; essayIdx < Math.min(3, essays.length); essayIdx++) {
      for (const rubric of rubrics) {
        scoresToInsert.push({
          teacher_id: teachers[0].id,
          essay_id: essays[essayIdx].id,
          rubric_id: rubric.id,
          score: randomScore(),
          rating_duration_seconds: randomDuration()
        });
      }
    }

    // Teacher 2: 에세이 2, 3, 4 채점 (27개 점수)
    for (let essayIdx = 1; essayIdx < Math.min(4, essays.length); essayIdx++) {
      for (const rubric of rubrics) {
        scoresToInsert.push({
          teacher_id: teachers[1].id,
          essay_id: essays[essayIdx].id,
          rubric_id: rubric.id,
          score: randomScore(),
          rating_duration_seconds: randomDuration()
        });
      }
    }

    // Teacher 3: 에세이 1, 4, 5 채점 (27개 점수)
    for (let essayIdx of [0, 3, 4]) {
      if (essays[essayIdx]) {
        for (const rubric of rubrics) {
          scoresToInsert.push({
            teacher_id: teachers[2].id,
            essay_id: essays[essayIdx].id,
            rubric_id: rubric.id,
            score: randomScore(),
            rating_duration_seconds: randomDuration()
          });
        }
      }
    }

    console.log(`   생성할 점수: ${scoresToInsert.length}개`);

    // UPSERT로 중복 처리
    const { error: scoresError } = await supabase
      .from('scores')
      .upsert(scoresToInsert, {
        onConflict: 'teacher_id,essay_id,rubric_id',
        ignoreDuplicates: false
      });

    if (scoresError) {
      console.error(`   ❌ 점수 추가 실패: ${scoresError.message}\n`);
    } else {
      console.log(`   ✅ 점수 추가 완료\n`);
    }

    // 5. 최종 결과 확인
    console.log('5️⃣ 최종 결과 확인 중...');
    const { data: finalScores } = await supabase.from('scores').select('id');
    const { data: finalEssays } = await supabase.from('essays').select('id, is_anchor, is_calibration').eq('is_active', true);
    const anchorCount = finalEssays?.filter(e => e.is_anchor).length || 0;
    const calibrationCount = finalEssays?.filter(e => e.is_calibration).length || 0;

    console.log('\n=== 샘플 데이터 추가 완료 ===');
    console.log(`총 점수: ${finalScores?.length || 0}개 ${(finalScores?.length || 0) >= 30 ? '✅ MFRM 분석 가능' : '❌ MFRM 분석 불가능'}`);
    console.log(`총 교사: ${teachers?.length || 0}명`);
    console.log(`총 에세이: ${finalEssays?.length || 0}개`);
    console.log(`앵커 에세이: ${anchorCount}개 / 12-16개 ${anchorCount >= 12 ? '✅' : '❌'}`);
    console.log(`캘리브레이션 에세이: ${calibrationCount}개 / 24-32개 ${calibrationCount >= 24 ? '✅' : '❌'}`);
    console.log('\n다음 단계:');
    console.log('1. R 백엔드 실행: cd backend && Rscript -e "pr <- plumber::plumb(\'fluber.R\'); pr$run(host=\'0.0.0.0\', port=8000)"');
    console.log('2. 브라우저에서 MFRM 분석 실행');
    console.log('3. 교사 리포트 확인\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

