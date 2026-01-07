import * as fs from "fs"
import * as path from "path"

// 이 스크립트는 샘플 데이터를 생성하여 JSON 파일로 저장합니다
// 실행: npx tsx scripts/generate-sample-data.ts

// 타입 정의 (간단한 버전)
type ProductCategory = "EV" | "ESS" | "SV" | "PLBM"

interface BusinessPlan {
  id: string
  year: number
  totalTarget: number
  totalRevenue: number
  monthlyTargets?: { month: number; target: number; revenue: number }[]
  createdAt: string
  updatedAt: string
}

interface SalesPlan {
  id: string
  yearMonth: string
  customer: "현대차" | "삼성SDI" | "일본거래처" | "유럽거래처"
  productCode: string
  product: string
  category: ProductCategory
  plannedQuantity: number
  plannedRevenue: number
  status: "draft" | "approved"
  createdAt: string
  updatedAt: string
}

interface Shipment {
  id: string
  shipmentNumber: string
  customer: string
  destination: string
  shipmentDate: string
  products: Array<{
    productCode: string
    product: string
    category: ProductCategory
    quantity: number
  }>
  totalAmount: number
  status: "registered" | "dispatched" | "completed"
  dispatchIds: string[]
  createdAt: string
}

function generateSampleBusinessPlans(): BusinessPlan[] {
  const plans: BusinessPlan[] = []
  for (let year = 2024; year <= 2026; year++) {
    const baseTarget = year === 2024 ? 50000 : year === 2025 ? 60000 : 70000
    const baseRevenue = baseTarget * 200
    
    const monthlyTargets: { month: number; target: number; revenue: number }[] = []
    let totalTargetSum = 0
    let totalRevenueSum = 0
    
    for (let i = 0; i < 12; i++) {
      const variation = 0.5 + Math.random() * 1.3
      const monthlyTarget = Math.round((baseTarget / 12) * variation)
      const monthlyRevenue = Math.round((baseRevenue / 12) * variation)
      
      monthlyTargets.push({
        month: i + 1,
        target: monthlyTarget,
        revenue: monthlyRevenue,
      })
      
      totalTargetSum += monthlyTarget
      totalRevenueSum += monthlyRevenue
    }
    
    const targetRatio = baseTarget / totalTargetSum
    const revenueRatio = baseRevenue / totalRevenueSum
    
    monthlyTargets.forEach((mt) => {
      mt.target = Math.round(mt.target * targetRatio)
      mt.revenue = Math.round(mt.revenue * revenueRatio)
    })
    
    const finalTargetSum = monthlyTargets.reduce((sum, mt) => sum + mt.target, 0)
    const finalRevenueSum = monthlyTargets.reduce((sum, mt) => sum + mt.revenue, 0)
    const targetDiff = baseTarget - finalTargetSum
    const revenueDiff = baseRevenue - finalRevenueSum
    
    if (targetDiff !== 0) {
      const randomMonth = Math.floor(Math.random() * 12)
      monthlyTargets[randomMonth].target += targetDiff
    }
    if (revenueDiff !== 0) {
      const randomMonth = Math.floor(Math.random() * 12)
      monthlyTargets[randomMonth].revenue += revenueDiff
    }
    
    plans.push({
      id: `BP-${year}`,
      year,
      totalTarget: baseTarget,
      totalRevenue: baseRevenue,
      monthlyTargets,
      createdAt: `${year}-01-01`,
      updatedAt: `${year}-01-01`,
    })
  }
  return plans
}

function generateSampleSalesPlans(businessPlans: BusinessPlan[]): SalesPlan[] {
  const plans: SalesPlan[] = []
  const customers: SalesPlan["customer"][] = ["현대차", "삼성SDI", "일본거래처", "유럽거래처"]
  
  const customerProducts: Record<string, { code: string; name: string; category: ProductCategory }[]> = {
    현대차: [
      { code: "EV-100", name: "EV Battery Module", category: "EV" as ProductCategory },
      { code: "EV-100K", name: "EV Battery Module", category: "EV" as ProductCategory },
    ],
    삼성SDI: [
      { code: "EV-100", name: "EV Battery Module", category: "EV" as ProductCategory },
      { code: "SV-200", name: "SV Battery Pack", category: "SV" as ProductCategory },
    ],
    일본거래처: [
      { code: "ESS-001", name: "ESS Module A", category: "ESS" as ProductCategory },
      { code: "ESS-002", name: "ESS Module B", category: "ESS" as ProductCategory },
    ],
    유럽거래처: [
      { code: "PLBM-300", name: "PLBM Battery", category: "PLBM" as ProductCategory },
      { code: "EV-100", name: "EV Battery Module", category: "EV" as ProductCategory },
    ],
  }

  for (let year = 2024; year <= 2026; year++) {
    const businessPlan = businessPlans.find((bp) => bp.year === year)
    if (!businessPlan) continue

    for (let month = 1; month <= 12; month++) {
      const yearMonth = `${year}-${String(month).padStart(2, "0")}`
      const monthlyTarget = businessPlan.monthlyTargets?.find((mt) => mt.month === month)
      const monthlyBusinessTarget = monthlyTarget?.target || Math.round(businessPlan.totalTarget / 12)
      const monthlyBusinessRevenue = monthlyTarget?.revenue || Math.round(businessPlan.totalRevenue / 12)
      
      customers.forEach((customer) => {
        const products = customerProducts[customer] || []
        products.forEach((product) => {
          const randRate = 0.8 + Math.random() * 0.2 // 0.8 ~ 1.0
          const customerMultiplier = customer === "현대차" ? 0.4 : customer === "삼성SDI" ? 0.3 : customer === "일본거래처" ? 0.15 : 0.15
          const baseQty = Math.round(monthlyBusinessTarget * customerMultiplier * randRate)
          const quantity = Math.max(0, baseQty)
          
          const unitPrice = product.category === "EV" ? 200 : product.category === "ESS" ? 150 : 180
          const baseRevenue = Math.round(monthlyBusinessRevenue * customerMultiplier * randRate)
          const revenue = Math.max(0, baseRevenue)
          
          const isPast = year < 2026 || (year === 2026 && month <= 3)
          plans.push({
            id: `SP-${yearMonth}-${customer}-${product.code}`,
            yearMonth,
            customer,
            productCode: product.code,
            product: product.name,
            category: product.category,
            plannedQuantity: quantity,
            plannedRevenue: revenue || quantity * unitPrice,
            status: isPast ? "approved" : "draft",
            createdAt: `${yearMonth}-01`,
            updatedAt: `${yearMonth}-01`,
          })
        })
      })
    }
  }
  return plans
}

