// MFRM API Client v2 - 데이터 전달 방식 지원
// R 백엔드의 데이터베이스 연결 문제를 우회

import axios from 'axios';
import { supabase } from './supabase';

const R_API_URL = process.env.REACT_APP_R_API_URL || 'http://localhost:8000';

export interface MFRMAnalysisParams {
  run_name: string;
  description?: string;
  teacher_ids?: string[];
  essay_ids?: string[];
}

export interface MFRMAnalysisResult {
  success: boolean;
  converged: boolean;
  teacher_parameters: any[];
  essay_parameters: any[];
  fit_statistics: any;
  summary: any;
}

/**
 * 방식 2: 데이터 전달 방식으로 MFRM 분석 실행
 * 1. Supabase에서 데이터 조회
 * 2. R API로 분석 요청
 * 3. 결과를 데이터베이스에 저장
 */
export async function runMFRMAnalysisV2(params: MFRMAnalysisParams): Promise<any> {
  try {
    console.log('1️⃣ Supabase에서 데이터 조회 중...');
    
    // 1. 채점 데이터 조회
    let query = supabase
      .from('scores')
      .select('teacher_id, essay_id, rubric_id, score, rating_duration_seconds');
    
    if (params.teacher_ids && params.teacher_ids.length > 0) {
      query = query.in('teacher_id', params.teacher_ids);
    }
    
    if (params.essay_ids && params.essay_ids.length > 0) {
      query = query.in('essay_id', params.essay_ids);
    }
    
    const { data: scores, error: scoresError } = await query;
    
    if (scoresError) {
      throw new Error(`데이터 조회 실패: ${scoresError.message}`);
    }
    
    if (!scores || scores.length < 30) {
      throw new Error(`데이터 부족: 최소 30개 점수 필요 (현재: ${scores?.length || 0}개)`);
    }
    
    console.log(`   ✅ ${scores.length}개 점수 조회 완료`);
    
    // 2. R API로 분석 요청
    console.log('2️⃣ R API로 MFRM 분석 요청 중...');
    
    const analysisResponse = await axios.post<MFRMAnalysisResult>(
      `${R_API_URL}/api/mfrm/analyze-with-data`,
      { scores_data: scores },
      {
        timeout: 120000, // 2분
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!analysisResponse.data.success) {
      throw new Error('MFRM 분석 실패');
    }
    
    console.log('   ✅ MFRM 분석 완료');
    
    // 3. 분석 실행 기록 저장
    console.log('3️⃣ 데이터베이스에 결과 저장 중...');
    
    const { data: run, error: runError } = await supabase
      .from('mfrm_runs')
      .insert({
        name: params.run_name,
        description: params.description,
        status: 'completed',
        convergence: analysisResponse.data.converged,
        total_scores: scores.length,
        teacher_ids: params.teacher_ids || null,
        essay_ids: params.essay_ids || null,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (runError) {
      throw new Error(`Run 저장 실패: ${runError.message}`);
    }
    
    // 4. 교사별 결과 저장
    const teacherResults = analysisResponse.data.teacher_parameters.map((tp: any) => ({
      run_id: run.id,
      teacher_id: tp.teacher_id,
      severity: tp.severity,
      severity_ci_lower: tp.severity - 1.96 * (tp.severity_se || 0.3),
      severity_ci_upper: tp.severity + 1.96 * (tp.severity_se || 0.3),
      infit: tp.infit,
      outfit: tp.outfit,
      infit_t: tp.infit_t || 0,
      outfit_t: tp.outfit_t || 0,
      mean_score: tp.mean_score,
      total_ratings: tp.total_ratings,
      halo_effect_score: tp.halo_effect_score || 0,
      category_imbalance_score: tp.category_imbalance_score || 0,
      feedback: tp.feedback
    }));
    
    const { error: resultsError } = await supabase
      .from('mfrm_results')
      .insert(teacherResults);
    
    if (resultsError) {
      throw new Error(`결과 저장 실패: ${resultsError.message}`);
    }
    
    // 5. 에세이 난이도 저장
    if (analysisResponse.data.essay_parameters && analysisResponse.data.essay_parameters.length > 0) {
      const essayDifficulties = analysisResponse.data.essay_parameters.map((ep: any) => ({
        run_id: run.id,
        essay_id: ep.essay_id,
        difficulty: ep.difficulty,
        difficulty_se: ep.se,
        num_raters: Math.floor(scores.length / analysisResponse.data.essay_parameters.length)
      }));
      
      await supabase.from('essay_difficulties').insert(essayDifficulties);
    }
    
    console.log('   ✅ 데이터베이스 저장 완료');
    
    return {
      run_id: run.id,
      status: 'completed',
      converged: analysisResponse.data.converged,
      summary: analysisResponse.data.summary
    };
    
  } catch (error: any) {
    console.error('MFRM 분석 에러:', error);
    throw error;
  }
}

/**
 * Health check
 */
export async function checkRBackendHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${R_API_URL}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

