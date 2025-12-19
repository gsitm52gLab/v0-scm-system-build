# 세방산업 통합 SCM 시스템

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/bbarkthongs-projects/v0-scm-system-build)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/gXk3Bs43XEG)

## 📋 프로젝트 개요

세방산업을 위한 **통합 공급망 관리(SCM) 시스템**으로, 발주-생산-출하의 전체 프로세스를 관리하는 웹 애플리케이션입니다.

### 🎯 핵심 기능

- **발주 계획 관리** - 발주사(현대차, 삼성SDI)의 발주 예측 및 확정
- **SRM 연동** - 고객사 SRM 시스템에서 주문 가져오기 (프로토타입)
- **판매 승인** - 창고관리자의 발주 승인 및 생산 이관
- **생산 관리** - 공장별 생산 계획 및 자재 관리
- **배차 관리** - 출하 계획 및 차량 배차, 계근 데이터 관리
- **대시보드** - 실시간 통계 및 차트 시각화

---

## 🚀 SRM 연동 프로세스 (신규 기능)

### 프로세스 흐름

```
1. 세방산업 영업담당자 로그인 (sales_manager)
   ↓
2. 네비게이션에서 "SRM 연동" 클릭
   ↓
3. 고객사 SRM 선택 (현대차 또는 삼성SDI)
   ↓
4. SRM 계정으로 로그인
   - 현대차: sebang_hyundai / srm2025!
   - 삼성SDI: sebang_sdi / srm2025!
   ↓
5. SRM 주문 목록 조회 (월별)
   ↓
6. 가져올 주문 선택 (체크박스)
   ↓
7. "세방 시스템에 가져오기" 버튼 클릭
   ↓
8. 주문 동기화 완료
   ↓
9. 세방 주문 페이지로 자동 이동
   ↓
10. "판매 계획" 메뉴 클릭
    ↓
11. 판매 계획 대시보드에서 SRM 연동 주문 확인
    - "SRM 연동" 통계 카드 (초록색)
    - SRM 주문번호 표시
    - 동기화 담당자 표시 (by 정영업)
    - "SRM 연동" 배지 표시
```

### 테스트 계정

#### 세방산업 SCM 로그인
- **관리자** (모든 페이지 접근 가능): `admin` / `admin123` ⭐
- **영업담당자** (SRM 연동, 긴급 주문 권한): `sales_manager` / `test123`
- **창고관리자** (출하 관리 권한): `warehouse_admin` / `test123`
- **생산관리자** (생산 관리 권한): `production_admin` / `test123`
- **구매담당자** (구매 관리 권한): `purchase_manager` / `test123`
- **발주사 (현대차)**: `hyundai_user` / `test123`
- **발주사 (삼성SDI)**: `samsung_user` / `test123`

#### 현대차 SRM 로그인
- `sebang_hyundai` / `srm2025!`
- `sebang_hmc_admin` / `srm2025!`

#### 삼성SDI SRM 로그인
- `sebang_sdi` / `srm2025!`
- `sebang_sdi_admin` / `srm2025!`

---

## 🛠️ 기술 스택

- **Framework**: Next.js 16.0.10 (App Router)
- **Language**: TypeScript 5
- **UI**: Radix UI + Shadcn/ui + Tailwind CSS 4
- **Charts**: Recharts 2.15.4
- **State**: React Context API
- **Forms**: React Hook Form + Zod

---

## 📦 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start
```

접속: `http://localhost:3000`

---

## 👥 사용자 역할

### 1. 발주사 (현대차, 삼성SDI)
- 발주 계획 조회
- 예측 수량 → 확정 수량 입력
- 배송 추적

### 2. 영업담당자 (세방산업) 🆕
- **SRM 연동** - 고객사 SRM에서 주문 가져오기
- 판매 계획 대시보드 조회
- SRM 연동 주문 확인

### 3. 창고관리자 (세방산업)
- 발주 승인 및 생산 이관
- 배차 생성 및 계근 데이터 입력
- 전체 프로세스 모니터링

### 4. 생산관리자 (세방산업)
- 생산 계획 확인
- 검수 수량 입력
- 자재 재고 관리

---

## 📁 주요 파일 구조

