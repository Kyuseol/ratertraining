import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { IExpertRater, IExpertScoringProgress } from '../types';
import './ExpertManagement.css';

/**
 * 관리자 모드: 전문가 평가자 관리 페이지
 * Blueprint v0.9: 전문가 개별 채점 기반 캘리브레이션
 */
export const ExpertManagement: React.FC = () => {
  const navigate = useNavigate();
  
  // 데이터 상태
  const [experts, setExperts] = useState<IExpertRater[]>([]);
  const [progress, setProgress] = useState<IExpertScoringProgress[]>([]);
  
  // UI 상태
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpert, setEditingExpert] = useState<IExpertRater | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    expertise_area: '',
    years_of_experience: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 전문가 목록 조회
      const { data: expertsData, error: expertsError } = await supabase
        .from('expert_raters')
        .select('*')
        .order('created_at', { ascending: false });

      if (expertsError && expertsError.code !== 'PGRST116') {
        throw expertsError;
      }

      setExperts(expertsData || []);

      // 채점 진행률 계산
      if (expertsData && expertsData.length > 0) {
        const progressData = await calculateProgress(expertsData);
        setProgress(progressData);
      }

    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = async (experts: IExpertRater[]): Promise<IExpertScoringProgress[]> => {
    const progressList: IExpertScoringProgress[] = [];

    // 목표 에세이 수와 평가요소 수
    const { count: targetEssays } = await supabase
      .from('essays')
      .select('*', { count: 'exact', head: true })
      .or('is_anchor.eq.true,is_calibration.eq.true')
      .eq('is_active', true);

    const { count: rubricsCount } = await supabase
      .from('rubrics')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const totalExpected = (targetEssays || 0) * (rubricsCount || 8);

    for (const expert of experts) {
      // 해당 전문가의 채점 수
      const { data: scores, count } = await supabase
        .from('expert_scores')
        .select('essay_id', { count: 'exact' })
        .eq('expert_id', expert.id);

      const essaysScored = new Set(scores?.map(s => s.essay_id) || []).size;
      const totalScores = count || 0;

      progressList.push({
        expert_id: expert.id,
        expert_name: expert.name,
        email: expert.email,
        essays_scored: essaysScored,
        total_scores: totalScores,
        target_essays: targetEssays || 0,
        rubrics_per_essay: rubricsCount || 8,
        completion_percentage: totalExpected > 0 ? Math.round((totalScores / totalExpected) * 100) : 0,
      });
    }

    return progressList;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '이름을 입력해주세요.' });
      return;
    }

    try {
      if (editingExpert) {
        // 수정
        const { error } = await supabase
          .from('expert_raters')
          .update({
            name: formData.name,
            email: formData.email || null,
            institution: formData.institution || null,
            expertise_area: formData.expertise_area || null,
            years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
          })
          .eq('id', editingExpert.id);

        if (error) throw error;
        setMessage({ type: 'success', text: '전문가 정보가 수정되었습니다.' });
      } else {
        // 추가
        const { error } = await supabase
          .from('expert_raters')
          .insert({
            name: formData.name,
            email: formData.email || null,
            institution: formData.institution || null,
            expertise_area: formData.expertise_area || null,
            years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
          });

        if (error) throw error;
        setMessage({ type: 'success', text: '전문가가 추가되었습니다.' });
      }

      // 폼 초기화
      setFormData({ name: '', email: '', institution: '', expertise_area: '', years_of_experience: '' });
      setShowForm(false);
      setEditingExpert(null);
      fetchData();

    } catch (err) {
      console.error('저장 실패:', err);
      setMessage({ type: 'error', text: '저장에 실패했습니다. ' + (err as Error).message });
    }
  };

  const handleEdit = (expert: IExpertRater) => {
    setEditingExpert(expert);
    setFormData({
      name: expert.name,
      email: expert.email || '',
      institution: expert.institution || '',
      expertise_area: expert.expertise_area || '',
      years_of_experience: expert.years_of_experience?.toString() || '',
    });
    setShowForm(true);
  };

  const handleToggleActive = async (expert: IExpertRater) => {
    try {
      const { error } = await supabase
        .from('expert_raters')
        .update({ is_active: !expert.is_active })
        .eq('id', expert.id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  const handleDelete = async (expert: IExpertRater) => {
    if (!window.confirm(`"${expert.name}" 전문가를 삭제하시겠습니까? 해당 전문가의 모든 채점 데이터도 삭제됩니다.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expert_raters')
        .delete()
        .eq('id', expert.id);

      if (error) throw error;
      setMessage({ type: 'success', text: '전문가가 삭제되었습니다.' });
      fetchData();
    } catch (err) {
      console.error('삭제 실패:', err);
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    }
  };

  const getExpertProgress = (expertId: string): IExpertScoringProgress | undefined => {
    return progress.find(p => p.expert_id === expertId);
  };

  const getOverallStats = () => {
    const activeExperts = experts.filter(e => e.is_active).length;
    const totalScores = progress.reduce((sum, p) => sum + p.total_scores, 0);
    const avgCompletion = progress.length > 0 
      ? Math.round(progress.reduce((sum, p) => sum + p.completion_percentage, 0) / progress.length)
      : 0;

    return { activeExperts, totalScores, avgCompletion };
  };

  if (loading) {
    return <div className="expert-management loading">로딩 중...</div>;
  }

  const stats = getOverallStats();

  return (
    <div className="expert-management">
      {/* 헤더 */}
      <div className="em-header">
        <div className="em-header-content">
          <h1>👨‍🏫 전문가 평가자 관리</h1>
          <p>캘리브레이션을 위한 전문가 패널 구성 및 채점 진행 관리</p>
        </div>
        <div className="em-header-nav">
          <button onClick={() => navigate('/admin/expert-rating')} className="btn-nav rating">
            ✍️ 전문가 채점
          </button>
          <button onClick={() => navigate('/admin/calibration')} className="btn-nav">
            ⚙️ 캘리브레이션
          </button>
          <button onClick={() => navigate('/admin')} className="btn-nav">
            ← 대시보드
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`em-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* 통계 */}
      <div className="em-stats">
        <div className="stat-card main">
          <div className="stat-value">{stats.activeExperts}</div>
          <div className="stat-label">활성 전문가</div>
          <div className="stat-target">권장: 5명 이상</div>
          <div className={`stat-status ${stats.activeExperts >= 5 ? 'good' : 'danger'}`}>
            {stats.activeExperts >= 5 ? '✓ 충분' : '✕ 부족'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalScores}</div>
          <div className="stat-label">총 채점 수</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgCompletion}%</div>
          <div className="stat-label">평균 진행률</div>
        </div>
        <div className="stat-card action">
          <button className="btn-add" onClick={() => { setShowForm(true); setEditingExpert(null); setFormData({ name: '', email: '', institution: '', expertise_area: '', years_of_experience: '' }); }}>
            + 전문가 추가
          </button>
        </div>
      </div>

      {/* 전문가 추가/수정 폼 */}
      {showForm && (
        <div className="form-overlay" onClick={() => setShowForm(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingExpert ? '전문가 정보 수정' : '새 전문가 추가'}</h2>
              <button onClick={() => setShowForm(false)} className="close-btn">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 김전문"
                  required
                />
              </div>
              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="예: expert@example.com"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>소속 기관</label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="예: 서울교대"
                  />
                </div>
                <div className="form-group">
                  <label>전문 분야</label>
                  <input
                    type="text"
                    value={formData.expertise_area}
                    onChange={(e) => setFormData({ ...formData, expertise_area: e.target.value })}
                    placeholder="예: 국어교육"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>경력 (년)</label>
                <input
                  type="number"
                  value={formData.years_of_experience}
                  onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                  placeholder="예: 10"
                  min="0"
                  max="50"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">
                  취소
                </button>
                <button type="submit" className="btn-submit">
                  {editingExpert ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 전문가 목록 */}
      <div className="expert-list">
        <h2>📋 전문가 목록</h2>
        
        {experts.length === 0 ? (
          <div className="empty-state">
            <p>등록된 전문가가 없습니다.</p>
            <button onClick={() => setShowForm(true)} className="btn-add-large">
              + 첫 번째 전문가 추가
            </button>
          </div>
        ) : (
          <div className="expert-grid">
            {experts.map(expert => {
              const expertProgress = getExpertProgress(expert.id);
              
              return (
                <div 
                  key={expert.id} 
                  className={`expert-card ${!expert.is_active ? 'inactive' : ''}`}
                >
                  <div className="expert-card-header">
                    <div className="expert-info">
                      <h3>{expert.name}</h3>
                      {!expert.is_active && <span className="inactive-badge">비활성</span>}
                    </div>
                    <div className="expert-actions">
                      <button onClick={() => handleEdit(expert)} className="btn-edit" title="수정">
                        ✏️
                      </button>
                      <button onClick={() => handleToggleActive(expert)} className="btn-toggle" title={expert.is_active ? '비활성화' : '활성화'}>
                        {expert.is_active ? '🔒' : '🔓'}
                      </button>
                      <button onClick={() => handleDelete(expert)} className="btn-delete" title="삭제">
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="expert-details">
                    {expert.email && <div className="detail-item">📧 {expert.email}</div>}
                    {expert.institution && <div className="detail-item">🏛️ {expert.institution}</div>}
                    {expert.expertise_area && <div className="detail-item">📚 {expert.expertise_area}</div>}
                    {expert.years_of_experience && <div className="detail-item">⏱️ 경력 {expert.years_of_experience}년</div>}
                  </div>

                  {expertProgress && (
                    <div className="expert-progress">
                      <div className="progress-header">
                        <span>채점 진행률</span>
                        <span>{expertProgress.completion_percentage}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${expertProgress.completion_percentage}%` }}
                        />
                      </div>
                      <div className="progress-details">
                        <span>{expertProgress.essays_scored}/{expertProgress.target_essays} 에세이</span>
                        <span>{expertProgress.total_scores}개 채점</span>
                      </div>
                    </div>
                  )}

                  <button 
                    className="btn-start-rating"
                    onClick={() => navigate(`/admin/expert-rating?expert=${expert.id}`)}
                    disabled={!expert.is_active}
                  >
                    채점 시작 →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertManagement;

