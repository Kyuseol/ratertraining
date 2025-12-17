// TypeScript Type Definitions
// Updated for Blueprint v0.9: 9개 평가요소, 3점 척도, 앵커 에세이 시스템

// ============================================================================
// User Types
// ============================================================================

export interface IAdmin {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ITeacher {
  id: string;
  email: string;
  name: string;
  institution: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  essays_rated_count: number;
  diagnosis_level: 'none' | 'preliminary' | 'official' | 'advanced';
  metadata?: Record<string, any>;
}

// ============================================================================
// Essay & Rubric Types
// ============================================================================

export interface IEssay {
  id: string;
  title: string;
  content: string;
  grade_level: string | null;
  prompt: string | null;
  word_count: number | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  // Blueprint v0.9: 앵커/캘리브레이션 구분
  is_anchor: boolean;
  is_calibration: boolean;
  anchor_explanation: string | null;
  difficulty_level: 'low' | 'medium' | 'high' | null;
  metadata?: Record<string, any>;
}

export interface IRubric {
  id: string;
  category: string; // 범주: 내용, 조직, 표현
  name: string;
  description: string | null;
  min_score: number; // 1 (3점 척도)
  max_score: number; // 3 (3점 척도)
  weight: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  // Blueprint v0.9: 범주 경계 설명
  boundary_1_2_description: string | null;
  boundary_2_3_description: string | null;
}

export interface IScore {
  id: string;
  teacher_id: string;
  essay_id: string;
  rubric_id: string;
  score: number;
  rating_duration_seconds: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// MFRM Analysis Types (Blueprint v0.9: 배치 재추정, 버전 관리)
// ============================================================================

export interface IMFRMRun {
  id: string;
  name: string;
  description: string | null;
  // Blueprint v0.9: 버전 관리
  version_id: string;
  is_active_version: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed';
  teacher_ids: string[];
  essay_ids: string[];
  rubric_ids: string[];
  total_scores: number | null;
  convergence: boolean | null;
  // Blueprint v0.9: 품질 지표 (배치 재추정 수용 기준)
  median_infit: number | null;
  median_outfit: number | null;
  separation_index: number | null;
  extreme_response_rate: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  metadata?: Record<string, any>;
}

export interface IMFRMResult {
  id: string;
  run_id: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_email?: string;
  // MFRM 파라미터
  severity: number | null;
  severity_se: number | null;
  severity_ci_lower: number | null; // Blueprint v0.9: 95% CI
  severity_ci_upper: number | null;
  infit: number | null;
  outfit: number | null;
  mean_score: number | null;
  sd_score: number | null;
  total_ratings: number | null;
  // Blueprint v0.9: 추가 진단 지표
  halo_effect_score: number | null;
  category_imbalance_score: number | null;
  response_time_anomaly_count: number;
  // 해석 및 피드백
  interpretation?: string;
  feedback?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface IEssayDifficulty {
  id: string;
  run_id: string;
  essay_id: string;
  essay_title?: string;
  difficulty: number | null;
  difficulty_se: number | null;
  mean_score: number | null;
  sd_score: number | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ITeacherStatistics {
  teacher_id: string;
  teacher_name: string;
  email: string;
  total_ratings: number;
  mean_score: number;
  sd_score: number;
  first_rating_at: string | null;
  last_rating_at: string | null;
}

export interface IEssayStatistics {
  essay_id: string;
  title: string;
  grade_level: string | null;
  num_raters: number;
  total_ratings: number;
  mean_score: number;
  sd_score: number;
}

// API Response Types

export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  timestamp: string;
}

export interface IMFRMAnalysisResponse {
  success: boolean;
  run_id: string;
  status: string;
  converged: boolean;
  summary: {
    total_scores: number;
    num_teachers: number;
    num_essays: number;
    deviance: number;
    aic: number;
    bic: number;
  };
}

export interface IMFRMResultsResponse {
  success: boolean;
  run: IMFRMRun;
  results: IMFRMResult[];
  difficulties: IEssayDifficulty[];
}

// ============================================================================
// Admin Mode Types (Blueprint v0.9)
// ============================================================================

export interface IEssayFormData {
  title: string;
  content: string;
  grade_level: string;
  prompt?: string;
  word_count?: number;
  is_anchor?: boolean;
  is_calibration?: boolean;
  anchor_explanation?: string;
  difficulty_level?: 'low' | 'medium' | 'high';
}

export interface IAnchorEssayStats {
  total_anchor_count: number;
  recommended_min: number;
  recommended_max: number;
  coverage_matrix: {
    [rubric_id: string]: {
      rubric_name: string;
      boundary_1_2_count: number;
      boundary_2_3_count: number;
    };
  };
}

export interface ICalibrationStats {
  total_calibration_count: number;
  required_min: number;
  recommended_min: number;
  panel_size: number;
  observations_per_facet: number;
}

export interface IDiagnosisProgress {
  teacher_id: string;
  teacher_name: string;
  essays_rated_count: number;
  current_level: 'none' | 'preliminary' | 'official' | 'advanced';
  next_level: 'preliminary' | 'official' | 'advanced' | 'complete';
  essays_needed_for_next: number;
  observations_count: number;
  estimated_se: number;
}

// ============================================================================
// Quality Control Types (Blueprint v0.9)
// ============================================================================

export interface IQualityMetrics {
  median_infit: number;
  median_outfit: number;
  separation_index: number;
  extreme_response_rate: number;
  threshold_order_check: boolean;
  acceptance_status: 'accepted' | 'rejected' | 'warning';
  issues: string[];
}

export interface IVersionComparison {
  current_version: string;
  previous_version: string;
  parameter_drift: {
    [teacher_id: string]: {
      severity_change: number;
      infit_change: number;
    };
  };
  recommendation: 'keep_current' | 'rollback' | 'review_required';
}

// ============================================================================
// Calibration Types (고정척도 구축)
// ============================================================================

/**
 * 앵커 합의 점수 (전문가 패널 채점)
 */
export interface IAnchorConsensusScore {
  id: string;
  essay_id: string;
  rubric_id: string;
  consensus_score: 1 | 2 | 3;
  is_boundary_1_2: boolean;
  is_boundary_2_3: boolean;
  expert_panel_size: number;
  agreement_rate: number | null;
  boundary_rationale: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 합의 점수 입력 폼 데이터
 */
export interface IAnchorConsensusScoreInput {
  essay_id: string;
  rubric_id: string;
  consensus_score: 1 | 2 | 3;
  is_boundary_1_2?: boolean;
  is_boundary_2_3?: boolean;
  expert_panel_size?: number;
  agreement_rate?: number;
  boundary_rationale?: string;
}

/**
 * 에세이별 합의 점수 요약
 */
export interface IEssayConsensusScores {
  essay_id: string;
  essay_title: string;
  scores: {
    [rubric_id: string]: IAnchorConsensusScore | null;
  };
  completion_rate: number; // 입력 완료율 (0-100%)
  boundary_count: {
    boundary_1_2: number;
    boundary_2_3: number;
  };
}

/**
 * 캘리브레이션 실행 기록
 */
export interface ICalibrationRun {
  id: string;
  name: string;
  description: string | null;
  version_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  is_active_version: boolean;
  essay_ids: string[];
  rubric_ids: string[];
  total_observations: number | null;
  convergence: boolean | null;
  global_fit_chi_square: number | null;
  global_fit_df: number | null;
  global_fit_p_value: number | null;
  separation_reliability: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  metadata?: Record<string, any>;
}

/**
 * 캘리브레이션 결과 (에세이별)
 */
export interface ICalibrationResult {
  id: string;
  calibration_run_id: string;
  essay_id: string;
  essay_title?: string;
  difficulty_logit: number | null;
  difficulty_se: number | null;
  difficulty_ci_lower: number | null;
  difficulty_ci_upper: number | null;
  infit: number | null;
  outfit: number | null;
  mean_score: number | null;
  sd_score: number | null;
  observation_count: number | null;
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * 캘리브레이션 준비 상태
 */
export interface ICalibrationReadiness {
  calibration_essay_count: number;
  anchor_essay_count: number;
  essays_with_consensus: number;
  total_consensus_scores: number;
  rubric_count: number;
  status: 'ready' | 'not_ready';
  message: string;
  checklist: {
    min_essays: { required: number; current: number; passed: boolean };
    consensus_coverage: { required: number; current: number; passed: boolean };
    boundary_coverage: { required: number; current: number; passed: boolean };
  };
}

/**
 * 앵커 커버리지 매트릭스 (평가요소별)
 */
export interface IAnchorCoverageMatrix {
  rubric_id: string;
  rubric_name: string;
  rubric_category: string;
  boundary_1_2_count: number;
  boundary_2_3_count: number;
  total_anchor_essays: number;
  coverage_status: 'complete' | 'partial' | 'insufficient';
}

/**
 * 에세이 확장 (캘리브레이션 정보 포함)
 */
export interface IEssayWithCalibration extends IEssay {
  difficulty_logit: number | null;
  difficulty_logit_se: number | null;
  is_calibrated: boolean;
  calibrated_at: string | null;
  calibration_run_id: string | null;
}

/**
 * 캘리브레이션 실행 요청
 */
export interface ICalibrationRequest {
  name: string;
  description?: string;
  essay_ids?: string[]; // 미지정 시 모든 캘리브레이션 에세이 사용
}

/**
 * 캘리브레이션 실행 응답
 */
export interface ICalibrationResponse {
  success: boolean;
  calibration_run_id: string;
  status: string;
  converged: boolean;
  summary: {
    total_essays: number;
    total_observations: number;
    convergence: boolean;
    separation_reliability: number;
  };
  essay_results: ICalibrationResult[];
}

// ============================================================================
// Expert Rater Types (전문가 개별 채점 기반 캘리브레이션)
// ============================================================================

/**
 * 전문가 평가자
 */
export interface IExpertRater {
  id: string;
  name: string;
  email: string | null;
  institution: string | null;
  expertise_area: string | null;
  years_of_experience: number | null;
  qualification_level: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

/**
 * 전문가 개별 채점
 */
export interface IExpertScore {
  id: string;
  expert_id: string;
  essay_id: string;
  rubric_id: string;
  score: 1 | 2 | 3;
  rating_duration_seconds: number | null;
  confidence_level: 1 | 2 | 3 | 4 | 5 | null;
  is_boundary_case: boolean;
  boundary_type: '1-2' | '2-3' | null;
  rationale: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 전문가 점수 입력 폼
 */
export interface IExpertScoreInput {
  expert_id: string;
  essay_id: string;
  rubric_id: string;
  score: 1 | 2 | 3;
  confidence_level?: 1 | 2 | 3 | 4 | 5;
  is_boundary_case?: boolean;
  boundary_type?: '1-2' | '2-3';
  rationale?: string;
}

/**
 * 전문가별 채점 진행률
 */
export interface IExpertScoringProgress {
  expert_id: string;
  expert_name: string;
  email: string | null;
  essays_scored: number;
  total_scores: number;
  target_essays: number;
  rubrics_per_essay: number;
  completion_percentage: number;
}

/**
 * 에세이별 전문가 채점 현황
 */
export interface IEssayExpertCoverage {
  essay_id: string;
  title: string;
  is_anchor: boolean;
  is_calibration: boolean;
  expert_count: number;
  rubrics_with_scores: number;
  total_rubrics: number;
  mean_score: number | null;
  score_sd: number | null;
  coverage_status: 'complete' | 'partial' | 'insufficient';
}

/**
 * 에세이-평가요소별 점수 분포
 */
export interface IScoreDistribution {
  essay_id: string;
  essay_title: string;
  rubric_id: string;
  rubric_name: string;
  category: string;
  total_scores: number;
  score_1_count: number;
  score_2_count: number;
  score_3_count: number;
  mean_score: number | null;
  score_sd: number | null;
  mode_score: number | null;
  agreement_rate: number | null;
}

/**
 * 도출된 합의 점수
 */
export interface IDerivedConsensus {
  essay_id: string;
  rubric_id: string;
  consensus_score: number | null;
  agreement_rate: number | null;
  expert_count: number;
  score_distribution: { '1': number; '2': number; '3': number };
  is_boundary: boolean;
  boundary_type: '1-2' | '2-3' | 'mixed' | null;
}

/**
 * 캘리브레이션 패널
 */
export interface ICalibrationPanel {
  id: string;
  name: string;
  description: string | null;
  expert_ids: string[];
  essay_ids: string[];
  status: 'active' | 'completed' | 'archived';
  total_expected_scores: number;
  total_completed_scores: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

/**
 * 전문가 기반 캘리브레이션 준비 상태
 */
export interface IExpertCalibrationReadiness {
  active_experts: number;
  calibration_essays: number;
  anchor_essays: number;
  total_expert_scores: number;
  essays_with_scores: number;
  status: 'ready' | 'not_ready';
  message: string;
  checklist: {
    experts: { required: number; current: number; passed: boolean };
    essays: { required: number; current: number; passed: boolean };
    scores: { required: number; current: number; passed: boolean };
  };
}

