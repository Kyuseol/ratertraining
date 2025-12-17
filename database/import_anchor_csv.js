/**
 * anchor.csv 파일을 데이터베이스에 임포트하는 스크립트
 * 
 * CSV 구조:
 * - label: 에세이 난이도 (high/middle/low)
 * - SID: 학생 ID (에세이 ID로 매핑)
 * - RID: 채점자 ID (전문가 채점자 ID로 매핑)
 * - C1-E2: 평가 요소별 채점값 (11개)
 * 
 * 매핑:
 * - C1 → 주장 (display_order 1)
 * - C2 → 이유 (display_order 2)
 * - C3 → 근거 (display_order 3)
 * - C4 → 무시 (현재 시스템에 없음)
 * - O1 → 통일성 (display_order 4)
 * - O2 → 응집성 (display_order 5)
 * - O3 → 완결성 (display_order 6)
 * - E1 → 어휘·문장 적절성 (display_order 7)
 * - E2 → 어문 규범 준수 (display_order 8)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 환경 변수에서 Supabase 정보 가져오기
require('dotenv').config({ path: path.join(__dirname, '../frontend/.env') });

// frontend 디렉토리로 이동하여 패키지 사용
process.chdir(path.join(__dirname, '../frontend'));

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('frontend/.env 파일에 REACT_APP_SUPABASE_URL과 REACT_APP_SUPABASE_ANON_KEY를 설정해주세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CSV 파일 경로 (원본 경로 유지)
const csvPath = path.join(__dirname, '../../내 드라이브/1 소논문 쓰기/00 MFRM 쓰기 평가 문식성 연습 앱/anchor.csv');

// 루브릭 매핑 (display_order 기준)
const RUBRIC_MAPPING = {
  'C1': 1,  // 주장
  'C2': 2,  // 이유
  'C3': 3,  // 근거
  'C4': null, // 현재 시스템에 없음 (무시)
  'O1': 4,  // 통일성
  'O2': 5,  // 응집성
  'O3': 6,  // 완결성
  'E1': 7,  // 어휘·문장 적절성
  'E2': 8,  // 어문 규범 준수
};

// CSV 파싱 함수
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim();
    });
    data.push(row);
  }

  return data;
}

// 루브릭 ID 매핑 가져오기
async function getRubricMapping() {
  const { data: rubrics, error } = await supabase
    .from('rubrics')
    .select('id, display_order, name')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    throw new Error(`루브릭 조회 실패: ${error.message}`);
  }

  const mapping = {};
  rubrics.forEach(rubric => {
    mapping[rubric.display_order] = rubric.id;
  });

  console.log('✅ 루브릭 매핑 완료:');
  rubrics.forEach(r => {
    console.log(`   ${r.display_order}. ${r.name} (${r.id})`);
  });

  return mapping;
}

// 전문가 채점자 생성 또는 조회
async function getOrCreateExpertRater(rid) {
  // 기존 전문가 조회
  const { data: existing, error: searchError } = await supabase
    .from('expert_raters')
    .select('*')
    .eq('metadata->>rid', rid)
    .single();

  if (existing) {
    return existing;
  }

  // 새 전문가 생성
  const { data: newExpert, error: createError } = await supabase
    .from('expert_raters')
    .insert({
      name: `전문가 채점자 ${rid}`,
      email: `expert_${rid}@example.com`,
      institution: '전문가 패널',
      expertise_area: '쓰기 평가',
      is_active: true,
      metadata: { rid: rid.toString() }
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`전문가 채점자 생성 실패 (RID: ${rid}): ${createError.message}`);
  }

  console.log(`✅ 전문가 채점자 생성: RID ${rid} → ${newExpert.id}`);
  return newExpert;
}

// 에세이 생성 또는 조회 (SID 기반)
async function getOrCreateEssay(sid, label) {
  // 기존 에세이 조회 (metadata에 sid 저장)
  const { data: existing, error: searchError } = await supabase
    .from('essays')
    .select('*')
    .eq('metadata->>sid', sid)
    .single();

  if (existing) {
    return existing;
  }

  // 새 에세이 생성
  const difficultyMap = {
    'high': 'high',
    'middle': 'medium',
    'low': 'low'
  };

  const { data: newEssay, error: createError } = await supabase
    .from('essays')
    .insert({
      title: `에세이 SID-${sid} (${label})`,
      content: `이 에세이는 전문가 채점 데이터에서 가져온 에세이입니다. SID: ${sid}, 난이도: ${label}`,
      difficulty_level: difficultyMap[label] || 'medium',
      is_anchor: true,  // 앵커 에세이로 설정
      is_calibration: true,  // 캘리브레이션 세트에도 포함
      is_active: true,
      metadata: { sid: sid.toString(), source: 'anchor_csv' }
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`에세이 생성 실패 (SID: ${sid}): ${createError.message}`);
  }

  console.log(`✅ 에세이 생성: SID ${sid} → ${newEssay.id}`);
  return newEssay;
}

// 전문가 점수 저장
async function saveExpertScores(expertId, essayId, rubricMapping, row) {
  const scores = [];

  // 각 평가 요소별로 점수 저장
  for (const [csvCol, displayOrder] of Object.entries(RUBRIC_MAPPING)) {
    if (displayOrder === null) continue; // C4는 무시

    const scoreValue = parseInt(row[csvCol]);
    if (isNaN(scoreValue) || scoreValue < 1 || scoreValue > 3) {
      console.warn(`⚠️  잘못된 점수 값: ${csvCol}=${row[csvCol]} (SID: ${row.SID}, RID: ${row.RID})`);
      continue;
    }

    const rubricId = rubricMapping[displayOrder];
    if (!rubricId) {
      console.warn(`⚠️  루브릭을 찾을 수 없음: display_order=${displayOrder}`);
      continue;
    }

    scores.push({
      expert_id: expertId,
      essay_id: essayId,
      rubric_id: rubricId,
      score: scoreValue,
      is_boundary_case: false, // 나중에 분석하여 설정 가능
      created_at: new Date().toISOString()
    });
  }

  if (scores.length === 0) {
    return;
  }

  // UPSERT 사용 (중복 방지)
  const { error } = await supabase
    .from('expert_scores')
    .upsert(scores, {
      onConflict: 'expert_id,essay_id,rubric_id',
      ignoreDuplicates: false
    });

  if (error) {
    throw new Error(`점수 저장 실패: ${error.message}`);
  }

  return scores.length;
}

// 메인 함수
async function main() {
  console.log('🚀 anchor.csv 임포트 시작...\n');

  try {
    // 1. CSV 파일 읽기
    console.log('📖 CSV 파일 읽는 중...');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);
    }
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvData = parseCSV(csvContent);
    console.log(`✅ ${csvData.length}개 행 읽기 완료\n`);

    // 2. 루브릭 매핑 가져오기
    console.log('📋 루브릭 매핑 조회 중...');
    const rubricMapping = await getRubricMapping();
    console.log('');

    // 3. 고유한 RID와 SID 추출
    const uniqueRIDs = [...new Set(csvData.map(row => row.RID))];
    const uniqueSIDs = [...new Set(csvData.map(row => row.SID))];
    console.log(`📊 통계:`);
    console.log(`   - 고유 채점자 수: ${uniqueRIDs.length}명`);
    console.log(`   - 고유 에세이 수: ${uniqueSIDs.length}편`);
    console.log(`   - 총 채점 데이터: ${csvData.length}개\n`);

    // 4. 전문가 채점자 생성/조회
    console.log('👥 전문가 채점자 생성/조회 중...');
    const expertMap = {};
    for (const rid of uniqueRIDs) {
      expertMap[rid] = await getOrCreateExpertRater(rid);
    }
    console.log(`✅ ${Object.keys(expertMap).length}명의 전문가 채점자 준비 완료\n`);

    // 5. 에세이 생성/조회
    console.log('📝 에세이 생성/조회 중...');
    const essayMap = {};
    for (const row of csvData) {
      const sid = row.SID;
      if (!essayMap[sid]) {
        essayMap[sid] = await getOrCreateEssay(sid, row.label);
      }
    }
    console.log(`✅ ${Object.keys(essayMap).length}편의 에세이 준비 완료\n`);

    // 6. 점수 데이터 저장
    console.log('💾 점수 데이터 저장 중...');
    let totalSaved = 0;
    let processedRows = 0;

    for (const row of csvData) {
      const expert = expertMap[row.RID];
      const essay = essayMap[row.SID];

      if (!expert || !essay) {
        console.warn(`⚠️  데이터 누락: RID=${row.RID}, SID=${row.SID}`);
        continue;
      }

      const saved = await saveExpertScores(expert.id, essay.id, rubricMapping, row);
      if (saved) {
        totalSaved += saved;
        processedRows++;
      }

      // 진행 상황 출력 (10개마다)
      if (processedRows % 10 === 0) {
        process.stdout.write(`\r   진행: ${processedRows}/${csvData.length} 행 처리됨...`);
      }
    }

    console.log(`\n✅ 점수 저장 완료: ${totalSaved}개 점수 저장됨\n`);

    // 7. 최종 통계
    console.log('📊 최종 통계:');
    const { data: expertCount } = await supabase
      .from('expert_raters')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { data: essayCount } = await supabase
      .from('essays')
      .select('id', { count: 'exact', head: true })
      .eq('is_anchor', true)
      .eq('is_active', true);

    const { data: scoreCount } = await supabase
      .from('expert_scores')
      .select('id', { count: 'exact', head: true });

    console.log(`   - 전문가 채점자: ${expertCount || 0}명`);
    console.log(`   - 앵커 에세이: ${essayCount || 0}편`);
    console.log(`   - 전문가 점수: ${scoreCount || 0}개`);
    console.log('\n🎉 임포트 완료!');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 실행
main();

