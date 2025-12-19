// Authentication and role management

export type UserRole = "발주사" | "창고관리자" | "생산관리자" | "영업담당자" | "구매담당자" | "관리자"

export interface User {
  id: string
  username: string
  password: string
  role: UserRole
  company: string
  fullName: string
}

// Test accounts
export const testAccounts: User[] = [
  {
    id: "user001",
    username: "hyundai_user",
    password: "test123",
    role: "발주사",
    company: "현대차",
    fullName: "김현대",
  },
  {
    id: "user002",
    username: "samsung_user",
    password: "test123",
    role: "발주사",
    company: "삼성SDI",
    fullName: "이삼성",
  },
  {
    id: "user003",
    username: "warehouse_admin",
    password: "test123",
    role: "창고관리자",
    company: "세방산업",
    fullName: "박창고",
  },
  {
    id: "user004",
    username: "production_admin",
    password: "test123",
    role: "생산관리자",
    company: "세방산업",
    fullName: "최생산",
  },
  {
    id: "user005",
    username: "sales_manager",
    password: "test123",
    role: "영업담당자",
    company: "세방산업",
    fullName: "정영업",
  },
  {
    id: "user006",
    username: "purchase_manager",
    password: "test123",
    role: "구매담당자",
    company: "세방산업",
    fullName: "강구매",
  },
  {
    id: "admin001",
    username: "admin",
    password: "admin123",
    role: "관리자",
    company: "세방산업",
    fullName: "시스템 관리자",
  },
]

// Role-based access control
export const rolePermissions = {
  발주사: {
    canView: ["/", "/orders"],
    canEdit: ["/orders"],
  },
  창고관리자: {
    canView: ["/", "/orders", "/sales", "/production", "/dispatch", "/shipping"],
    canEdit: ["/sales", "/dispatch", "/shipping"],
  },
  생산관리자: {
    canView: ["/", "/production"],
    canEdit: ["/production"],
  },
  영업담당자: {
    canView: ["/", "/orders", "/sales", "/srm-login", "/srm-orders", "/urgent-order"],
    canEdit: ["/sales", "/srm-login", "/srm-orders", "/urgent-order"],
  },
  구매담당자: {
    canView: ["/", "/production", "/purchase"],
    canEdit: ["/purchase"],
  },
  관리자: {
    canView: [
      "/",
      "/orders",
      "/urgent-order",
      "/sales",
      "/production",
      "/purchase",
      "/shipping",
      "/dispatch",
      "/srm-login",
      "/srm-orders",
    ],
    canEdit: [
      "/orders",
      "/urgent-order",
      "/sales",
      "/production",
      "/purchase",
      "/shipping",
      "/dispatch",
      "/srm-login",
      "/srm-orders",
    ],
  },
}

export function canAccessPage(role: UserRole, path: string): boolean {
  // 관리자는 모든 페이지 접근 가능
  if (role === "관리자") {
    return true
  }
  return rolePermissions[role].canView.includes(path)
}

export function canEditPage(role: UserRole, path: string): boolean {
  // 관리자는 모든 페이지 편집 가능
  if (role === "관리자") {
    return true
  }
  return rolePermissions[role].canEdit.includes(path)
}
