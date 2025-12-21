// Authentication and role management

export type UserRole = "발주사" | "창고관리자" | "생산관리자" | "자재관리자" | "shipments"

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
    company: "세방리튬배터리",
    fullName: "박창고",
  },
  {
    id: "user004",
    username: "production_admin",
    password: "test123",
    role: "생산관리자",
    company: "세방리튬배터리",
    fullName: "최생산",
  },
  {
    id: "user005",
    username: "material_admin",
    password: "test123",
    role: "자재관리자",
    company: "세방리튬배터리",
    fullName: "정자재",
  },
  {
    id: "user006",
    username: "shipments_admin",
    password: "test123",
    role: "shipments",
    company: "세방리튬배터리",
    fullName: "송출관리자",
  },
]

// Role-based access control
export const rolePermissions = {
  발주사: {
    canView: ["/", "/orders"],
    canEdit: ["/orders"],
  },
  창고관리자: {
    canView: ["/", "/orders", "/sales", "/production", "/dispatch", "/materials", "/shipments"],
    canEdit: ["/sales", "/dispatch", "/shipments"],
  },
  생산관리자: {
    canView: ["/", "/production", "/materials"],
    canEdit: ["/production"],
  },
  자재관리자: {
    canView: ["/", "/materials", "/production"],
    canEdit: ["/materials"],
  },
  shipments: {
    canView: ["/", "/shipments"],
    canEdit: ["/shipments"],
  },
}

export function canAccessPage(role: UserRole, path: string): boolean {
  return rolePermissions[role].canView.includes(path)
}

export function canEditPage(role: UserRole, path: string): boolean {
  return rolePermissions[role].canEdit.includes(path)
}
