import React, { useState } from 'react';
import { IEssayFormData } from '../../types';

interface EssayFormProps {
  onSubmit: (data: IEssayFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<IEssayFormData>;
  isEditMode?: boolean;
}

/**
 * 관리자 모드: 에세이 입력/수정 폼
 * Blueprint v0.9: 앵커 에세이, 캘리브레이션 세트 플래그 지원
 */
export const EssayForm: React.FC<EssayFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  isEditMode = false,
}) => {
  const [formData, setFormData] = useState<IEssayFormData>({
    title: initialData.title || '',
    content: initialData.content || '',
    grade_level: initialData.grade_level || '고등학교 1학년',
    prompt: initialData.prompt || '',
    word_count: initialData.word_count,
    is_anchor: initialData.is_anchor || false,
    is_calibration: initialData.is_calibration || false,
    anchor_explanation: initialData.anchor_explanation || '',
    difficulty_level: initialData.difficulty_level || 'medium',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'word_count') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 검증
    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    // 앵커 에세이인 경우 해설 필수
    if (formData.is_anchor && !formData.anchor_explanation?.trim()) {
      setError('앵커 에세이는 해설 카드를 작성해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '에세이 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="essay-form">
      <h2>{isEditMode ? '에세이 수정' : '새 에세이 추가'}</h2>

      {error && (
        <div className="error-message" style={{ color: 'red', padding: '10px', marginBottom: '10px', border: '1px solid red', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* 기본 정보 */}
      <div className="form-section">
        <h3>기본 정보</h3>
        
        <div className="form-group">
          <label htmlFor="title">제목 *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="에세이 제목을 입력하세요"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="grade_level">학년</label>
          <select
            id="grade_level"
            name="grade_level"
            value={formData.grade_level}
            onChange={handleChange}
          >
            <option value="중학교 1학년">중학교 1학년</option>
            <option value="중학교 2학년">중학교 2학년</option>
            <option value="중학교 3학년">중학교 3학년</option>
            <option value="고등학교 1학년">고등학교 1학년</option>
            <option value="고등학교 2학년">고등학교 2학년</option>
            <option value="고등학교 3학년">고등학교 3학년</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="prompt">작성 프롬프트</label>
          <textarea
            id="prompt"
            name="prompt"
            value={formData.prompt}
            onChange={handleChange}
            rows={3}
            placeholder="학생에게 제시된 작성 주제나 지시사항"
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">에세이 내용 *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={15}
            placeholder="에세이 전문을 입력하세요"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="word_count">어절 수</label>
          <input
            type="number"
            id="word_count"
            name="word_count"
            value={formData.word_count || ''}
            onChange={handleChange}
            placeholder="자동 계산 또는 직접 입력"
            min="0"
          />
        </div>
      </div>

      {/* Blueprint v0.9: 앵커/캘리브레이션 설정 */}
      <div className="form-section">
        <h3>Blueprint 설정</h3>

        <div className="form-group">
          <label htmlFor="difficulty_level">난이도</label>
          <select
            id="difficulty_level"
            name="difficulty_level"
            value={formData.difficulty_level || 'medium'}
            onChange={handleChange}
          >
            <option value="low">낮음</option>
            <option value="medium">중간</option>
            <option value="high">높음</option>
          </select>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="is_anchor"
              checked={formData.is_anchor}
              onChange={handleChange}
            />
            앵커 에세이로 설정 (권장: 12-16편)
          </label>
          <small>신규 교사 온보딩 및 드리프트 감지용 에세이</small>
        </div>

        {formData.is_anchor && (
          <div className="form-group">
            <label htmlFor="anchor_explanation">앵커 해설 카드 *</label>
            <textarea
              id="anchor_explanation"
              name="anchor_explanation"
              value={formData.anchor_explanation}
              onChange={handleChange}
              rows={6}
              placeholder="9개 평가요소 각각에 대한 경계 근거 주해 (1↔2, 2↔3)를 작성하세요."
              required={formData.is_anchor}
            />
            <small>예시: [주장의 명료성] 1↔2: 주장이 제시되나 모호함 / 2↔3: 주장이 명확하고 구체적</small>
          </div>
        )}

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="is_calibration"
              checked={formData.is_calibration}
              onChange={handleChange}
            />
            캘리브레이션 세트에 포함 (권장: 24-32편)
          </label>
          <small>초기 고정척도 구축을 위한 에세이</small>
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? '저장 중...' : isEditMode ? '수정 완료' : '에세이 추가'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          취소
        </button>
      </div>
    </form>
  );
};


