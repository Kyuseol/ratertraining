// R Backend API Client

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_R_API_URL || 'http://localhost:8000';

class MFRMApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000, // MFRM 분석은 시간이 걸릴 수 있음 (2분)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 에러 인터셉터
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // 헬스 체크
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  // MFRM 분석 실행
  async runAnalysis(params: {
    run_name: string;
    description?: string;
    teacher_ids?: string[];
    essay_ids?: string[];
  }) {
    const response = await this.client.post('/api/mfrm/analyze', params);
    return response.data;
  }

  // 분석 결과 조회
  async getResults(runId: string) {
    const response = await this.client.get(`/api/mfrm/results/${runId}`);
    return response.data;
  }

  // 교사별 분석 이력 조회
  async getTeacherHistory(teacherId: string) {
    const response = await this.client.get(`/api/mfrm/teacher/${teacherId}`);
    return response.data;
  }

  // 분석 실행 목록
  async listRuns(status?: string, limit: number = 50) {
    const response = await this.client.get('/api/mfrm/runs', {
      params: { status, limit },
    });
    return response.data;
  }

  // 교사 통계
  async getTeacherStats() {
    const response = await this.client.get('/api/stats/teachers');
    return response.data;
  }

  // 에세이 통계
  async getEssayStats() {
    const response = await this.client.get('/api/stats/essays');
    return response.data;
  }

  // 최신 MFRM 결과
  async getLatestResults() {
    const response = await this.client.get('/api/stats/latest');
    return response.data;
  }
}

export const mfrmApi = new MFRMApiClient();

