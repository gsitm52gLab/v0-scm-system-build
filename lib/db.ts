// Database schema and initialization for Sebang SCM system

export type ProductCategory = "ESS" | "EV" | "SV" | "PLBM"

export interface Order {
  id: string
  orderDate: string
  customer: "현대차" | "삼성SDI" | "일본거래처" | "유럽거래처"
  product: string // Product code
  category: ProductCategory
  destination: string // Destination/route
  predictedQuantity: number
  confirmedQuantity: number
  unitPrice: number
  totalAmount: number
  status: "predicted" | "confirmed" | "approved" | "in_production" | "shipped" | "delivered"
  leadTimeDays: number
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  specialNotes?: string
  createdAt: string
  updatedAt: string
}

export interface Production {
  id: string
  orderId: string
  productionLine: "광주1공장" | "광주2공장"
  plannedQuantity: number
  inspectedQuantity: number
  productionDate: string
  status: "planned" | "completed" | "inspected"
  createdAt: string
}

export interface Inventory {
  id: string
  productionId: string
  product: string
  category: ProductCategory
  quantity: number
  location: string
  updatedAt: string
}

export interface Dispatch {
  id: string
  dispatchNumber: string
  vehicleNumber: string
  vehicleSize: "5톤" | "11톤" | "25톤"
  destination: string
  route?: string[] // For PLBM variable routes
  isMixedLoad: boolean // For SV & PLBM mixed loading
  products: {
    product: string
    category: ProductCategory
    quantity: number
    weight: number
  }[]
  estimatedWeight: number
  actualWeight: number | null
  dispatchDate: string
  status: "planned" | "dispatched" | "completed"
  createdAt: string
}

export interface Material {
  id: string
  code: string
  name: string
  category: string
  unitPrice: number
  currentStock: number
  minStock: number
  supplier: string
  leadTimeDays: number
}

export interface MaterialRequirement {
  id: string
  productionId: string
  materialCode: string
  requiredQuantity: number
  availableQuantity: number
  shortfallQuantity: number
  status: "sufficient" | "insufficient" | "ordered"
  orderDate?: string
  expectedArrivalDate?: string
  createdAt: string
}

