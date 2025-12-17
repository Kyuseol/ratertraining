import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 로그인 페이지
 * Blueprint v0.9: 관리자/교사 구분 로그인
 */
export const LoginPage: React.FC = () => {
  const [userType, setUserType] = useState<'admin' | 'teacher'>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password, userType);
      navigate(userType === 'admin' ? '/admin' : '/teacher');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          width: '100%',
          maxWidth: '450px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#333' }}>
            📚 MFRM 쓰기 평가 문식성
          </h1>
          <p style={{ margin: 0, color: '#777', fontSize: '14px' }}>
            Blueprint v0.9 - 교사 채점 진단 시스템
          </p>
        </div>

        {/* 사용자 타입 선택 */}
        <div style={{ marginBottom: '25px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => setUserType('teacher')}
              style={{
                padding: '15px',
                border: userType === 'teacher' ? '2px solid #4CAF50' : '2px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: userType === 'teacher' ? '#E8F5E9' : 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 600,
                color: userType === 'teacher' ? '#2E7D32' : '#777',
                transition: 'all 0.2s',
              }}
            >
              👨‍🏫 교사
            </button>
            <button
              type="button"
              onClick={() => setUserType('admin')}
              style={{
                padding: '15px',
                border: userType === 'admin' ? '2px solid #4CAF50' : '2px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: userType === 'admin' ? '#E8F5E9' : 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 600,
                color: userType === 'admin' ? '#2E7D32' : '#777',
                transition: 'all 0.2s',
              }}
            >
              👔 관리자
            </button>
          </div>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#555',
                fontSize: '14px',
              }}
            >
              이메일
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#555',
                fontSize: '14px',
              }}
            >
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '15px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#FFEBEE',
                color: '#C62828',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 데모 안내 */}
        <div
          style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#E3F2FD',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1565C0',
          }}
        >
          <strong>데모 계정</strong>
          <div style={{ marginTop: '8px' }}>
            <div>👨‍🏫 교사: teacher1@example.com</div>
            <div>👔 관리자: admin@example.com</div>
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#777' }}>
              (비밀번호는 임의로 입력하세요 - 데모 모드)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

