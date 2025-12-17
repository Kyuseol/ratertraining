# TODO: 앵커 혼입률 로직 구현

## 개요

Blueprint v0.9 요구사항에 따라 교사 모드 채점 페이지에서 앵커 에세이 혼입률을 제어하는 로직을 구현해야 합니다.

## 요구사항 (Blueprint v0.9)

- **신규 교사** (채점 6편 이하): 앵커 혼입률 **25%**
- **유지 단계** (채점 6편 초과): 앵커 혼입률 **15-20%** (권장: 17.5%)

## 구현 파일

- `frontend/src/pages/RatingPage.tsx`
  - `fetchNextEssay()` 함수 수정

## 구현 방법

### 1. 교사의 채점 단계 판단

```typescript
// 교사가 채점한 에세이 수 확인
const { count: essaysRatedCount } = await supabase
  .from('scores')
  .select('essay_id', { count: 'exact', head: true })
  .eq('teacher_id', user.id);

// 진단 단계 판단
const isNewTeacher = (essaysRatedCount || 0) <= 6;
const targetAnchorRate = isNewTeacher ? 0.25 : 0.175; // 25% 또는 17.5%
```

### 2. 에세이 분류

```typescript
// 앵커 에세이와 일반 에세이 분리
const anchorEssays = availableEssays.filter(e => e.is_anchor);
const normalEssays = availableEssays.filter(e => !e.is_anchor);
```

### 3. 앵커 혼입률 적용 로직

```typescript
let selectedEssay: IEssay;

// 방법 1: 확률 기반 선택 (간단)
if (Math.random() < targetAnchorRate && anchorEssays.length > 0) {
  // 앵커 에세이 선택
  selectedEssay = anchorEssays[Math.floor(Math.random() * anchorEssays.length)];
} else if (normalEssays.length > 0) {
  // 일반 에세이 선택
  selectedEssay = normalEssays[Math.floor(Math.random() * normalEssays.length)];
} else {
  // 일반 에세이가 없으면 앵커 선택
  selectedEssay = anchorEssays[Math.floor(Math.random() * anchorEssays.length)];
}

// 방법 2: 실제 혼입률 추적 (더 정확)
// - 최근 N개 에세이 중 앵커 비율 계산
// - 목표 혼입률보다 낮으면 앵커 우선, 높으면 일반 우선
```

### 4. 실제 혼입률 추적 방식 (권장)

```typescript
// 최근 10개 채점 기록에서 앵커 비율 확인
const { data: recentScores } = await supabase
  .from('scores')
  .select('essay_id, essays!inner(is_anchor)')
  .eq('teacher_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);

const recentAnchorCount = recentScores?.filter(
  s => s.essays?.is_anchor
).length || 0;

const currentAnchorRate = recentScores && recentScores.length > 0
  ? recentAnchorCount / recentScores.length
  : 0;

// 목표 혼입률과 비교하여 선택
let selectedEssay: IEssay;
if (currentAnchorRate < targetAnchorRate && anchorEssays.length > 0) {
  // 앵커 비율이 낮으면 앵커 우선
  selectedEssay = anchorEssays[Math.floor(Math.random() * anchorEssays.length)];
} else if (normalEssays.length > 0) {
  // 일반 에세이 선택
  selectedEssay = normalEssays[Math.floor(Math.random() * normalEssays.length)];
} else {
  // fallback: 앵커
  selectedEssay = anchorEssays[Math.floor(Math.random() * anchorEssays.length)];
}
```

## 전체 수정 코드 예시

