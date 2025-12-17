import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IEssay, IEssayFormData } from '../types';
import { EssayForm } from '../components/admin/EssayForm';

/**
 * 관리자 모드: 에세이 관리 페이지
 * Blueprint v0.9: 에세이 입력, 수정, 앵커/캘리브레이션 설정
 */
export const EssayManagement: React.FC = () => {
  const [essays, setEssays] = useState<IEssay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEssay, setEditingEssay] = useState<IEssay | null>(null);
  const [filter, setFilter] = useState<'all' | 'anchor' | 'calibration' | 'regular'>('all');

  // 통계
  const [stats, setStats] = useState({
    total: 0,
    anchor: 0,
    calibration: 0,
    active: 0,
  });

  useEffect(() => {
    fetchEssays();
  }, [filter]);

  const fetchEssays = async () => {
    try {
      setLoading(true);
      let query = supabase.from('essays').select('*').order('created_at', { ascending: false });

      if (filter === 'anchor') {
        query = query.eq('is_anchor', true);
      } else if (filter === 'calibration') {
        query = query.eq('is_calibration', true);
      } else if (filter === 'regular') {
        query = query.eq('is_anchor', false).eq('is_calibration', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEssays(data || []);
      
      // 통계 계산
      if (filter === 'all') {
        setStats({
          total: data?.length || 0,
          anchor: data?.filter(e => e.is_anchor).length || 0,
          calibration: data?.filter(e => e.is_calibration).length || 0,
          active: data?.filter(e => e.is_active).length || 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '에세이 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEssay = async (formData: IEssayFormData) => {
    const { data, error } = await supabase.from('essays').insert([formData]).select();

    if (error) throw error;

    setShowForm(false);
    fetchEssays();
    alert('에세이가 추가되었습니다.');
  };

  const handleUpdateEssay = async (formData: IEssayFormData) => {
    if (!editingEssay) return;

    const { error } = await supabase
      .from('essays')
      .update(formData)
      .eq('id', editingEssay.id);

    if (error) throw error;

    setEditingEssay(null);
    setShowForm(false);
    fetchEssays();
    alert('에세이가 수정되었습니다.');
  };

  const handleDeleteEssay = async (essayId: string) => {
    if (!window.confirm('정말로 이 에세이를 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('essays').delete().eq('id', essayId);

    if (error) {
      alert('삭제 실패: ' + error.message);
      return;
    }

    fetchEssays();
    alert('에세이가 삭제되었습니다.');
  };

  const handleToggleActive = async (essay: IEssay) => {
    const { error } = await supabase
      .from('essays')
      .update({ is_active: !essay.is_active })
      .eq('id', essay.id);

    if (error) {
      alert('상태 변경 실패: ' + error.message);
      return;
    }

    fetchEssays();
  };

  if (showForm) {
    return (
      <EssayForm
        onSubmit={editingEssay ? handleUpdateEssay : handleCreateEssay}
        onCancel={() => {
          setShowForm(false);
          setEditingEssay(null);
        }}
        initialData={editingEssay ? (editingEssay as any) : undefined}
        isEditMode={!!editingEssay}
      />
    );
  }

  return (
    <div className="essay-management">
      <div className="header">
        <h1>에세이 관리</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + 새 에세이 추가
        </button>
      </div>

      {/* Blueprint 통계 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">전체 에세이</div>
          <div className="stat-value">{stats.total}편</div>
        </div>
        <div className="stat-card anchor">
          <div className="stat-label">앵커 에세이</div>
          <div className="stat-value">{stats.anchor}편</div>
          <div className="stat-target">권장: 12-16편</div>
        </div>
        <div className="stat-card calibration">
          <div className="stat-label">캘리브레이션 세트</div>
          <div className="stat-value">{stats.calibration}편</div>
          <div className="stat-target">권장: 24-32편</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">활성 에세이</div>
          <div className="stat-value">{stats.active}편</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="filter-bar">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          전체
        </button>
        <button
          className={filter === 'anchor' ? 'active' : ''}
          onClick={() => setFilter('anchor')}
        >
          앵커 에세이
        </button>
        <button
          className={filter === 'calibration' ? 'active' : ''}
          onClick={() => setFilter('calibration')}
        >
          캘리브레이션 세트
        </button>
        <button
          className={filter === 'regular' ? 'active' : ''}
          onClick={() => setFilter('regular')}
        >
          일반 에세이
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && <div className="error-message">{error}</div>}

      {/* 에세이 목록 */}
      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        <div className="essay-list">
          {essays.length === 0 ? (
            <div className="empty-state">에세이가 없습니다. 새 에세이를 추가해주세요.</div>
          ) : (
            <table className="essay-table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>학년</th>
                  <th>난이도</th>
                  <th>어절 수</th>
                  <th>유형</th>
                  <th>상태</th>
                  <th>생성일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {essays.map(essay => (
                  <tr key={essay.id} className={!essay.is_active ? 'inactive' : ''}>
                    <td>
                      <div className="essay-title">{essay.title}</div>
                      <div className="essay-preview">{essay.content.substring(0, 60)}...</div>
                    </td>
                    <td>{essay.grade_level}</td>
                    <td>
                      <span className={`badge difficulty-${essay.difficulty_level}`}>
                        {essay.difficulty_level === 'low' && '낮음'}
                        {essay.difficulty_level === 'medium' && '중간'}
                        {essay.difficulty_level === 'high' && '높음'}
                      </span>
                    </td>
                    <td>{essay.word_count || '-'}</td>
                    <td>
                      <div className="essay-tags">
                        {essay.is_anchor && <span className="tag anchor">앵커</span>}
                        {essay.is_calibration && <span className="tag calibration">캘리브레이션</span>}
                        {!essay.is_anchor && !essay.is_calibration && <span className="tag regular">일반</span>}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(essay)}
                        className={`status-toggle ${essay.is_active ? 'active' : 'inactive'}`}
                      >
                        {essay.is_active ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td>{new Date(essay.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => {
                            setEditingEssay(essay);
                            setShowForm(true);
                          }}
                          className="btn-edit"
                        >
                          수정
                        </button>
                        <button onClick={() => handleDeleteEssay(essay.id)} className="btn-delete">
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
</div>
  );
};