```
v0-scm-system-build-main/
├── app/
│   ├── srm-login/page.tsx          # 🆕 SRM 로그인 페이지
│   ├── srm-orders/page.tsx         # 🆕 SRM 주문 조회/가져오기
│   ├── api/
│   │   └── srm/
│   │       ├── login/route.ts      # 🆕 SRM 로그인 API
│   │       ├── orders/route.ts     # 🆕 SRM 주문 조회 API
│   │       └── sync-orders/route.ts # 🆕 주문 동기화 API
│   ├── orders/page.tsx             # 발주 계획
│   ├── sales/page.tsx              # 판매 계획
│   ├── production/page.tsx         # 생산 계획
│   ├── dispatch/page.tsx           # 배차 관리
│   └── page.tsx                    # 대시보드
├── lib/
│   ├── mock-srm.ts                 # 🆕 모의 SRM 시스템
│   ├── db.ts                       # 데이터베이스 스키마
│   └── auth.ts                     # 인증 및 권한 관리
└── components/
    ├── navigation.tsx              # 네비게이션 (SRM 연동 메뉴 추가)
    ├── order-table.tsx             # 주문 테이블 (SRM 정보 표시)
    └── ui/
        └── checkbox.tsx            # 🆕 체크박스 컴포넌트
```

---

## 🎨 화면 구성

### 1. SRM 로그인 페이지 (`/srm-login`)
- 프로세스 진행 상태 표시 (1→2→3)
- 세방산업 로그인 사용자 정보
- 고객사 SRM 선택 (현대차/삼성SDI)
- SRM 계정 입력
- 테스트 계정 안내

### 2. SRM 주문 조회 페이지 (`/srm-orders`)
- SRM 시스템 헤더 (고객사 로고)
- 프로세스 완료 상태 표시
- 통계 카드 (총 주문, 선택된 주문, 긴급 주문, 총 수량)
- 주문 목록 테이블
  - 체크박스 선택
  - SRM 주문번호
  - 품목, 수량, 납품일
  - 우선순위 (긴급/보통/낮음)
- 월별 필터
- "세방 시스템에 가져오기" 버튼

### 3. 주문 페이지 (`/orders`)
- SRM 연동 정보 컬럼 추가
  - "SRM 연동" 배지
  - SRM 주문번호
  - 동기화 담당자
- 기존 발주 관리 기능 유지

---

## 🔐 보안 및 권한

### 접근 제어
- SRM 연동 기능은 **창고관리자만** 접근 가능
- 세션 기반 SRM 인증 (프로토타입용)
- 페이지별 역할 기반 접근 제어 (RBAC)

### 데이터 검증
- SRM 세션 ID 검증
- 주문 동기화 시 담당자 기록
- 중복 주문 방지 (SRM 주문번호 기반)

---

## 📊 데이터 모델

### Order (확장)
```typescript
interface Order {
  // 기존 필드
  id: string
  orderDate: string
  customer: "현대차" | "삼성SDI" | ...
  product: string
  predictedQuantity: number
  confirmedQuantity: number
  status: "predicted" | "confirmed" | ...
  
  // 🆕 SRM 연동 필드
  srmOrderNumber?: string        // SRM 주문번호
  srmSyncDate?: string           // 동기화 날짜
  srmSyncBy?: string             // 동기화 담당자
  srmStatus?: "synced" | ...     // 동기화 상태
  srmLastModified?: string       // 마지막 수정일
}
```

### MockSRMOrder (신규)
```typescript
interface MockSRMOrder {
  srmOrderNumber: string         // SRM-HMC-2025120001
  orderDate: string
  product: string
  quantity: number
  deliveryDate: string
  priority: "high" | "normal" | "low"
  status: "new" | "confirmed" | "cancelled"
  notes?: string
}
```

---

## 🎯 프로토타입 특징

### 모의 SRM 시스템
- 실제 SRM API 없이 프로세스 시연 가능
- 랜덤 주문 데이터 생성 (3-7건)
- 현대차/삼성SDI 각각 독립적인 SRM
- 우선순위 및 상태 관리

### 자동 데이터 변환
- SRM 주문 → 세방 Order 자동 변환
- 품목 정보 자동 매핑
- 단가 및 리드타임 자동 설정

### 시각적 프로세스 표시
- 3단계 진행 상태 (체크마크)
- 고객사별 색상 구분
- 실시간 피드백 (Toast 알림)

---

## 🚀 향후 개선 사항

### 실제 운영 환경 적용 시
1. **실제 SRM API 연동**
   - OAuth 2.0 인증
   - REST API 또는 SOAP 연동
   - 웹훅 수신

2. **데이터베이스 연동**
   - PostgreSQL + Prisma
   - 동기화 이력 관리
   - 트랜잭션 처리

3. **고급 기능**
   - 자동 동기화 (Cron Job)
   - 충돌 해결 로직
   - 동기화 실패 재시도
   - 알림 시스템 (이메일, Slack)

4. **보안 강화**
   - JWT 토큰 기반 인증
   - API 키 암호화
   - 감사 로그

---

## 📞 문의

프로젝트 관련 문의사항은 이슈를 등록해주세요.

---

## 📄 라이선스

This project is built with [v0.app](https://v0.app) and deployed on [Vercel](https://vercel.com).

---

**🎉 SRM 연동 프로세스가 완벽하게 구현되었습니다!**