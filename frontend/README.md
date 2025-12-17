# MFRM Frontend

React + TypeScript 기반 MFRM Rater Training 시스템 프론트엔드

---

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm start
# http://localhost:3000
```

### Build

```bash
npm run build
# Build output: build/
```

---

## 📁 Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── RaterTrainingApp.tsx  # 채점 인터페이스
│   ├── pages/
│   │   └── AnalysisPage.tsx      # MFRM 분석 페이지
│   ├── lib/
│   │   ├── supabase.ts           # Supabase 클라이언트
│   │   └── api.ts                # R API 클라이언트
│   ├── types/
│   │   └── index.ts              # TypeScript 타입 정의
│   ├── utils/
│   │   └── helpers.ts            # 유틸리티 함수
│   ├── App.tsx                   # 메인 앱
│   ├── index.tsx                 # Entry point
│   └── index.css                 # Global styles
├── package.json
└── tsconfig.json
```

---

## 🔧 Environment Variables

`.env` 파일 생성:

```bash
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_R_API_URL=http://localhost:8000
```

---

## 📱 Features

### 1. 채점 인터페이스 (`/`)

- 에세이 목록 조회
- 루브릭별 채점
- Supabase에 점수 저장
- 채점 소요 시간 추적

### 2. MFRM 분석 (`/analysis`)

- 새 분석 시작
- 분석 이력 조회
- 교사별 MFRM 파라미터 확인
- 엄격성/일관성 시각화

---

## 🎨 UI Components

### Colors

- Primary: `#3b82f6` (blue)
- Success: `#10b981` (green)
- Warning: `#f59e0b` (orange)
- Error: `#ef4444` (red)
- Gray: `#6b7280`

### Severity Levels

| Severity | Color | Level |
|----------|-------|-------|
| > 0.5 | red | 매우 엄격 |
| 0.2 ~ 0.5 | orange | 다소 엄격 |
| -0.2 ~ 0.2 | green | 적정 |
| -0.5 ~ -0.2 | orange | 다소 관대 |
| < -0.5 | red | 매우 관대 |

### Consistency (Infit/Outfit)

- 0.7 ~ 1.3: green (일관적)
- < 0.7 or > 1.3: orange/red (불일치)

---

## 🔌 API Integration

### Supabase

```typescript
import { supabase } from '@/lib/supabase';

// 데이터 조회
const { data, error } = await supabase
  .from('essays')
  .select('*')
  .eq('is_active', true);

// 데이터 삽입
const { data, error } = await supabase
  .from('scores')
  .insert([{ teacher_id, essay_id, rubric_id, score }]);
```

### R Backend API

```typescript
import { mfrmApi } from '@/lib/api';

// MFRM 분석 시작
const result = await mfrmApi.runAnalysis({
  run_name: '2025-semester1',
  description: '첫 학기 분석',
});

// 결과 조회
const results = await mfrmApi.getResults(runId);
```

---

## 📦 Dependencies

### Core

- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `typescript`: ^5.2.0

### Libraries

- `@supabase/supabase-js`: ^2.38.0
- `axios`: ^1.6.0
- `react-router-dom`: ^6.20.0

---

## 🧪 Testing

```bash
npm test
```

---

## 🚢 Deployment (Netlify)

### Manual Deployment

```bash
npm run build
# Upload build/ directory to Netlify
```

### Automatic Deployment

1. Connect GitHub repository
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
3. Add environment variables in Netlify dashboard
4. Deploy!

---

## 📝 TODO

- [ ] 사용자 인증 시스템
- [ ] 차트/그래프 추가 (recharts)
- [ ] 다크 모드
- [ ] 반응형 모바일 UI
- [ ] 다국어 지원 (i18n)
- [ ] E2E 테스트 (Cypress)

---

**Last Updated:** 2025-11-15

