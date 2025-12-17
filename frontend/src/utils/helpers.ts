// Utility Helper Functions

// 엄격성(severity) 레벨 분류
export function getSeverityLevel(severity: number | null): string {
  if (severity === null) return '분석 불가';
  if (severity > 0.5) return '매우 엄격';
  if (severity > 0.2) return '다소 엄격';
  if (severity > -0.2) return '적정';
  if (severity > -0.5) return '다소 관대';
  return '매우 관대';
}

// 엄격성 색상 코드
export function getSeverityColor(severity: number | null): string {
  if (severity === null) return '#gray';
  if (Math.abs(severity) <= 0.2) return '#10b981'; // 적정 (green)
  if (Math.abs(severity) <= 0.5) return '#f59e0b'; // 주의 (orange)
  return '#ef4444'; // 경고 (red)
}

// 일관성(infit) 레벨 분류
export function getConsistencyLevel(infit: number | null): string {
  if (infit === null) return '분석 불가';
  if (infit < 0.7) return '과도하게 일관적';
  if (infit <= 1.3) return '일관적';
  if (infit <= 2.0) return '다소 불일치';
  return '매우 불일치';
}

// 일관성 색상 코드
export function getConsistencyColor(infit: number | null): string {
  if (infit === null) return '#gray';
  if (infit >= 0.7 && infit <= 1.3) return '#10b981'; // 적정 (green)
  if (infit < 0.7 || (infit > 1.3 && infit <= 2.0)) return '#f59e0b'; // 주의 (orange)
  return '#ef4444'; // 경고 (red)
}

// 날짜 포맷팅
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 날짜시간 포맷팅
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 소수점 반올림
export function formatNumber(num: number | null, decimals: number = 2): string {
  if (num === null) return '-';
  return num.toFixed(decimals);
}

// 퍼센트 계산
export function calculatePercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// UUID 유효성 검증
export function isValidUUID(uuid: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

// 에러 메시지 추출
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
}

// 로딩 지연 (UX 개선)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 점수 범위 검증
export function isValidScore(score: number, min: number, max: number): boolean {
  return score >= min && score <= max && Number.isInteger(score);
}

// 통계 요약
export function calculateStats(values: number[]) {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      std: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  return { mean, median, min, max, std };
}