// Generate sample data for 2024-01 to 2025-12
export function generateSampleOrders(): Order[] {
  const orders: Order[] = []

  const startDate = new Date("2024-01-01")
  const endDate = new Date("2025-12-31")

  let orderId = 1

  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const isHistorical = d < new Date("2025-12-01")

    // ESS orders
    const essProduct = productPortfolio[Math.floor(Math.random() * 2)]
    const essQty = 50 + Math.floor(Math.random() * 30)
    const essUnitPrice = unitPrices.ESS
    orders.push({
      id: `ORD-${String(orderId++).padStart(6, "0")}`,
      orderDate: yearMonth,
      customer: "일본거래처",
      product: essProduct.code,
      category: "ESS",
      destination: "일본",
      predictedQuantity: essQty,
      confirmedQuantity: isHistorical ? essQty : 0,
      unitPrice: essUnitPrice,
      totalAmount: essQty * essUnitPrice,
      leadTimeDays: leadTimes.ESS,
      status: isHistorical ? (Math.random() > 0.3 ? "delivered" : "shipped") : "predicted",
      specialNotes: "월 1회 출하, 소량",
      createdAt: yearMonth + "-01",
      updatedAt: yearMonth + "-01",
    })

    // EV orders
    ;["현대차", "삼성SDI"].forEach((customer) => {
      const evProducts = productPortfolio.filter((p) => p.category === "EV")
      evProducts.forEach((product) => {
        const baseQuantity = customer === "현대차" ? 500 : 400
        const variance = Math.floor(Math.random() * 200) - 100
        const quantity = Math.max(100, baseQuantity + variance)
        const unitPrice = unitPrices.EV

        orders.push({
          id: `ORD-${String(orderId++).padStart(6, "0")}`,
          orderDate: yearMonth,
          customer: customer as "현대차" | "삼성SDI",
          product: product.code,
          category: "EV",
          destination: product.destination,
          predictedQuantity: quantity,
          confirmedQuantity: isHistorical ? quantity : 0,
          unitPrice,
          totalAmount: quantity * unitPrice,
          leadTimeDays: leadTimes.EV,
          status: isHistorical ? (Math.random() > 0.3 ? "delivered" : "shipped") : "predicted",
          specialNotes: "동일 품번 해외/국내 동시 출하",
          createdAt: yearMonth + "-01",
          updatedAt: yearMonth + "-01",
        })
      })
    })

    // SV orders
    const svProducts = productPortfolio.filter((p) => p.category === "SV")
    svProducts.forEach((product) => {
      const qty = 20 + Math.floor(Math.random() * 30)
      const unitPrice = unitPrices.SV
      orders.push({
        id: `ORD-${String(orderId++).padStart(6, "0")}`,
        orderDate: yearMonth,
        customer: "현대차",
        product: product.code,
        category: "SV",
        destination: product.destination,
        predictedQuantity: qty,
        confirmedQuantity: isHistorical ? qty : 0,
        unitPrice,
        totalAmount: qty * unitPrice,
        leadTimeDays: leadTimes.SV,
        status: isHistorical ? (Math.random() > 0.3 ? "delivered" : "shipped") : "predicted",
        specialNotes: "AS 물량, 혼적 출하 가능",
        createdAt: yearMonth + "-01",
        updatedAt: yearMonth + "-01",
      })
    })

    // PLBM orders
    const plbmProducts = productPortfolio.filter((p) => p.category === "PLBM")
    plbmProducts.forEach((product) => {
      const qty = 10 + Math.floor(Math.random() * 20)
      const unitPrice = unitPrices.PLBM
      orders.push({
        id: `ORD-${String(orderId++).padStart(6, "0")}`,
        orderDate: yearMonth,
        customer: "현대차",
        product: product.code,
        category: "PLBM",
        destination: product.destination,
        predictedQuantity: qty,
        confirmedQuantity: isHistorical ? qty : 0,
        unitPrice,
        totalAmount: qty * unitPrice,
        leadTimeDays: leadTimes.PLBM,
        status: isHistorical ? (Math.random() > 0.3 ? "delivered" : "shipped") : "predicted",
        specialNotes: `가변경로: ${product.route?.join(" → ")}`,
        createdAt: yearMonth + "-01",
        updatedAt: yearMonth + "-01",
      })
    })
  }

  return orders
}

export function generateSampleProductions(orders: Order[]): Production[] {
  const productions: Production[] = []
  const approvedOrders = orders.filter((o) => o.status === "approved")

  let prodId = 1

  approvedOrders.forEach((order) => {
    const productionLine = order.category === "EV" ? "광주1공장" : "광주2공장"
    const plannedQuantity = order.confirmedQuantity
    const inspectedQuantity = plannedQuantity - Math.floor(Math.random() * 10)

    productions.push({
      id: `PROD-${String(prodId).padStart(6, "0")}`,
      orderId: order.id,
      productionLine,
      plannedQuantity,
      inspectedQuantity,
      productionDate: order.orderDate,
      status: "inspected",
      createdAt: order.orderDate + "-01",
    })

    prodId++
  })

  return productions
}

