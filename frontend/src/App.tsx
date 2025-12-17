// Main App Component
// React Router로 페이지 라우팅 - Blueprint v0.9
// 관리자 모드 / 교사 모드 구분

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

// Pages
import { LoginPage } from './pages/LoginPage';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { RatingPage } from './pages/RatingPage';
import { TeacherReport } from './pages/TeacherReport';
import { TrainingTasks } from './pages/TrainingTasks';
import { AdminDashboard } from './pages/AdminDashboard';
import { EssayManagement } from './pages/EssayManagement';
import { AnchorManagement } from './pages/AnchorManagement';
import AnalysisPage from './pages/AnalysisPage';
import { ConsensusScoring } from './pages/ConsensusScoring';
import { CalibrationPage } from './pages/CalibrationPage';
import { ExpertManagement } from './pages/ExpertManagement';
import { ExpertRating } from './pages/ExpertRating';
import { BulkUpload } from './pages/BulkUpload';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

/**
 * 네비게이션 바 컴포넌트
 */
const Navigation: React.FC = () => {
  const { user, userType, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isAdmin = userType === 'admin';
  const isActive = (path: string) => location.pathname === path;

  const linkStyle = (path: string) => ({
    textDecoration: 'none',
    color: isActive(path) ? '#4CAF50' : '#6b7280',
    fontWeight: isActive(path) ? 700 : 500,
    padding: '8px 16px',
    borderRadius: '4px',
    backgroundColor: isActive(path) ? '#E8F5E9' : 'transparent',
    transition: 'all 0.2s',
  });

  return (
    <nav
      style={{
        backgroundColor: 'white',
        borderBottom: '2px solid #e5e7eb',
        padding: '15px 30px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          gap: '30px',
          alignItems: 'center',
        }}
      >
        <Link to={isAdmin ? '/admin' : '/teacher'} style={{ textDecoration: 'none' }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>
            📚 MFRM 쓰기 평가 문식성
          </h2>
        </Link>

        <div style={{ flex: 1, display: 'flex', gap: '5px', alignItems: 'center' }}>
          {isAdmin ? (
            // 관리자 모드 메뉴
            <>
              <Link to="/admin" style={linkStyle('/admin')}>
                🏠 대시보드
              </Link>
              <Link to="/admin/essays" style={linkStyle('/admin/essays')}>
                📝 에세이 관리
              </Link>
              <Link to="/admin/anchor" style={linkStyle('/admin/anchor')}>
                ⚓ 앵커 관리
              </Link>
              <Link to="/admin/analysis" style={linkStyle('/admin/analysis')}>
                📊 MFRM 분석
              </Link>
              <Link to="/admin/bulk-upload" style={linkStyle('/admin/bulk-upload')}>
                📦 대량 업로드
              </Link>
            </>
          ) : (
            // 교사 모드 메뉴
            <>
              <Link to="/teacher" style={linkStyle('/teacher')}>
                🏠 대시보드
              </Link>
              <Link to="/teacher/rating" style={linkStyle('/teacher/rating')}>
                ✍️ 채점하기
              </Link>
              <Link to="/teacher/report" style={linkStyle('/teacher/report')}>
                📈 내 리포트
              </Link>
              <Link to="/teacher/training" style={linkStyle('/teacher/training')}>
                🎯 미세 조정
              </Link>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontSize: '13px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#333' }}>{user.name}</span>
            <span style={{ color: '#777', fontSize: '11px' }}>
              {isAdmin ? '관리자' : '교사'}
            </span>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  );
};

/**
 * 보호된 라우트 (인증 필요)
 */
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredType?: 'admin' | 'teacher';
}> = ({ children, requiredType }) => {
  const { user, userType, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <div>로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredType && userType !== requiredType) {
    return <Navigate to={userType === 'admin' ? '/admin' : '/teacher'} replace />;
  }

  return <>{children}</>;
};

/**
 * 메인 앱 컴포넌트
 */
const AppContent: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // 새로운 디자인 페이지들은 자체 레이아웃을 가지고 있음
  const fullWidthPages = [
    '/teacher',
    '/teacher/rating',
    '/teacher/report',
    '/teacher/training',
    '/admin',
    '/admin/consensus',
    '/admin/calibration',
    '/admin/experts',
    '/admin/expert-rating',
    '/admin/bulk-upload',
  ];
  
  const isFullWidthPage = fullWidthPages.includes(location.pathname);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: isFullWidthPage ? 'transparent' : '#f9fafb' }}>
      {user && !isFullWidthPage && <Navigation />}
      
      <div style={isFullWidthPage ? {} : { maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <Routes>
          {/* 로그인 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 교사 모드 */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute requiredType="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/rating"
            element={
              <ProtectedRoute requiredType="teacher">
                <RatingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/report"
            element={
              <ProtectedRoute requiredType="teacher">
                <TeacherReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/training"
            element={
              <ProtectedRoute requiredType="teacher">
                <TrainingTasks />
              </ProtectedRoute>
            }
          />

          {/* 관리자 모드 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredType="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/essays"
            element={
              <ProtectedRoute requiredType="admin">
                <EssayManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/anchor"
            element={
              <ProtectedRoute requiredType="admin">
                <AnchorManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analysis"
            element={
              <ProtectedRoute requiredType="admin">
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/consensus"
            element={
              <ProtectedRoute requiredType="admin">
                <ConsensusScoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calibration"
            element={
              <ProtectedRoute requiredType="admin">
                <CalibrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/experts"
            element={
              <ProtectedRoute requiredType="admin">
                <ExpertManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/expert-rating"
            element={
              <ProtectedRoute requiredType="admin">
                <ExpertRating />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bulk-upload"
            element={
              <ProtectedRoute requiredType="admin">
                <BulkUpload />
              </ProtectedRoute>
            }
          />

          {/* 기본 리다이렉트 */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
