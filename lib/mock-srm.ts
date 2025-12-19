// 모의 SRM 시스템 구현 (프로토타입용)

export interface MockSRMOrder {
  srmOrderNumber: string // SRM-HMC-2025120001
  orderDate: string
  product: string
  quantity: number
  deliveryDate: string
  priority: "high" | "normal" | "low"
  status: "new" | "confirmed" | "cancelled"
  notes?: string
}

// 🎭 모의 SRM 데이터베이스 (고객사별)
const mockSRMDatabase = {
  현대차: [] as MockSRMOrder[],
  삼성SDI: [] as MockSRMOrder[],
}

// 🔐 모의 SRM 인증 정보
const mockSRMCredentials = {
  현대차: {
    url: "https://srm.hyundai-mock.com",
    validUsers: [
      { username: "sebang_hyundai", password: "srm2025!", name: "김세방" },
      { username: "sebang_hmc_admin", password: "srm2025!", name: "이담당" },
    ],
  },
  삼성SDI: {
    url: "https://srm.samsungsdi-mock.com",
    validUsers: [
      { username: "sebang_sdi", password: "srm2025!", name: "박세방" },
      { username: "sebang_sdi_admin", password: "srm2025!", name: "최담당" },
    ],
  },
}

// 📦 모의 SRM 주문 생성 함수
export function generateMockSRMOrders(
  customer: "현대차" | "삼성SDI",
  yearMonth: string
): MockSRMOrder[] {
  const orders: MockSRMOrder[] = []
  const orderCount = Math.floor(Math.random() * 5) + 3 // 3-7개 주문

  const products =
    customer === "현대차"
      ? ["EV-100", "EV-100K", "SV-001", "PLBM-A01"]
      : ["EV-200", "EV-100", "SV-002", "PLBM-B01"]

  for (let i = 0; i < orderCount; i++) {
    const product = products[Math.floor(Math.random() * products.length)]
    const quantity = Math.floor(Math.random() * 300) + 100

    orders.push({
      srmOrderNumber: `SRM-${customer === "현대차" ? "HMC" : "SDI"}-${yearMonth.replace("-", "")}${String(i + 1).padStart(4, "0")}`,
      orderDate: yearMonth,
      product,
      quantity,
      deliveryDate: calculateDeliveryDate(yearMonth, 30),
      priority: (["high", "normal", "low"][Math.floor(Math.random() * 3)] as any),
      status: "new",
      notes: generateRandomNotes(),
    })
  }

  return orders
}

function calculateDeliveryDate(orderDate: string, leadDays: number): string {
  const date = new Date(orderDate + "-01")
  date.setDate(date.getDate() + leadDays)
  return date.toISOString().split("T")[0]
}

function generateRandomNotes(): string {
  const notes = ["긴급 납품 요청", "품질 검사 강화 필요", "분할 납품 가능", "특별 포장 요구사항 있음", ""]
  return notes[Math.floor(Math.random() * notes.length)]
}

// 🔐 모의 SRM 로그인 검증
export function validateSRMLogin(
  customer: "현대차" | "삼성SDI",
  username: string,
  password: string
): { success: boolean; user?: any; error?: string } {
  const credentials = mockSRMCredentials[customer]
  const user = credentials.validUsers.find((u) => u.username === username && u.password === password)

  if (user) {
    return { success: true, user }
  }

  return { success: false, error: "SRM 로그인 정보가 올바르지 않습니다." }
}

// 📥 모의 SRM 주문 조회
export function fetchMockSRMOrders(customer: "현대차" | "삼성SDI", yearMonth: string): MockSRMOrder[] {
  // 실제로는 DB에서 가져오지만, 프로토타입에서는 즉시 생성
  const orders = generateMockSRMOrders(customer, yearMonth)
  mockSRMDatabase[customer] = orders
  return orders
}

// 🔄 SRM 주문을 세방 Order로 변환
export function transformSRMToOrder(srmOrder: MockSRMOrder, customer: "현대차" | "삼성SDI", syncBy: string): any {
  const productInfo = getProductInfo(srmOrder.product)

  return {
    id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orderDate: srmOrder.orderDate,
    customer,
    product: srmOrder.product,
    category: productInfo.category,
    destination: productInfo.destination,
    predictedQuantity: srmOrder.quantity,
    confirmedQuantity: 0,
    unitPrice: productInfo.unitPrice,
    totalAmount: srmOrder.quantity * productInfo.unitPrice,
    status: "predicted" as const,
    leadTimeDays: productInfo.leadTimeDays,

    // SRM 연동 정보
    srmOrderNumber: srmOrder.srmOrderNumber,
    srmSyncDate: new Date().toISOString(),
    srmSyncBy: syncBy,
    srmStatus: "synced" as const,
    srmLastModified: new Date().toISOString(),

    expectedDeliveryDate: srmOrder.deliveryDate,
    specialNotes: srmOrder.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function getProductInfo(productCode: string) {
  const productMap: any = {
    "EV-100": { category: "EV", destination: "유럽", unitPrice: 8000000, leadTimeDays: 30 },
    "EV-100K": { category: "EV", destination: "창원", unitPrice: 8000000, leadTimeDays: 30 },
    "EV-200": { category: "EV", destination: "유럽", unitPrice: 8000000, leadTimeDays: 30 },
    "SV-001": { category: "SV", destination: "울산", unitPrice: 5000000, leadTimeDays: 21 },
    "SV-002": { category: "SV", destination: "경주", unitPrice: 5000000, leadTimeDays: 21 },
    "PLBM-A01": { category: "PLBM", destination: "울산글로비스", unitPrice: 3000000, leadTimeDays: 25 },
    "PLBM-B01": { category: "PLBM", destination: "경주", unitPrice: 3000000, leadTimeDays: 25 },
  }

  return (
    productMap[productCode] || { category: "EV", destination: "기타", unitPrice: 8000000, leadTimeDays: 30 }
  )
}

// 📊 SRM 연동 통계
export function getSRMSyncStats(customer: "현대차" | "삼성SDI") {
  return {
    totalOrders: mockSRMDatabase[customer].length,
    newOrders: mockSRMDatabase[customer].filter((o) => o.status === "new").length,
    highPriority: mockSRMDatabase[customer].filter((o) => o.priority === "high").length,
  }
}

// 🔑 SRM 인증 정보 조회 (테스트용)
export function getSRMCredentials(customer: "현대차" | "삼성SDI") {
  return mockSRMCredentials[customer]
}

