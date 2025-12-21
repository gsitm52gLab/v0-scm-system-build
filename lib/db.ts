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
  unitPrice: number // 만원 (10K KRW)
  status: "predicted" | "confirmed" | "approved" | "in_production" | "shipped" | "delivered"
  specialNotes?: string // For mixed loading, low volume, etc.
  estimatedDeliveryDate?: string
  actualDeliveryDate?: string
  createdAt: string
  updatedAt: string
}

export interface Production {
  id: string
  orderId: string
  productionLine: "광주1공장" | "광주2공장"
  lineCapacity: number // Units per day
  tactTime: number // Minutes per unit
  plannedQuantity: number
  inspectedQuantity: number
  productionDate: string
  estimatedStartDate: string
  actualStartDate?: string
  status: "planned" | "material_ready" | "in_progress" | "completed" | "inspected"
  materialShortage: boolean
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

export interface Shipment {
  id: string
  shipmentNumber: string
  customer: string
  destination: string
  shipmentDate: string
  products: {
    productCode: string
    product: string
    category: ProductCategory
    quantity: number
  }[]
  totalAmount: number
  status: "registered" | "dispatched" | "completed"
  dispatchId?: string
  dispatchInfo?: Dispatch
  createdAt: string
}

export interface Material {
  id: string
  code: string
  name: string
  unit: string
  minStock: number
  currentStock: number
  unitPrice: number // 원 per unit
  supplier: string
  leadTimeDays: number
  updatedAt: string
}

export interface BOM {
  productCode: string
  materials: {
    materialCode: string
    quantity: number // Required quantity per product unit
  }[]
}

// Generate sample data for 2024-01 to 2025-12
function calculateLeadTime(category: ProductCategory): number {
  const leadTimes = {
    ESS: 30, // days
    EV: 21,
    SV: 14,
    PLBM: 18,
  }
  return leadTimes[category]
}

export function generateSampleOrders(): Order[] {
  const orders: Order[] = []
  const startDate = new Date("2024-01-01")
  const endDate = new Date("2025-12-31")
  let orderId = 1

  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const currentMonth = new Date("2025-12-01")
    const isHistorical = d < new Date("2025-11-01")
    const isNovember = yearMonth === "2025-11"
    const isCurrentMonth = yearMonth === "2025-12"
    const isNextMonth = yearMonth > "2025-12"
    const orderDate = new Date(yearMonth + "-15")

    // ESS orders
    const essProduct = productPortfolio.find((p) => p.code === "ESS-001")!
    const essQty = 50 + Math.floor(Math.random() * 30)
    const essLeadTime = calculateLeadTime("ESS")
    const essDeliveryDate = new Date(orderDate)
    essDeliveryDate.setDate(essDeliveryDate.getDate() + essLeadTime)

    let status: Order["status"]
    if (isHistorical) {
      const rand = Math.random()
      status = rand > 0.7 ? "delivered" : rand > 0.4 ? "shipped" : "in_production"
    } else if (isNovember) {
      // 11월 데이터: confirmed, shipped, delivered 상태 혼합
      const rand = Math.random()
      status = rand > 0.6 ? "delivered" : rand > 0.3 ? "shipped" : "confirmed"
    } else if (isCurrentMonth) {
      const rand = Math.random()
      status = rand > 0.6 ? "confirmed" : rand > 0.3 ? "approved" : "predicted"
    } else {
      status = "predicted"
    }

    orders.push({
      id: `ORD-${String(orderId++).padStart(6, "0")}`,
      orderDate: yearMonth,
      customer: "일본거래처",
      product: essProduct.code,
      category: "ESS",
      destination: "일본",
      predictedQuantity: essQty,
      confirmedQuantity: status !== "predicted" ? essQty : 0,
      unitPrice: essProduct.unitPrice,
      status,
      specialNotes: "월 1회 출하, 소량",
      estimatedDeliveryDate: essDeliveryDate.toISOString().split("T")[0],
      actualDeliveryDate: status === "delivered" ? essDeliveryDate.toISOString().split("T")[0] : undefined,
      createdAt: yearMonth + "-01",
      updatedAt: yearMonth + "-01",
    })

    // EV orders - 현대차와 삼성SDI 모두 생성
    ;["현대차", "삼성SDI"].forEach((customer) => {
      const evProducts = productPortfolio.filter((p) => p.category === "EV")
      evProducts.forEach((product) => {
        const baseQuantity = customer === "현대차" ? 500 : 350
        const variance = Math.floor(Math.random() * 200) - 100
        const quantity = Math.max(100, baseQuantity + variance)
        const leadTime = calculateLeadTime("EV")
        const deliveryDate = new Date(orderDate)
        deliveryDate.setDate(deliveryDate.getDate() + leadTime)

        let evStatus: Order["status"]
        if (isHistorical) {
          const rand = Math.random()
          evStatus = rand > 0.7 ? "delivered" : rand > 0.4 ? "shipped" : "in_production"
        } else if (isNovember) {
          const rand = Math.random()
          evStatus = rand > 0.6 ? "delivered" : rand > 0.3 ? "shipped" : "confirmed"
        } else if (isCurrentMonth) {
          const rand = Math.random()
          evStatus = rand > 0.6 ? "confirmed" : rand > 0.3 ? "approved" : "predicted"
        } else {
          evStatus = "predicted"
        }

        orders.push({
          id: `ORD-${String(orderId++).padStart(6, "0")}`,
          orderDate: yearMonth,
          customer: customer as "현대차" | "삼성SDI",
          product: product.code,
          category: "EV",
          destination: product.destination,
          predictedQuantity: quantity,
          confirmedQuantity: evStatus !== "predicted" ? quantity : 0,
          unitPrice: product.unitPrice,
          status: evStatus,
          specialNotes: "동일 품번 해외/국내 동시 출하",
          estimatedDeliveryDate: deliveryDate.toISOString().split("T")[0],
          actualDeliveryDate: evStatus === "delivered" ? deliveryDate.toISOString().split("T")[0] : undefined,
          createdAt: yearMonth + "-01",
          updatedAt: yearMonth + "-01",
        })
      })
    })

    // SV orders
    const svProducts = productPortfolio.filter((p) => p.category === "SV")
    svProducts.forEach((product) => {
      const qty = 20 + Math.floor(Math.random() * 30)
      const leadTime = calculateLeadTime("SV")
      const deliveryDate = new Date(orderDate)
      deliveryDate.setDate(deliveryDate.getDate() + leadTime)

      let svStatus: Order["status"]
      if (isHistorical) {
        const rand = Math.random()
        svStatus = rand > 0.7 ? "delivered" : rand > 0.4 ? "shipped" : "in_production"
      } else if (isNovember) {
        const rand = Math.random()
        svStatus = rand > 0.6 ? "delivered" : rand > 0.3 ? "shipped" : "confirmed"
      } else if (isCurrentMonth) {
        const rand = Math.random()
        svStatus = rand > 0.6 ? "confirmed" : rand > 0.3 ? "approved" : "predicted"
      } else {
        svStatus = "predicted"
      }

      orders.push({
        id: `ORD-${String(orderId++).padStart(6, "0")}`,
        orderDate: yearMonth,
        customer: "현대차",
        product: product.code,
        category: "SV",
        destination: product.destination,
        predictedQuantity: qty,
        confirmedQuantity: svStatus !== "predicted" ? qty : 0,
        unitPrice: product.unitPrice,
        status: svStatus,
        specialNotes: "AS 물량, 혼적 출하 가능",
        estimatedDeliveryDate: deliveryDate.toISOString().split("T")[0],
        actualDeliveryDate: svStatus === "delivered" ? deliveryDate.toISOString().split("T")[0] : undefined,
        createdAt: yearMonth + "-01",
        updatedAt: yearMonth + "-01",
      })
    })

    // PLBM orders
    const plbmProducts = productPortfolio.filter((p) => p.category === "PLBM")
    plbmProducts.forEach((product) => {
      const qty = 10 + Math.floor(Math.random() * 20)
      const leadTime = calculateLeadTime("PLBM")
      const deliveryDate = new Date(orderDate)
      deliveryDate.setDate(deliveryDate.getDate() + leadTime)

      let plbmStatus: Order["status"]
      if (isHistorical) {
        const rand = Math.random()
        plbmStatus = rand > 0.7 ? "delivered" : rand > 0.4 ? "shipped" : "in_production"
      } else if (isNovember) {
        const rand = Math.random()
        plbmStatus = rand > 0.6 ? "delivered" : rand > 0.3 ? "shipped" : "confirmed"
      } else if (isCurrentMonth) {
        const rand = Math.random()
        plbmStatus = rand > 0.6 ? "confirmed" : rand > 0.3 ? "approved" : "predicted"
      } else {
        plbmStatus = "predicted"
      }

      orders.push({
        id: `ORD-${String(orderId++).padStart(6, "0")}`,
        orderDate: yearMonth,
        customer: "현대차",
        product: product.code,
        category: "PLBM",
        destination: product.destination,
        predictedQuantity: qty,
        confirmedQuantity: plbmStatus !== "predicted" ? qty : 0,
        unitPrice: product.unitPrice,
        status: plbmStatus,
        specialNotes: `가변경로: ${product.route?.join(" → ")}`,
        estimatedDeliveryDate: deliveryDate.toISOString().split("T")[0],
        actualDeliveryDate: plbmStatus === "delivered" ? deliveryDate.toISOString().split("T")[0] : undefined,
        createdAt: yearMonth + "-01",
        updatedAt: yearMonth + "-01",
      })
    })
  }

