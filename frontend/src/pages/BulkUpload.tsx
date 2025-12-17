import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './BulkUpload.css';

// 평가요소 코드 매핑 (엑셀 컬럼명 -> rubric name)
const RUBRIC_MAPPING: { [key: string]: string } = {
  'C1_주장': '주장',
  'C2_이유': '이유',
  'C3_근거': '근거',
  'C4_반론반박': '반론반박',
  'O1_통일성': '통일성',
  'O2_응집성': '응집성',
  'O3_완결성': '완결성',
  'E1_어휘문장': '어휘·문장 적절성',
  'E2_어문규범': '어문 규범 준수',
};

const SCORE_COLUMNS = Object.keys(RUBRIC_MAPPING);

// 타입 정의
interface EssayRow {
  essay_code: string;
  title: string;
  content: string;
  grade_level?: string;
  word_count?: number;
  is_anchor?: boolean;
  is_calibration?: boolean;
  difficulty_level?: 'low' | 'medium' | 'high';
  anchor_explanation?: string;
}

interface ScoreRow {
  teacher_email: string;
  essay_code: string;
  [key: string]: string | number;
}

interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  message: string;
}

interface UploadResult {
  essaysCreated: number;
  essaysUpdated: number;
  scoresCreated: number;
  scoresUpdated: number;
  teachersCreated: number;
  errors: string[];
}

/**
 * 대량 업로드 페이지
 * 엑셀 파일로 에세이 및 채점 데이터 일괄 입력
 */
