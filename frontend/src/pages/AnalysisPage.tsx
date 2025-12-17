// MFRM Analysis Page
// MFRM 분석 실행 및 결과 조회 페이지

import React, { useState, useEffect } from 'react';
import { runMFRMAnalysisV2 } from '../lib/api_v2';
import { supabase } from '../lib/supabase';
import { IMFRMRun, IMFRMResult } from '../types';
import {
  formatDateTime,
  formatNumber,
  getSeverityLevel,
  getSeverityColor,
  getConsistencyLevel,
  getConsistencyColor,
  getErrorMessage,
} from '../utils/helpers';

const AnalysisPage: React.FC = () => {
  const [runs, setRuns] = useState<IMFRMRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<IMFRMRun | null>(null);
  const [results, setResults] = useState<IMFRMResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [runName, setRunName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('mfrm_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setRuns(data || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
      setMessage('분석 목록을 불러오는데 실패했습니다.');
    }
  };

  const startAnalysis = async () => {
    if (!runName.trim()) {
      setMessage('분석 이름을 입력해주세요.');
      return;
    }

    setAnalyzing(true);
    setMessage('MFRM 분석을 시작합니다... (최대 2분 소요)\n1️⃣ 데이터 조회 중...');

    try {
      // api_v2.ts의 데이터 전달 방식 사용
      const response = await runMFRMAnalysisV2({
        run_name: runName,
        description: description || undefined,
      });

      setMessage(
        `✅ 분석 완료! (수렴: ${response.converged ? '성공' : '실패'})\n` +
        `Run ID: ${response.run_id}\n` +
        `상태: ${response.status}`
      );

      // 목록 새로고침
      fetchRuns();

      // 결과 자동 조회
      if (response.run_id) {
        viewResults(response.run_id);
      }

      // 입력 필드 초기화
      setRunName('');
      setDescription('');
    } catch (error) {
      console.error('Error starting analysis:', error);
      setMessage(`❌ 분석 실패: ${getErrorMessage(error)}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const viewResults = async (runId: string) => {
    setLoading(true);
    setMessage('');

    try {
      // Run 정보 조회
      const { data: run, error: runError } = await supabase
        .from('mfrm_runs')
        .select('*')
        .eq('id', runId)
        .single();
      
      if (runError) throw runError;
      setSelectedRun(run as IMFRMRun);

      // 결과 조회 (교사 정보 포함)
      const { data: results, error: resultsError } = await supabase
        .from('mfrm_results')
        .select(`
          *,
          teachers!inner(id, name, email)
        `)
        .eq('run_id', runId);
      
      if (resultsError) throw resultsError;

      // 결과 포맷팅 (교사 정보 포함)
      const formattedResults = (results || []).map((r: any) => ({
        ...r,
        teacher_name: r.teachers?.name || 'Unknown',
        teacher_email: r.teachers?.email || '',
      }));

      setResults(formattedResults as IMFRMResult[]);
    } catch (error) {
      console.error('Error fetching results:', error);
      setMessage(`❌ 결과 조회 실패: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>📊 MFRM 분석</h1>

      {/* 메시지 */}
      {message && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: message.includes('❌') ? '#fee2e2' : '#dbeafe',
            color: message.includes('❌') ? '#991b1b' : '#1e40af',
            borderRadius: '8px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* 왼쪽: 새 분석 시작 & 분석 목록 */}
        <div>
          {/* 새 분석 시작 */}
          <div style={{ marginBottom: '30px', padding: '20px', border: '2px solid #3b82f6', borderRadius: '8px' }}>
            <h3>새 분석 시작</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>분석 이름 *</label>
              <input
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                placeholder="예: 2025-1학기"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="분석에 대한 설명"
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <button
              onClick={startAnalysis}
              disabled={analyzing || !runName.trim()}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: analyzing || !runName.trim() ? '#ccc' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: analyzing || !runName.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {analyzing ? '분석 중...' : '분석 시작'}
            </button>
          </div>

          {/* 분석 목록 */}
          <h3>이전 분석</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {runs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                아직 분석 이력이 없습니다
              </div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => viewResults(run.id)}
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    border: selectedRun?.id === run.id ? '2px solid #3b82f6' : '1px solid #ccc',
                    borderRadius: '8px',
                    backgroundColor: selectedRun?.id === run.id ? '#dbeafe' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{run.name}</div>
                  <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                    {formatDateTime(run.created_at)}
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: '5px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8em',
                      backgroundColor:
                        run.status === 'completed'
                          ? '#d1fae5'
                          : run.status === 'failed'
                          ? '#fee2e2'
                          : '#fef3c7',
                      color:
                        run.status === 'completed'
                          ? '#065f46'
                          : run.status === 'failed'
                          ? '#991b1b'
                          : '#92400e',
                    }}
                  >
                    {run.status === 'completed'
                      ? '완료'
                      : run.status === 'failed'
                      ? '실패'
                      : run.status === 'running'
                      ? '진행중'
                      : '대기'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 오른쪽: 분석 결과 */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>로딩 중...</div>
          ) : selectedRun ? (
            <>
              <h2>{selectedRun.name}</h2>
              {selectedRun.description && (
                <p style={{ color: '#666', marginBottom: '20px' }}>{selectedRun.description}</p>
              )}

              {/* 분석 요약 */}
              <div
                style={{
                  padding: '15px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <h4>분석 요약</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>총 점수: {selectedRun.total_scores}개</div>
                  <div>수렴: {selectedRun.convergence ? '✅ 성공' : '❌ 실패'}</div>
                  <div>시작: {formatDateTime(selectedRun.started_at)}</div>
                  <div>완료: {formatDateTime(selectedRun.completed_at)}</div>
                </div>
              </div>

              {/* 교사별 결과 */}
              <h3>교사별 MFRM 파라미터</h3>
              {results.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  결과가 없습니다
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                          교사
                        </th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                          엄격성
                        </th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                          Infit
                        </th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                          Outfit
                        </th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                          평균 점수
                        </th>
                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>
                          채점 수
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                          피드백
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr
                          key={result.id}
                          style={{
                            backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                          }}
                        >
                          <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ fontWeight: 'bold' }}>{result.teacher_name}</div>
                            <div style={{ fontSize: '0.85em', color: '#666' }}>{result.teacher_email}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                            <div
                              style={{
                                fontWeight: 'bold',
                                color: getSeverityColor(result.severity),
                              }}
                            >
                              {formatNumber(result.severity)}
                            </div>
                            <div style={{ fontSize: '0.8em', color: '#666' }}>
                              {getSeverityLevel(result.severity)}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                            <div
                              style={{
                                fontWeight: 'bold',
                                color: getConsistencyColor(result.infit),
                              }}
                            >
                              {formatNumber(result.infit)}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                            <div
                              style={{
                                fontWeight: 'bold',
                                color: getConsistencyColor(result.outfit),
                              }}
                            >
                              {formatNumber(result.outfit)}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                            {formatNumber(result.mean_score)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                            {result.total_ratings}
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.9em', borderBottom: '1px solid #e5e7eb' }}>
                            {result.feedback || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              왼쪽에서 분석을 선택하거나 새로운 분석을 시작하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;

