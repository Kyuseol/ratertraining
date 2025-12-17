// Rater Training Main Component
// 채점 인터페이스

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IEssay, IRubric, IScore } from '../types';
import { getErrorMessage } from '../utils/helpers';

interface RatingFormData {
  essay_id: string;
  teacher_id: string;
  ratings: { [rubric_id: string]: number };
}

const RaterTrainingApp: React.FC = () => {
  const [essays, setEssays] = useState<IEssay[]>([]);
  const [rubrics, setRubrics] = useState<IRubric[]>([]);
  const [selectedEssay, setSelectedEssay] = useState<IEssay | null>(null);
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [teacherId, setTeacherId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    fetchEssays();
    fetchRubrics();
    loadTeacherId();
  }, []);

  const fetchEssays = async () => {
    try {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEssays(data || []);
    } catch (error) {
      console.error('Error fetching essays:', error);
      setMessage('에세이 목록을 불러오는데 실패했습니다.');
    }
  };

  const fetchRubrics = async () => {
    try {
      const { data, error } = await supabase
        .from('rubrics')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setRubrics(data || []);
    } catch (error) {
      console.error('Error fetching rubrics:', error);
      setMessage('채점 기준을 불러오는데 실패했습니다.');
    }
  };

  const loadTeacherId = () => {
    // 실제로는 인증 시스템에서 가져와야 함
    const savedId = localStorage.getItem('teacher_id');
    if (savedId) {
      setTeacherId(savedId);
    }
  };

  const selectEssay = (essay: IEssay) => {
    setSelectedEssay(essay);
    setRatings({});
    setStartTime(new Date());
    setMessage('');
  };

  const updateRating = (rubricId: string, score: number) => {
    setRatings((prev) => ({
      ...prev,
      [rubricId]: score,
    }));
  };

  const submitRatings = async () => {
    if (!selectedEssay || !teacherId) {
      setMessage('교사 ID와 에세이를 선택해주세요.');
      return;
    }

    // 모든 항목 채점 확인
    const allRated = rubrics.every((rubric) => ratings[rubric.id] !== undefined);
    if (!allRated) {
      setMessage('모든 채점 항목에 점수를 입력해주세요.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const duration = startTime
        ? Math.round((new Date().getTime() - startTime.getTime()) / 1000)
        : null;

      // 각 루브릭별로 점수 저장
      const promises = rubrics.map((rubric) => {
        const scoreData: Partial<IScore> = {
          teacher_id: teacherId,
          essay_id: selectedEssay.id,
          rubric_id: rubric.id,
          score: ratings[rubric.id],
          rating_duration_seconds: duration,
        };

        return supabase.from('scores').insert([scoreData]);
      });

      const results = await Promise.all(promises);
      
      // 에러 확인
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      setMessage('✅ 채점이 성공적으로 저장되었습니다!');
      setSelectedEssay(null);
      setRatings({});
      setStartTime(null);
      
      // 잠시 후 메시지 제거
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error submitting ratings:', error);
      setMessage(`❌ 채점 저장 실패: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1>📝 에세이 채점 시스템</h1>
      
      {/* 교사 ID 입력 */}
      {!teacherId && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
          <label>
            교사 ID: 
            <input
              type="text"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              onBlur={(e) => localStorage.setItem('teacher_id', e.target.value)}
              style={{ marginLeft: '10px', padding: '8px', width: '300px' }}
              placeholder="교사 UUID 입력"
            />
          </label>
          <p style={{ fontSize: '0.9em', color: '#92400e', marginTop: '5px' }}>
            * 실제 운영 시에는 로그인 시스템으로 대체됩니다
          </p>
        </div>
      )}

      {/* 메시지 표시 */}
      {message && (
        <div 
          style={{ 
            padding: '15px', 
            marginBottom: '20px', 
            backgroundColor: message.includes('❌') ? '#fee2e2' : '#d1fae5',
            color: message.includes('❌') ? '#991b1b' : '#065f46',
            borderRadius: '8px'
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* 왼쪽: 에세이 목록 */}
        <div>
          <h2>에세이 목록</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {essays.map((essay) => (
              <button
                key={essay.id}
                onClick={() => selectEssay(essay)}
                style={{
                  padding: '15px',
                  textAlign: 'left',
                  border: selectedEssay?.id === essay.id ? '2px solid #3b82f6' : '1px solid #ccc',
                  borderRadius: '8px',
                  backgroundColor: selectedEssay?.id === essay.id ? '#dbeafe' : 'white',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{essay.title}</div>
                <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                  {essay.grade_level} | {essay.word_count}자
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽: 채점 인터페이스 */}
        <div>
          {selectedEssay ? (
            <>
              <h2>{selectedEssay.title}</h2>
              <div 
                style={{ 
                  padding: '15px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '8px',
                  marginBottom: '20px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedEssay.content}</p>
              </div>

              <h3>채점하기</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {rubrics.map((rubric) => (
                  <div key={rubric.id} style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                      {rubric.name}
                    </div>
                    {rubric.description && (
                      <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                        {rubric.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {Array.from(
                        { length: rubric.max_score - rubric.min_score + 1 },
                        (_, i) => rubric.min_score + i
                      ).map((score) => (
                        <button
                          key={score}
                          onClick={() => updateRating(rubric.id, score)}
                          style={{
                            padding: '10px 15px',
                            border: ratings[rubric.id] === score ? '2px solid #3b82f6' : '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: ratings[rubric.id] === score ? '#3b82f6' : 'white',
                            color: ratings[rubric.id] === score ? 'white' : 'black',
                            cursor: 'pointer',
                            fontWeight: ratings[rubric.id] === score ? 'bold' : 'normal',
                          }}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={submitRatings}
                disabled={loading || !teacherId}
                style={{
                  marginTop: '20px',
                  padding: '15px 30px',
                  backgroundColor: loading || !teacherId ? '#ccc' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1em',
                  fontWeight: 'bold',
                  cursor: loading || !teacherId ? 'not-allowed' : 'pointer',
                  width: '100%',
                }}
              >
                {loading ? '저장 중...' : '채점 완료'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              왼쪽에서 에세이를 선택해주세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaterTrainingApp; 