  return orders
}

export function generateSampleProductions(orders: Order[]): Production[] {
  const productions: Production[] = []
  const productionOrders = orders.filter(
    (o) =>
      o.status === "approved" ||
      o.status === "in_production" ||
      o.status === "shipped" ||
      o.status === "delivered" ||
      o.status === "confirmed",
  )
  let prodId = 1

  productionOrders.forEach((order) => {
    if (order.confirmedQuantity === 0) return

    // EV는 광주1공장, 나머지는 광주2공장
    const productionLine = order.category === "EV" ? "광주1공장" : "광주2공장"
    const lineCapacity = productionLine === "광주1공장" ? 1000 : 800
    const tactTime = order.category === "EV" ? 30 : 45
    const plannedQuantity = order.confirmedQuantity
    const inspectedQuantity = Math.floor(plannedQuantity * (0.93 + Math.random() * 0.06))

    const orderDate = new Date(order.orderDate + "-01")
    const estimatedStartDate = new Date(orderDate)
    estimatedStartDate.setDate(estimatedStartDate.getDate() + 7)

    const actualStartDate = new Date(estimatedStartDate)
    actualStartDate.setDate(actualStartDate.getDate() + Math.floor(Math.random() * 3))

    let productionStatus: Production["status"]
    // 자재 부족 설정: 일부 planned 상태에 자재 부족 플래그
    const hasMaterialShortage = order.status === "confirmed" && Math.random() > 0.6

    if (order.status === "delivered" || order.status === "shipped") {
      productionStatus = "inspected"
    } else if (order.status === "in_production") {
      productionStatus = Math.random() > 0.5 ? "in_progress" : "completed"
    } else if (order.status === "confirmed") {
      productionStatus = "planned"
    } else {
      productionStatus = "planned"
    }

    productions.push({
      id: `PROD-${String(prodId).padStart(6, "0")}`,
      orderId: order.id,
      productionLine,
      lineCapacity,
      tactTime,
      plannedQuantity,
      inspectedQuantity: productionStatus === "inspected" || productionStatus === "completed" ? inspectedQuantity : 0,
      productionDate: order.orderDate,
      estimatedStartDate: estimatedStartDate.toISOString().split("T")[0],
      actualStartDate:
        productionStatus === "in_progress" || productionStatus === "completed" || productionStatus === "inspected"
          ? actualStartDate.toISOString().split("T")[0]
          : undefined,
      status: productionStatus,
      materialShortage: hasMaterialShortage,
      createdAt: order.orderDate + "-01",
    })
    prodId++
  })

  return productions
}

