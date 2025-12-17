import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  institution?: string;
}

interface AuthContextType {
  user: User | null;
  userType: 'admin' | 'teacher' | null;
  loading: boolean;
  login: (email: string, password: string, type: 'admin' | 'teacher') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'admin' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 세션 복원
    const storedUser = localStorage.getItem('mfrm_user');
    const storedType = localStorage.getItem('mfrm_user_type');

    if (storedUser && storedType) {
      setUser(JSON.parse(storedUser));
      setUserType(storedType as 'admin' | 'teacher');
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string, type: 'admin' | 'teacher') => {
    try {
      // 실제로는 Supabase Auth를 사용하거나 별도 인증 API를 구축해야 함
      // 여기서는 간단히 이메일 조회로 구현 (데모용)
      
      const tableName = type === 'admin' ? 'admins' : 'teachers';
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      // 실제로는 비밀번호 검증이 필요함 (여기서는 생략)
      const userData: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        institution: data.institution,
      };

      setUser(userData);
      setUserType(type);

      // 세션 저장
      localStorage.setItem('mfrm_user', JSON.stringify(userData));
      localStorage.setItem('mfrm_user_type', type);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '로그인 실패');
    }
  };

  const logout = () => {
    setUser(null);
    setUserType(null);
    localStorage.removeItem('mfrm_user');
    localStorage.removeItem('mfrm_user_type');
  };

  return (
    <AuthContext.Provider value={{ user, userType, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