```typescript
const fetchNextEssay = async () => {
  if (!user) return;

  setLoading(true);
  try {
    // 1. 교사의 채점 수 확인 (진단 단계 판단)
    const { count: essaysRatedCount } = await supabase
      .from('scores')
      .select('essay_id', { count: 'exact', head: true })
      .eq('teacher_id', user.id);

    const isNewTeacher = (essaysRatedCount || 0) <= 6;
    const targetAnchorRate = isNewTeacher ? 0.25 : 0.175;

    // 2. 이미 채점한 에세이 ID 목록 조회
    const { data: ratedEssays } = await supabase
      .from('scores')
      .select('essay_id')
      .eq('teacher_id', user.id);

    const ratedEssayIds = ratedEssays
      ? [...new Set(ratedEssays.map((s) => s.essay_id))]
      : [];

    // 3. 아직 채점하지 않은 에세이 조회
    const { data: allEssays, error: essaysError } = await supabase
      .from('essays')
      .select('*')
      .eq('is_active', true);

    if (essaysError) throw essaysError;

    const availableEssays = allEssays?.filter(
      (essay) => !ratedEssayIds.includes(essay.id)
    ) || [];

    if (availableEssays.length === 0) {
      alert('채점할 에세이가 없습니다.');
      return;
    }

    // 4. 앵커/일반 에세이 분리
    const anchorEssays = availableEssays.filter(e => e.is_anchor);
    const normalEssays = availableEssays.filter(e => !e.is_anchor);

    // 5. 최근 혼입률 확인 (선택적)
    const { data: recentScores } = await supabase
      .from('scores')
      .select('essay_id, essays!inner(is_anchor)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentAnchorCount = recentScores?.filter(
      s => s.essays?.is_anchor
    ).length || 0;

    const currentAnchorRate = recentScores && recentScores.length > 0
      ? recentAnchorCount / recentScores.length
      : 0;

    // 6. 앵커 혼입률 적용하여 에세이 선택
    let selectedEssay: IEssay;

    if (currentAnchorRate < targetAnchorRate && anchorEssays.length > 0) {
      // 앵커 비율 부족 → 앵커 선택
      selectedEssay = anchorEssays[Math.floor(Math.random() * anchorEssays.length)];
      console.log(`[앵커 혼입] 현재 ${(currentAnchorRate * 100).toFixed(1)}% < 목표 ${(targetAnchorRate * 100).toFixed(1)}% → 앵커 선택`);
    } else if (normalEssays.length > 0) {
      // 일반 에세이 선택
      selectedEssay = normalEssays[Math.floor(Math.random() * normalEssays.length)];
      console.log(`[앵커 혼입] 현재 ${(currentAnchorRate * 100).toFixed(1)}% ≥ 목표 ${(targetAnchorRate * 100).toFixed(1)}% → 일반 선택`);
    } else {
      // fallback: 일반 에세이 없으면 앵커
      selectedEssay = anchorEssays[Math.floor(Math.random() * anchorEssays.length)];
      console.log('[앵커 혼입] 일반 에세이 없음 → 앵커 선택 (fallback)');
    }

    setEssay(selectedEssay);

    // 7. 채점 데이터 초기화
    const initialRatings: RatingData = {};
    rubrics.forEach((rubric) => {
      initialRatings[rubric.id] = {
        score: null,
        startTime: Date.now(),
      };
    });
    setRatings(initialRatings);
    setOpenAccordionIndex(0);

  } catch (err) {
    console.error('에세이 조회 실패:', err);
    alert('에세이를 불러오는데 실패했습니다.');
  } finally {
    setLoading(false);
  }
};
```

## 추가 고려사항

### 1. UI 개선

- 교사에게 현재 진단 단계 표시
- 앵커 에세이 여부 명확히 표시 (이미 구현됨: `⚓ 앵커` 배지)
- 앵커 혼입률 통계 표시 (TeacherDashboard에 추가)

### 2. 통계 추적

```typescript
// TeacherDashboard.tsx에 추가할 통계
const { data: anchorStats } = await supabase
  .from('scores')
  .select('essay_id, essays!inner(is_anchor)')
  .eq('teacher_id', user.id);

const totalRated = anchorStats?.length || 0;
const anchorRated = anchorStats?.filter(s => s.essays?.is_anchor).length || 0;
const anchorRate = totalRated > 0 ? (anchorRated / totalRated * 100).toFixed(1) : 0;

// 표시: "앵커 혼입률: 23.5% (목표: 25%)"
```

### 3. 에지 케이스 처리

- **앵커 에세이가 없는 경우**: 일반 에세이만 제공
- **일반 에세이가 없는 경우**: 앵커 에세이만 제공 (경고 메시지)
- **모든 에세이 채점 완료**: "모든 에세이 채점 완료" 메시지

### 4. 테스트 시나리오

1. **신규 교사** (0-6편):
   - 10개 에세이 채점 후 앵커 비율 확인 → 약 25% 근처인지
   
2. **유지 단계** (7편+):
   - 20개 에세이 채점 후 앵커 비율 확인 → 약 17.5% 근처인지

3. **앵커 에세이 부족**:
   - 앵커 2편, 일반 20편 → 앵커가 적절히 재제시되는지

## 우선순위

- [ ] **High**: `fetchNextEssay()` 함수에 앵커 혼입률 로직 구현
- [ ] **Medium**: 교사 대시보드에 앵커 혼입률 통계 표시
- [ ] **Low**: 관리자 대시보드에 전체 교사의 앵커 혼입률 분포 표시

## 참고 문서

- `CLAUDE.md`: Blueprint v0.9 명세
- `blueprint.md`: 상세 설계 문서
- `frontend/src/pages/RatingPage.tsx`: 현재 구현

---

**작성일**: 2025-12-17  
**상태**: TODO (미구현)  
**우선순위**: High