function generateSampleShipments(salesPlanData: SalesPlan[]): Shipment[] {
  const shipments: Shipment[] = []
  
  const salesPlansByMonth: Record<string, SalesPlan[]> = {}
  salesPlanData.forEach((plan) => {
    if (!salesPlansByMonth[plan.yearMonth]) {
      salesPlansByMonth[plan.yearMonth] = []
    }
    salesPlansByMonth[plan.yearMonth].push(plan)
  })

  for (let targetYear = 2024; targetYear <= 2026; targetYear++) {
    const maxMonth = targetYear === 2026 ? 3 : 12
    for (let month = 1; month <= maxMonth; month++) {
      const yearMonth = `${targetYear}-${String(month).padStart(2, "0")}`
      const monthSalesPlans = salesPlansByMonth[yearMonth] || []
      
      const plansByCustomer: Record<string, SalesPlan[]> = {}
      monthSalesPlans.forEach((plan) => {
        if (!plansByCustomer[plan.customer]) {
          plansByCustomer[plan.customer] = []
        }
        plansByCustomer[plan.customer].push(plan)
      })

      Object.keys(plansByCustomer).forEach((customer, customerIndex) => {
        const customerPlans = plansByCustomer[customer]
        
        customerPlans.forEach((plan, planIndex) => {
          const randRate = 0.7 + Math.random() * 0.3 // 0.7 ~ 1.0
          const shipmentQuantity = Math.floor(plan.plannedQuantity * randRate)
          if (shipmentQuantity <= 0) return

          const unitPrice = plan.plannedRevenue / plan.plannedQuantity || 200
          const day = Math.min(15 + planIndex * 2, 28)
          const shipmentDateStr = `${yearMonth}-${String(day).padStart(2, "0")}`

          shipments.push({
            id: `SHP-${yearMonth}-${customer}-${plan.productCode}`,
            shipmentNumber: `SHP-${yearMonth.replace(/-/g, "")}-${String(customerIndex * 10 + planIndex + 1).padStart(3, "0")}`,
            customer: customer,
            destination: "미정",
            shipmentDate: shipmentDateStr,
            products: [
              {
                productCode: plan.productCode,
                product: plan.product,
                category: plan.category,
                quantity: shipmentQuantity,
              },
            ],
            totalAmount: shipmentQuantity * unitPrice * 10000,
            status: "registered",
            dispatchIds: [],
            createdAt: shipmentDateStr + "T00:00:00.000Z",
          })
        })
      })
    }
  }

  return shipments
}

// 메인 실행
function main() {
  console.log("Generating sample data...")
  
  const businessPlans = generateSampleBusinessPlans()
  const salesPlans = generateSampleSalesPlans(businessPlans)
  const shipments = generateSampleShipments(salesPlans)
  
  const outputDir = path.join(process.cwd(), "data")
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(outputDir, "business-plans.json"),
    JSON.stringify(businessPlans, null, 2),
    "utf-8"
  )
  
  fs.writeFileSync(
    path.join(outputDir, "sales-plans.json"),
    JSON.stringify(salesPlans, null, 2),
    "utf-8"
  )
  
  fs.writeFileSync(
    path.join(outputDir, "shipments.json"),
    JSON.stringify(shipments, null, 2),
    "utf-8"
  )
  
  console.log(`Generated ${businessPlans.length} business plans`)
  console.log(`Generated ${salesPlans.length} sales plans`)
  console.log(`Generated ${shipments.length} shipments`)
  console.log(`Data saved to ${outputDir}/`)
}

main()