const productPortfolio = [
  // ESS - Energy Storage System (Japan export, monthly, low volume)
  { code: "ESS-001", category: "ESS" as ProductCategory, name: "ESS Module A", destination: "일본" },
  { code: "ESS-002", category: "ESS" as ProductCategory, name: "ESS Module B", destination: "일본" },

  // EV - Electric Vehicle (Europe & domestic Changwon)
  { code: "EV-100", category: "EV" as ProductCategory, name: "EV Battery Module", destination: "유럽" },
  { code: "EV-100K", category: "EV" as ProductCategory, name: "EV Battery Module", destination: "창원" },
  { code: "EV-200", category: "EV" as ProductCategory, name: "EV Pack Assembly", destination: "유럽" },

  // SV - Service/After Service (mixed loading with PLBM)
  { code: "SV-001", category: "SV" as ProductCategory, name: "Service Module A", destination: "울산" },
  { code: "SV-002", category: "SV" as ProductCategory, name: "Service Module B", destination: "경주" },

  // PLBM - ~50 specifications, low volume high variety, variable routes
  {
    code: "PLBM-A01",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec A1",
    destination: "울산글로비스",
    route: ["광주", "경주", "울산사외창고", "울산글로비스"],
  },
  {
    code: "PLBM-A02",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec A2",
    destination: "울산글로비스",
    route: ["광주", "울산글로비스"],
  },
  {
    code: "PLBM-B01",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec B1",
    destination: "경주",
    route: ["광주", "경주"],
  },
  {
    code: "PLBM-B02",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec B2",
    destination: "울산사외창고",
    route: ["광주", "울산사외창고"],
  },
]

// In-memory storage (will be replaced with real DB in production)
let ordersData: Order[] = []
let productionsData: Production[] = []
const inventoryData: Inventory[] = []
const dispatchData: Dispatch[] = []
const materialsData: Material[] = []
const materialRequirementsData: MaterialRequirement[] = []

const leadTimes = {
  ESS: 45, // 45 days for ESS
  EV: 30, // 30 days for EV
  SV: 21, // 21 days for SV
  PLBM: 25, // 25 days for PLBM
}

const unitPrices = {
  ESS: 15000000, // 15M KRW per unit
  EV: 8000000, // 8M KRW per unit
  SV: 5000000, // 5M KRW per unit
  PLBM: 3000000, // 3M KRW per unit
}

export function initializeMaterials(): Material[] {
  const materials: Material[] = [
    {
      id: "MAT-001",
      code: "CELL-001",
      name: "리튬이온 셀",
      category: "배터리셀",
      unitPrice: 50000,
      currentStock: 10000,
      minStock: 5000,
      supplier: "LG에너지솔루션",
      leadTimeDays: 14,
    },
    {
      id: "MAT-002",
      code: "BMS-001",
      name: "BMS 모듈",
      category: "전자부품",
      unitPrice: 200000,
      currentStock: 500,
      minStock: 200,
      supplier: "삼성SDI",
      leadTimeDays: 10,
    },
    {
      id: "MAT-003",
      code: "FRAME-001",
      name: "알루미늄 프레임",
      category: "구조재",
      unitPrice: 150000,
      currentStock: 300,
      minStock: 150,
      supplier: "포스코",
      leadTimeDays: 7,
    },
    {
      id: "MAT-004",
      code: "CABLE-001",
      name: "고압 케이블",
      category: "전선",
      unitPrice: 30000,
      currentStock: 2000,
      minStock: 1000,
      supplier: "LS전선",
      leadTimeDays: 5,
    },
    {
      id: "MAT-005",
      code: "COOL-001",
      name: "냉각 시스템",
      category: "냉각장치",
      unitPrice: 300000,
      currentStock: 150,
      minStock: 100,
      supplier: "한온시스템",
      leadTimeDays: 12,
    },
  ]

  materialsData.push(...materials)
  return materials
}