export const BulkUpload: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 상태
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [essays, setEssays] = useState<EssayRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [dragActive, setDragActive] = useState(false);

  // 파일 드래그 핸들러
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // 파일 드롭 핸들러
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // 파일 처리
  const handleFile = async (selectedFile: File) => {
    // 파일 확장자 검증
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      alert('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setValidationErrors([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // 시트 파싱
      const essayData = parseEssaySheet(workbook);
      const scoreData = parseScoreSheet(workbook);

      // 검증
      const errors = validateData(essayData, scoreData);

      setEssays(essayData);
      setScores(scoreData);
      setValidationErrors(errors);
      setStep('preview');
    } catch (err) {
      console.error('파일 파싱 오류:', err);
      alert('파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // essays 시트 파싱
  const parseEssaySheet = (workbook: XLSX.WorkBook): EssayRow[] => {
    const sheetName = workbook.SheetNames.find(
      name => name.toLowerCase() === 'essays'
    );
    if (!sheetName) return [];

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

    return jsonData.map((row: any) => ({
      essay_code: String(row.essay_code || '').trim(),
      title: String(row.title || '').trim(),
      content: String(row.content || '').trim(),
      grade_level: row.grade_level ? String(row.grade_level).trim() : undefined,
      word_count: row.word_count ? Number(row.word_count) : undefined,
      is_anchor: parseBoolean(row.is_anchor),
      is_calibration: parseBoolean(row.is_calibration),
      difficulty_level: parseDifficultyLevel(row.difficulty_level),
      anchor_explanation: row.anchor_explanation ? String(row.anchor_explanation).trim() : undefined,
    }));
  };

  // scores 시트 파싱
  const parseScoreSheet = (workbook: XLSX.WorkBook): ScoreRow[] => {
    const sheetName = workbook.SheetNames.find(
      name => name.toLowerCase() === 'scores'
    );
    if (!sheetName) return [];

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

    return jsonData.map((row: any) => {
      const scoreRow: ScoreRow = {
        teacher_email: String(row.teacher_email || '').trim().toLowerCase(),
        essay_code: String(row.essay_code || '').trim(),
      };

      // 점수 컬럼 파싱
      SCORE_COLUMNS.forEach(col => {
        const value = row[col];
        if (value !== undefined && value !== '') {
          scoreRow[col] = Number(value);
        }
      });

      return scoreRow;
    });
  };

  // Boolean 파싱
  const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'yes' || lower === '예';
    }
    return Boolean(value);
  };

  // 난이도 파싱
  const parseDifficultyLevel = (value: any): 'low' | 'medium' | 'high' | undefined => {
    if (!value) return undefined;
    const lower = String(value).toLowerCase().trim();
    if (lower === 'low' || lower === '낮음' || lower === '하') return 'low';
    if (lower === 'medium' || lower === '중간' || lower === '중') return 'medium';
    if (lower === 'high' || lower === '높음' || lower === '상') return 'high';
    return undefined;
  };

  // 데이터 검증
  const validateData = (essayData: EssayRow[], scoreData: ScoreRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    // essayCodes는 향후 essay_code 일치 검증에 사용될 수 있음
    // const essayCodes = new Set(essayData.map(e => e.essay_code));

    // essays 검증
    essayData.forEach((row, index) => {
      if (!row.essay_code) {
        errors.push({ sheet: 'essays', row: index + 2, column: 'essay_code', message: '필수 필드입니다' });
      }
      if (!row.title) {
        errors.push({ sheet: 'essays', row: index + 2, column: 'title', message: '필수 필드입니다' });
      }
      if (!row.content) {
        errors.push({ sheet: 'essays', row: index + 2, column: 'content', message: '필수 필드입니다' });
      }
    });

    // 중복 essay_code 검증
    const codeCount: { [key: string]: number } = {};
    essayData.forEach((row, index) => {
      if (row.essay_code) {
        codeCount[row.essay_code] = (codeCount[row.essay_code] || 0) + 1;
        if (codeCount[row.essay_code] > 1) {
          errors.push({ sheet: 'essays', row: index + 2, column: 'essay_code', message: `중복된 코드: ${row.essay_code}` });
        }
      }
    });

    // scores 검증
    scoreData.forEach((row, index) => {
      if (!row.teacher_email) {
        errors.push({ sheet: 'scores', row: index + 2, column: 'teacher_email', message: '필수 필드입니다' });
      } else if (!isValidEmail(row.teacher_email)) {
        errors.push({ sheet: 'scores', row: index + 2, column: 'teacher_email', message: '유효하지 않은 이메일 형식' });
      }

      if (!row.essay_code) {
        errors.push({ sheet: 'scores', row: index + 2, column: 'essay_code', message: '필수 필드입니다' });
      }

      // 점수 범위 검증
      SCORE_COLUMNS.forEach(col => {
        const value = row[col];
        if (value !== undefined && value !== '') {
          const numValue = Number(value);
          if (isNaN(numValue) || numValue < 1 || numValue > 3 || !Number.isInteger(numValue)) {
            errors.push({ sheet: 'scores', row: index + 2, column: col, message: '점수는 1, 2, 3 중 하나여야 합니다' });
          }
        }
      });

      // 모든 점수가 있는지 검증
      const hasAllScores = SCORE_COLUMNS.every(col => row[col] !== undefined && row[col] !== '');
      if (!hasAllScores) {
        const missingCols = SCORE_COLUMNS.filter(col => row[col] === undefined || row[col] === '');
        errors.push({ 
          sheet: 'scores', 
          row: index + 2, 
          column: missingCols.join(', '), 
          message: '모든 평가요소 점수를 입력해야 합니다' 
        });
      }
    });

    return errors;
  };

  // 이메일 검증
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 데이터 저장
  const handleSave = async () => {
    if (validationErrors.length > 0) {
      alert('검증 오류가 있습니다. 오류를 수정한 후 다시 업로드해주세요.');
      return;
    }

    setLoading(true);
    const result: UploadResult = {
      essaysCreated: 0,
      essaysUpdated: 0,
      scoresCreated: 0,
      scoresUpdated: 0,
      teachersCreated: 0,
      errors: [],
    };

    try {
      // 1. 기존 에세이 조회 (essay_code 기반 연결을 위해 metadata 활용)
      const { data: existingEssays } = await supabase
        .from('essays')
        .select('id, title, metadata');

      // essay_code -> essay_id 매핑 (기존 데이터)
      const essayCodeToId: { [code: string]: string } = {};
      existingEssays?.forEach(e => {
        const code = e.metadata?.essay_code;
        if (code) {
          essayCodeToId[code] = e.id;
        }
      });

      // 2. 에세이 저장
      for (const essay of essays) {
        try {
          const essayData = {
            title: essay.title,
            content: essay.content,
            grade_level: essay.grade_level || null,
            word_count: essay.word_count || null,
            is_anchor: essay.is_anchor || false,
            is_calibration: essay.is_calibration || false,
            difficulty_level: essay.difficulty_level || null,
            anchor_explanation: essay.anchor_explanation || null,
            metadata: { essay_code: essay.essay_code },
          };

          if (essayCodeToId[essay.essay_code]) {
            // 업데이트
            const { error } = await supabase
              .from('essays')
              .update(essayData)
              .eq('id', essayCodeToId[essay.essay_code]);

            if (error) throw error;
            result.essaysUpdated++;
          } else {
            // 새로 생성
            const { data, error } = await supabase
              .from('essays')
              .insert(essayData)
              .select('id')
              .single();

            if (error) throw error;
            if (data) {
              essayCodeToId[essay.essay_code] = data.id;
              result.essaysCreated++;
            }
          }
        } catch (err) {
          result.errors.push(`에세이 '${essay.essay_code}' 저장 실패: ${err}`);
        }
      }

      // 3. 교사 조회 및 생성
      const teacherEmails = [...new Set(scores.map(s => s.teacher_email))];
      const { data: existingTeachers } = await supabase
        .from('teachers')
        .select('id, email');

      const teacherEmailToId: { [email: string]: string } = {};
      existingTeachers?.forEach(t => {
        teacherEmailToId[t.email.toLowerCase()] = t.id;
      });

      // 미등록 교사 생성
      for (const email of teacherEmails) {
        if (!teacherEmailToId[email]) {
          try {
            const { data, error } = await supabase
              .from('teachers')
              .insert({
                email: email,
                name: email.split('@')[0], // 이메일 앞부분을 임시 이름으로
              })
              .select('id')
              .single();

            if (error) throw error;
            if (data) {
              teacherEmailToId[email] = data.id;
              result.teachersCreated++;
            }
          } catch (err) {
            result.errors.push(`교사 '${email}' 생성 실패: ${err}`);
          }
        }
      }

      // 4. 루브릭 조회
      const { data: rubrics } = await supabase.from('rubrics').select('id, name');
      const rubricNameToId: { [name: string]: string } = {};
      rubrics?.forEach(r => {
        rubricNameToId[r.name] = r.id;
      });

      // 5. 채점 데이터 저장
      for (const score of scores) {
        const teacherId = teacherEmailToId[score.teacher_email];
        const essayId = essayCodeToId[score.essay_code];

        if (!teacherId) {
          result.errors.push(`채점 데이터: 교사 '${score.teacher_email}' 찾을 수 없음`);
          continue;
        }

        if (!essayId) {
          result.errors.push(`채점 데이터: 에세이 코드 '${score.essay_code}' 찾을 수 없음`);
          continue;
        }

        // 각 평가요소별 점수 저장
        for (const col of SCORE_COLUMNS) {
          const scoreValue = score[col];
          if (scoreValue === undefined || scoreValue === '') continue;

          const rubricName = RUBRIC_MAPPING[col];
          const rubricId = rubricNameToId[rubricName];

          if (!rubricId) {
            result.errors.push(`루브릭 '${rubricName}' 찾을 수 없음`);
            continue;
          }

          try {
            const { data: existing } = await supabase
              .from('scores')
              .select('id')
              .eq('teacher_id', teacherId)
              .eq('essay_id', essayId)
              .eq('rubric_id', rubricId)
              .single();

            if (existing) {
              // 업데이트
              const { error } = await supabase
                .from('scores')
                .update({ score: Number(scoreValue) })
                .eq('id', existing.id);

              if (error) throw error;
              result.scoresUpdated++;
            } else {
              // 새로 생성
              const { error } = await supabase
                .from('scores')
                .insert({
                  teacher_id: teacherId,
                  essay_id: essayId,
                  rubric_id: rubricId,
                  score: Number(scoreValue),
                });

              if (error) throw error;
              result.scoresCreated++;
            }
          } catch (err) {
            result.errors.push(
              `점수 저장 실패 (${score.teacher_email}, ${score.essay_code}, ${col}): ${err}`
            );
          }
        }

        // 교사의 채점 에세이 수 업데이트
        await updateTeacherEssayCount(teacherId);
      }

      setUploadResult(result);
      setStep('result');
    } catch (err) {
      console.error('저장 오류:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 교사의 채점 에세이 수 업데이트
  const updateTeacherEssayCount = async (teacherId: string) => {
    try {
      const { count } = await supabase
        .from('scores')
        .select('essay_id', { count: 'exact', head: true })
        .eq('teacher_id', teacherId);

      if (count !== null) {
        // 진단 레벨 결정
        let diagnosisLevel = 'none';
        if (count >= 18) diagnosisLevel = 'advanced';
        else if (count >= 9) diagnosisLevel = 'official';
        else if (count >= 6) diagnosisLevel = 'preliminary';

        await supabase
          .from('teachers')
          .update({
            essays_rated_count: count,
            diagnosis_level: diagnosisLevel,
          })
          .eq('id', teacherId);
      }
    } catch (err) {
      console.error('교사 통계 업데이트 실패:', err);
    }
  };

  // 템플릿 다운로드
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // essays 시트
    const essaysData = [
      {
        essay_code: 'CAL001',
        title: '예시 에세이 제목',
        content: '예시 에세이 내용입니다. 실제 에세이 본문을 입력하세요.',
        grade_level: '고등학교 1학년',
        word_count: 500,
        is_anchor: 'FALSE',
        is_calibration: 'TRUE',
        difficulty_level: 'medium',
        anchor_explanation: '',
      },
    ];
    const essaysWs = XLSX.utils.json_to_sheet(essaysData);
    XLSX.utils.book_append_sheet(wb, essaysWs, 'essays');

    // scores 시트
    const scoresData = [
      {
        teacher_email: 'teacher1@example.com',
        essay_code: 'CAL001',
        C1_주장: 2,
        C2_이유: 3,
        C3_근거: 2,
        O1_통일성: 3,
        O2_응집성: 2,
        O3_완결성: 3,
        E1_어휘문장: 2,
        E2_어문규범: 3,
      },
    ];
    const scoresWs = XLSX.utils.json_to_sheet(scoresData);
    XLSX.utils.book_append_sheet(wb, scoresWs, 'scores');

    XLSX.writeFile(wb, 'mfrm_data_template.xlsx');
  };

  // 초기화
  const handleReset = () => {
    setFile(null);
    setEssays([]);
    setScores([]);
    setValidationErrors([]);
    setUploadResult(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bulk-upload">
      {/* 헤더 */}
      <header className="bulk-upload-header">
        <div className="header-content">
          <h1>📦 대량 업로드</h1>
          <p>엑셀 파일로 에세이 및 채점 데이터를 일괄 입력합니다</p>
        </div>
        <nav className="header-nav">
          <button onClick={() => navigate('/admin')} className="nav-btn">
            🏠 대시보드
          </button>
          <button onClick={() => navigate('/admin/essays')} className="nav-btn">
            📝 에세이 관리
          </button>
          <button onClick={logout} className="nav-btn logout">
            🚪 로그아웃
          </button>
        </nav>
      </header>

      <div className="bulk-upload-content">
        {/* 스텝 인디케이터 */}
        <div className="step-indicator">
          <div className={`step ${step === 'upload' ? 'active' : ''} ${step !== 'upload' ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">파일 업로드</div>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'preview' ? 'active' : ''} ${step === 'result' ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">미리보기 & 검증</div>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'result' ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">완료</div>
          </div>
        </div>

        {/* Step 1: 파일 업로드 */}
        {step === 'upload' && (
          <div className="upload-section">
            <div
              className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
              />
              <div className="drop-zone-content">
                <div className="drop-icon">📄</div>
                <h3>엑셀 파일을 드래그하거나 클릭하여 선택</h3>
                <p>지원 형식: .xlsx, .xls</p>
              </div>
            </div>

            <div className="template-section">
              <h3>📥 템플릿 다운로드</h3>
              <p>양식에 맞는 템플릿 파일을 다운로드하여 데이터를 입력하세요.</p>
              <button onClick={downloadTemplate} className="btn-template">
                템플릿 다운로드
              </button>
            </div>

            <div className="guide-section">
              <h3>📋 엑셀 파일 구조</h3>
              <div className="guide-cards">
                <div className="guide-card">
                  <h4>essays 시트</h4>
                  <ul>
                    <li><strong>essay_code</strong>: 에세이 코드 (필수)</li>
                    <li><strong>title</strong>: 제목 (필수)</li>
                    <li><strong>content</strong>: 본문 (필수)</li>
                    <li>grade_level, word_count 등 (선택)</li>
                  </ul>
                </div>
                <div className="guide-card">
                  <h4>scores 시트</h4>
                  <ul>
                    <li><strong>teacher_email</strong>: 교사 이메일 (필수)</li>
                    <li><strong>essay_code</strong>: 에세이 코드 (필수)</li>
                    <li><strong>C1~E2</strong>: 8개 평가요소 점수 (1-3)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 미리보기 & 검증 */}
        {step === 'preview' && (
          <div className="preview-section">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner" />
                <p>파일 처리 중...</p>
              </div>
            ) : (
              <>
                {/* 검증 오류 */}
                {validationErrors.length > 0 && (
                  <div className="validation-errors">
                    <h3>⚠️ 검증 오류 ({validationErrors.length}건)</h3>
                    <div className="error-list">
                      {validationErrors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="error-item">
                          <span className="error-location">
                            [{err.sheet}] 행 {err.row}, 컬럼 "{err.column}"
                          </span>
                          <span className="error-message">{err.message}</span>
                        </div>
                      ))}
                      {validationErrors.length > 10 && (
                        <div className="error-more">
                          ...외 {validationErrors.length - 10}건의 오류
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 요약 */}
                <div className="preview-summary">
                  <h3>📊 데이터 요약</h3>
                  <div className="summary-cards">
                    <div className="summary-card">
                      <div className="summary-value">{essays.length}</div>
                      <div className="summary-label">에세이</div>
                      <div className="summary-detail">
                        앵커: {essays.filter(e => e.is_anchor).length} / 
                        캘리브레이션: {essays.filter(e => e.is_calibration).length}
                      </div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-value">{scores.length}</div>
                      <div className="summary-label">채점 행</div>
                      <div className="summary-detail">
                        교사: {new Set(scores.map(s => s.teacher_email)).size}명
                      </div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-value">{scores.length * 8}</div>
                      <div className="summary-label">총 점수</div>
                      <div className="summary-detail">8개 평가요소 × {scores.length}행</div>
                    </div>
                  </div>
                </div>

                {/* 에세이 미리보기 */}
                {essays.length > 0 && (
                  <div className="preview-table-section">
                    <h3>📝 에세이 ({essays.length}편)</h3>
                    <div className="table-container">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>코드</th>
                            <th>제목</th>
                            <th>학년</th>
                            <th>어절</th>
                            <th>앵커</th>
                            <th>캘리브레이션</th>
                            <th>난이도</th>
                          </tr>
                        </thead>
                        <tbody>
                          {essays.slice(0, 10).map((essay, idx) => (
                            <tr key={idx}>
                              <td>{essay.essay_code}</td>
                              <td>{essay.title.substring(0, 30)}...</td>
                              <td>{essay.grade_level || '-'}</td>
                              <td>{essay.word_count || '-'}</td>
                              <td>{essay.is_anchor ? '✅' : '-'}</td>
                              <td>{essay.is_calibration ? '✅' : '-'}</td>
                              <td>{essay.difficulty_level || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {essays.length > 10 && (
                        <div className="table-more">...외 {essays.length - 10}편</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 채점 데이터 미리보기 */}
                {scores.length > 0 && (
                  <div className="preview-table-section">
                    <h3>📊 채점 데이터 ({scores.length}행)</h3>
                    <div className="table-container">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>교사</th>
                            <th>에세이</th>
                            <th>C1</th>
                            <th>C2</th>
                            <th>C3</th>
                            <th>C4</th>
                            <th>O1</th>
                            <th>O2</th>
                            <th>O3</th>
                            <th>E1</th>
                            <th>E2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scores.slice(0, 10).map((score, idx) => (
                            <tr key={idx}>
                              <td>{score.teacher_email.split('@')[0]}</td>
                              <td>{score.essay_code}</td>
                              <td>{score['C1_주장']}</td>
                              <td>{score['C2_이유']}</td>
                              <td>{score['C3_근거']}</td>
                              <td>{score['C4_반론반박']}</td>
                              <td>{score['O1_통일성']}</td>
                              <td>{score['O2_응집성']}</td>
                              <td>{score['O3_완결성']}</td>
                              <td>{score['E1_어휘문장']}</td>
                              <td>{score['E2_어문규범']}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {scores.length > 10 && (
                        <div className="table-more">...외 {scores.length - 10}행</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="preview-actions">
                  <button onClick={handleReset} className="btn-secondary">
                    다시 선택
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary"
                    disabled={validationErrors.length > 0 || loading}
                  >
                    {loading ? '저장 중...' : '저장하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: 결과 */}
        {step === 'result' && uploadResult && (
          <div className="result-section">
            <div className="result-icon">✅</div>
            <h2>업로드 완료!</h2>

            <div className="result-summary">
              <div className="result-card success">
                <div className="result-label">에세이</div>
                <div className="result-value">
                  생성: {uploadResult.essaysCreated} / 수정: {uploadResult.essaysUpdated}
                </div>
              </div>
              <div className="result-card success">
                <div className="result-label">채점 데이터</div>
                <div className="result-value">
                  생성: {uploadResult.scoresCreated} / 수정: {uploadResult.scoresUpdated}
                </div>
              </div>
              {uploadResult.teachersCreated > 0 && (
                <div className="result-card info">
                  <div className="result-label">새 교사 등록</div>
                  <div className="result-value">{uploadResult.teachersCreated}명</div>
                </div>
              )}
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="result-errors">
                <h3>⚠️ 일부 오류 발생 ({uploadResult.errors.length}건)</h3>
                <div className="error-list">
                  {uploadResult.errors.slice(0, 5).map((err, idx) => (
                    <div key={idx} className="error-item">{err}</div>
                  ))}
                  {uploadResult.errors.length > 5 && (
                    <div className="error-more">...외 {uploadResult.errors.length - 5}건</div>
                  )}
                </div>
              </div>
            )}

            <div className="result-actions">
              <button onClick={handleReset} className="btn-secondary">
                추가 업로드
              </button>
              <button onClick={() => navigate('/admin/essays')} className="btn-primary">
                에세이 관리로 이동
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUpload;