export function generateSampleInventory(productions: Production[], orders: Order[]): Inventory[] {
  const inventory: Inventory[] = []
  const inventoryMap = new Map<string, { category: ProductCategory; quantity: number }>()

  productions.forEach((prod) => {
    const order = orders.find((o) => o.id === prod.orderId)
    if (order && prod.status === "inspected") {
      const existing = inventoryMap.get(order.product) || { category: order.category, quantity: 0 }
      inventoryMap.set(order.product, {
        category: order.category,
        quantity: existing.quantity + prod.inspectedQuantity,
      })
    }
  })

  let invId = 1
  inventoryMap.forEach((data, product) => {
    inventory.push({
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

  return inventory
}

export function generateSampleDispatch(inventory: Inventory[], orders: Order[]): Dispatch[] {
  const dispatches: Dispatch[] = []
  let dispatchId = 1

  const relevantOrders = orders.filter(
    (o) =>
      o.status === "approved" || o.status === "in_production" || o.status === "delivered" || o.status === "shipped",
  )

  relevantOrders.forEach((order, index) => {
    if (index % 3 === 0) {
      const vehicleSizes: Array<"5톤" | "11톤" | "25톤"> = ["5톤", "11톤", "25톤"]
      const vehicleSize = vehicleSizes[Math.floor(Math.random() * vehicleSizes.length)]

      const dispatchDate = new Date(order.orderDate + "-20")
      const isMixed = order.category === "SV" || order.category === "PLBM"

      let dispatchStatus: Dispatch["status"]
      if (order.status === "delivered") {
        dispatchStatus = "completed"
      } else if (order.status === "shipped") {
        dispatchStatus = "dispatched"
      } else {
        dispatchStatus = "planned"
      }

      dispatches.push({
        id: `DISP-${String(dispatchId).padStart(6, "0")}`,
        dispatchNumber: `D-${order.orderDate.replace(/-/g, "")}-${String(dispatchId).padStart(3, "0")}`,
        vehicleNumber: `${Math.floor(Math.random() * 90 + 10)}가${Math.floor(Math.random() * 9000 + 1000)}`,
        vehicleSize,
        destination: order.destination,
        route: order.category === "PLBM" ? productPortfolio.find((p) => p.code === order.product)?.route : undefined,
        isMixedLoad: isMixed,
        products: [
          {
            product: order.product,
            category: order.category,
            quantity: order.confirmedQuantity,
            weight: order.confirmedQuantity * 25, // Assume 25kg per unit
          },
        ],
        estimatedWeight: order.confirmedQuantity * 25,
        actualWeight:
          dispatchStatus === "completed" || dispatchStatus === "dispatched"
            ? order.confirmedQuantity * 25 + Math.floor(Math.random() * 100 - 50)
            : null,
        dispatchDate: dispatchDate.toISOString().split("T")[0],
        status: dispatchStatus,
        createdAt: order.orderDate + "-15",
      })
      dispatchId++
    }
  })

  return dispatches
}

function generateSampleShipments(inventoryData: Inventory[], ordersData: Order[]): Shipment[] {
  const shipments: Shipment[] = []
  const productCategories = ["ESS", "EV", "SV", "PLBM"]
  const destinations = ["일본 (해외)", "유럽 (해외)", "창원", "광주", "울산", "경주"]

  // Generate shipments for completed and delivered productions
  const completedInventory = inventoryData.filter((inv) => inv.quantity > 0)

  for (let i = 0; i < Math.min(15, completedInventory.length); i++) {
    const inv = completedInventory[i]
    const relatedOrder = ordersData.find((o) => o.product === inv.product)

    if (relatedOrder) {
      const quantity = Math.floor(inv.quantity * (0.5 + Math.random() * 0.5))
      const unitPrice = 100000 + Math.random() * 900000

      shipments.push({
        id: `SHP-${Date.now()}-${i}`,
        shipmentNumber: `SHP-2025-${String(1001 + i).padStart(5, "0")}`,
        customer: relatedOrder.customer,
        destination: destinations[Math.floor(Math.random() * destinations.length)],
        shipmentDate: new Date(2025, 11, Math.floor(1 + Math.random() * 28)).toISOString().split("T")[0],
        products: [
          {
            productCode: inv.product,
            product: inv.product,
            category: productCategories[Math.floor(Math.random() * productCategories.length)] as ProductCategory,
            quantity: quantity,
          },
        ],
        totalAmount: quantity * unitPrice,
        status: Math.random() > 0.6 ? "registered" : Math.random() > 0.5 ? "dispatched" : "completed",
        createdAt: new Date().toISOString(),
      })
    }
  }

  return shipments
}

// In-memory storage (will be replaced with real DB in production)
let ordersData: Order[] = []
let productionsData: Production[] = []
let materialsData: Material[] = []
let inventoryData: Inventory[] = []
let dispatchData: Dispatch[] = []
let shipmentData: Shipment[] = []

export function initializeDatabase() {
  if (ordersData.length === 0) {
    console.log("[v0] Initializing database with comprehensive sample data...")

    ordersData = generateSampleOrders()
    productionsData = generateSampleProductions(ordersData)
    materialsData = [...materials]
    inventoryData = generateSampleInventory(productionsData, ordersData)
    dispatchData = generateSampleDispatch(inventoryData, ordersData)
    shipmentData = generateSampleShipments(inventoryData, ordersData)

    console.log("[v0] Database initialized:", {
      orders: ordersData.length,
      productions: productionsData.length,
      materials: materialsData.length,
      inventory: inventoryData.length,
      dispatch: dispatchData.length,
      shipments: shipmentData.length,
    })
  }

  return {
    orders: ordersData,
    productions: productionsData,
    inventory: inventoryData,
    dispatch: dispatchData,
    materials: materialsData,
    bom: bomData,
    shipments: shipmentData,
  }
}

// CRUD operations
export const db = {
  orders: {
    getAll: () => ordersData,
    getById: (id: string) => ordersData.find((o) => o.id === id),
    getByMonth: (yearMonth: string) => ordersData.filter((o) => o.orderDate === yearMonth),
    getByCustomer: (customer: string) => ordersData.filter((o) => o.customer === customer),
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
  materials: {
    getAll: () => materialsData,
    getByCode: (code: string) => materialsData.find((m) => m.code === code),
    update: (code: string, data: Partial<Material>) => {
      const index = materialsData.findIndex((m) => m.code === code)
      if (index !== -1) {
        materialsData[index] = { ...materialsData[index], ...data, updatedAt: new Date().toISOString() }
        return materialsData[index]
      }
      return null
    },
  },
  bom: {
    getByProduct: (productCode: string) => bomData.find((b) => b.productCode === productCode),
    getAll: () => bomData,
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
  shipments: {
    getAll: () => shipmentData,
    getById: (id: string) => shipmentData.find((s) => s.id === id),
    getByDispatchId: (dispatchId: string) => shipmentData.filter((s) => s.dispatchId === dispatchId),
    create: (shipment: Shipment) => {
      shipmentData.push(shipment)
      return shipment
    },
    update: (id: string, data: Partial<Shipment>) => {
      const index = shipmentData.findIndex((s) => s.id === id)
      if (index !== -1) {
        shipmentData[index] = { ...shipmentData[index], ...data }
        return shipmentData[index]
      }
      return null
    },
  },
}

const productPortfolio = [
  { code: "ESS-001", category: "ESS" as ProductCategory, name: "ESS Module A", destination: "일본", unitPrice: 150 },
  { code: "ESS-002", category: "ESS" as ProductCategory, name: "ESS Module B", destination: "일본", unitPrice: 155 },
  { code: "EV-100", category: "EV" as ProductCategory, name: "EV Battery Module", destination: "유럽", unitPrice: 200 },
  {
    code: "EV-100K",
    category: "EV" as ProductCategory,
    name: "EV Battery Module",
    destination: "창원",
    unitPrice: 200,
  },
  { code: "EV-200", category: "EV" as ProductCategory, name: "EV Pack Assembly", destination: "유럽", unitPrice: 250 },
  { code: "SV-001", category: "SV" as ProductCategory, name: "Service Module A", destination: "울산", unitPrice: 120 },
  { code: "SV-002", category: "SV" as ProductCategory, name: "Service Module B", destination: "경주", unitPrice: 115 },
  {
    code: "PLBM-A01",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec A1",
    destination: "울산글로비스",
    route: ["광주", "경주", "울산사외창고", "울산글로비스"],
    unitPrice: 180,
  },
  {
    code: "PLBM-A02",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec A2",
    destination: "울산글로비스",
    route: ["광주", "울산글로비스"],
    unitPrice: 175,
  },
  {
    code: "PLBM-B01",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec B1",
    destination: "경주",
    route: ["광주", "경주"],
    unitPrice: 170,
  },
  {
    code: "PLBM-B02",
    category: "PLBM" as ProductCategory,
    name: "PLBM Spec B2",
    destination: "울산사외창고",
    route: ["광주", "울산사외창고"],
    unitPrice: 172,
  },
]

const materials: Material[] = [
  {
    id: "MAT-001",
    code: "CELL-001",
    name: "리튬이온 배터리 셀",
    unit: "EA",
    minStock: 10000,
    currentStock: 15000,
    unitPrice: 5000,
    supplier: "LG에너지솔루션",
    leadTimeDays: 14,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "MAT-002",
    code: "PCB-001",
    name: "BMS PCB",
    unit: "EA",
    minStock: 5000,
    currentStock: 3000,
    unitPrice: 2000,
    supplier: "삼성전기",
    leadTimeDays: 7,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "MAT-003",
    code: "CASE-001",
    name: "알루미늄 케이스",
    unit: "EA",
    minStock: 3000,
    currentStock: 4000,
    unitPrice: 3000,
    supplier: "한국알루미늄",
    leadTimeDays: 10,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "MAT-004",
    code: "WIRE-001",
    name: "고전압 와이어 하네스",
    unit: "SET",
    minStock: 2000,
    currentStock: 1500,
    unitPrice: 1500,
    supplier: "유라코퍼레이션",
    leadTimeDays: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "MAT-005",
    code: "COOL-001",
    name: "냉각판",
    unit: "EA",
    minStock: 2000,
    currentStock: 2500,
    unitPrice: 4000,
    supplier: "한온시스템",
    leadTimeDays: 12,
    updatedAt: new Date().toISOString(),
  },
]

const bomData: BOM[] = [
  {
    productCode: "ESS-001",
    materials: [
      { materialCode: "CELL-001", quantity: 100 },
      { materialCode: "PCB-001", quantity: 2 },
      { materialCode: "CASE-001", quantity: 1 },
      { materialCode: "WIRE-001", quantity: 1 },
    ],
  },
  {
    productCode: "EV-100",
    materials: [
      { materialCode: "CELL-001", quantity: 150 },
      { materialCode: "PCB-001", quantity: 3 },
      { materialCode: "CASE-001", quantity: 1 },
      { materialCode: "WIRE-001", quantity: 2 },
      { materialCode: "COOL-001", quantity: 1 },
    ],
  },
  {
    productCode: "SV-001",
    materials: [
      { materialCode: "CELL-001", quantity: 50 },
      { materialCode: "PCB-001", quantity: 1 },
      { materialCode: "CASE-001", quantity: 1 },
    ],
  },
  {
    productCode: "PLBM-A01",
    materials: [
      { materialCode: "CELL-001", quantity: 80 },
      { materialCode: "PCB-001", quantity: 2 },
      { materialCode: "CASE-001", quantity: 1 },
      { materialCode: "WIRE-001", quantity: 1 },
      { materialCode: "COOL-001", quantity: 1 },
    ],
  },
]