export function initializeDatabase() {
  if (ordersData.length === 0) {
    ordersData = generateSampleOrders()
    productionsData = generateSampleProductions(ordersData)
    initializeMaterials()

    // Calculate initial inventory by category
    const inventoryMap = new Map<string, { category: ProductCategory; quantity: number }>()
    productionsData.forEach((prod) => {
      const order = ordersData.find((o) => o.id === prod.orderId)
      if (order) {
        const existing = inventoryMap.get(order.product) || { category: order.category, quantity: 0 }
        inventoryMap.set(order.product, {
          category: order.category,
          quantity: existing.quantity + prod.inspectedQuantity,
        })
      }
    })

    let invId = 1
    inventoryMap.forEach((data, product) => {
      inventoryData.push({
        id: `INV-${String(invId).padStart(6, "0")}`,
        productionId: "",
        product,
        category: data.category,
        quantity: data.quantity,
        location: "광주창고",
        updatedAt: new Date().toISOString(),
      })
      invId++
    })
  }

  return {
    orders: ordersData,
    productions: productionsData,
    inventory: inventoryData,
    dispatch: dispatchData,
    materials: materialsData,
    materialRequirements: materialRequirementsData,
  }
}

// CRUD operations
export const db = {
  orders: {
    getAll: () => ordersData,
    getById: (id: string) => ordersData.find((o) => o.id === id),
    getByMonth: (yearMonth: string) => ordersData.filter((o) => o.orderDate === yearMonth),
    update: (id: string, data: Partial<Order>) => {
      const index = ordersData.findIndex((o) => o.id === id)
      if (index !== -1) {
        ordersData[index] = { ...ordersData[index], ...data, updatedAt: new Date().toISOString() }
        return ordersData[index]
      }
      return null
    },
    create: (order: Order) => {
      ordersData.push(order)
      return order
    },
  },
  productions: {
    getAll: () => productionsData,
    getById: (id: string) => productionsData.find((p) => p.id === id),
    getByOrderId: (orderId: string) => productionsData.filter((p) => p.orderId === orderId),
    update: (id: string, data: Partial<Production>) => {
      const index = productionsData.findIndex((p) => p.id === id)
      if (index !== -1) {
        productionsData[index] = { ...productionsData[index], ...data }
        return productionsData[index]
      }
      return null
    },
    create: (production: Production) => {
      productionsData.push(production)
      return production
    },
  },
  inventory: {
    getAll: () => inventoryData,
    getByProduct: (product: string) => inventoryData.find((i) => i.product === product),
    update: (product: string, quantity: number) => {
      const index = inventoryData.findIndex((i) => i.product === product)
      if (index !== -1) {
        inventoryData[index].quantity = quantity
        inventoryData[index].updatedAt = new Date().toISOString()
        return inventoryData[index]
      }
      return null
    },
  },
  dispatch: {
    getAll: () => dispatchData,
    getById: (id: string) => dispatchData.find((d) => d.id === id),
    create: (dispatch: Dispatch) => {
      dispatchData.push(dispatch)
      return dispatch
    },
    update: (id: string, data: Partial<Dispatch>) => {
      const index = dispatchData.findIndex((d) => d.id === id)
      if (index !== -1) {
        dispatchData[index] = { ...dispatchData[index], ...data }
        return dispatchData[index]
      }
      return null
    },
  },
  materials: {
    getAll: () => materialsData,
    getById: (id: string) => materialsData.find((m) => m.id === id),
    getByCode: (code: string) => materialsData.find((m) => m.code === code),
    update: (code: string, data: Partial<Material>) => {
      const index = materialsData.findIndex((m) => m.code === code)
      if (index !== -1) {
        materialsData[index] = { ...materialsData[index], ...data }
        return materialsData[index]
      }
      return null
    },
  },
  materialRequirements: {
    getAll: () => materialRequirementsData,
    getByProductionId: (productionId: string) =>
      materialRequirementsData.filter((mr) => mr.productionId === productionId),
    create: (requirement: MaterialRequirement) => {
      materialRequirementsData.push(requirement)
      return requirement
    },
    update: (id: string, data: Partial<MaterialRequirement>) => {
      const index = materialRequirementsData.findIndex((mr) => mr.id === id)
      if (index !== -1) {
        materialRequirementsData[index] = { ...materialRequirementsData[index], ...data }
        return materialRequirementsData[index]
      }
      return null
    },
  },
}
