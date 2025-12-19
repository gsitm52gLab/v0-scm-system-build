"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Material, PurchaseOrder } from "@/lib/db";
import {
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PurchasePage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null
  );
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [materialsResponse, purchaseOrdersResponse] = await Promise.all([
        fetch("/api/materials"),
        fetch("/api/purchase-orders"),
      ]);

      const [materialsData, purchaseOrdersData] = await Promise.all([
        materialsResponse.json(),
        purchaseOrdersResponse.json(),
      ]);

      if (materialsData.success) {
        setMaterials(materialsData.data);
      }

      if (purchaseOrdersData.success) {
        setPurchaseOrders(purchaseOrdersData.data);
      }
    } catch (error) {
      console.error("[v0] Failed to fetch data:", error);
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPurchaseDialog = (material: Material) => {
    setSelectedMaterial(material);
    const shortage = Math.max(0, material.minStock - material.currentStock);
    setPurchaseQuantity(shortage > 0 ? shortage * 2 : material.minStock);
    setShowPurchaseDialog(true);
  };

  const handleCreatePurchaseOrder = async () => {
    if (!selectedMaterial || purchaseQuantity <= 0) {
      toast({
        title: "입력 오류",
        description: "구매 수량을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderDate = new Date();
      const expectedDeliveryDate = new Date(
        orderDate.getTime() +
          selectedMaterial.leadTimeDays * 24 * 60 * 60 * 1000
      );

      const orderNumber = `PO-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const newOrder: PurchaseOrder = {
        id: `PO-${Date.now()}`,
        orderNumber,
        materialCode: selectedMaterial.code,
        materialName: selectedMaterial.name,
        supplier: selectedMaterial.supplier,
        quantity: purchaseQuantity,
        unitPrice: selectedMaterial.unitPrice,
        totalAmount: purchaseQuantity * selectedMaterial.unitPrice,
        orderDate: orderDate.toISOString(),
        expectedDeliveryDate: expectedDeliveryDate.toISOString(),
        status: "pending",
        requestedBy: "구매담당자",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "구매 요청 완료",
          description: `${selectedMaterial.name} ${purchaseQuantity}개 구매 요청이 완료되었습니다.`,
        });

        setShowPurchaseDialog(false);
        setSelectedMaterial(null);
        setPurchaseQuantity(0);
        await fetchData();
      }
    } catch (error) {
      console.error("[v0] Failed to create purchase order:", error);
      toast({
        title: "오류",
        description: "구매 요청에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleApprovePurchaseOrder = async (orderId: string) => {
    try {
      const response = await fetch("/api/purchase-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: "approved",
          approvedBy: "구매관리자",
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "승인 완료",
          description: "구매 요청이 승인되었습니다.",
        });
        await fetchData();
      }
    } catch (error) {
      console.error("[v0] Failed to approve purchase order:", error);
      toast({
        title: "오류",
        description: "승인 처리에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleOrderPurchase = async (orderId: string) => {
    try {
      const order = purchaseOrders.find((po) => po.id === orderId);
      if (!order) return;

      const response = await fetch("/api/purchase-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: "ordered",
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "발주 완료",
          description: `${order.supplier}에 발주가 완료되었습니다.`,
        });
        await fetchData();
      }
    } catch (error) {
      console.error("[v0] Failed to order purchase:", error);
      toast({
        title: "오류",
        description: "발주 처리에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReceiveMaterial = async (orderId: string) => {
    try {
      const order = purchaseOrders.find((po) => po.id === orderId);
      if (!order) return;

      // Update purchase order status
      await fetch("/api/purchase-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: "delivered",
          actualDeliveryDate: new Date().toISOString(),
        }),
      });

      // Update material stock
      const material = materials.find((m) => m.code === order.materialCode);
      if (material) {
        await fetch("/api/materials", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: order.materialCode,
            currentStock: material.currentStock + order.quantity,
          }),
        });
      }

      toast({
        title: "입고 완료",
        description: `${order.materialName} ${order.quantity}개가 입고되었습니다.`,
      });

      await fetchData();
    } catch (error) {
      console.error("[v0] Failed to receive material:", error);
      toast({
        title: "오류",
        description: "입고 처리에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const insufficientMaterials = materials.filter(
    (m) => m.currentStock < m.minStock
  );
  const sufficientMaterials = materials.filter(
    (m) => m.currentStock >= m.minStock
  );

  const pendingOrders = purchaseOrders.filter((po) => po.status === "pending");
  const approvedOrders = purchaseOrders.filter(
    (po) => po.status === "approved"
  );
  const orderedOrders = purchaseOrders.filter((po) => po.status === "ordered");
  const deliveredOrders = purchaseOrders.filter(
    (po) => po.status === "delivered"
  );

  const stats = {
    totalMaterials: materials.length,
    insufficientCount: insufficientMaterials.length,
    sufficientCount: sufficientMaterials.length,
    pendingOrdersCount: pendingOrders.length,
    orderedOrdersCount: orderedOrders.length,
    totalPendingAmount: pendingOrders.reduce(
      (sum, po) => sum + po.totalAmount,
      0
    ),
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">자재 관리</h1>
          <p className="text-muted-foreground mt-1">
            자재 현황을 확인하고 부족한 자재를 구매 요청합니다
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전체 자재</CardDescription>
              <CardTitle className="text-3xl">{stats.totalMaterials}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">품목</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-700">
                부족 자재
              </CardDescription>
              <CardTitle className="text-3xl text-red-700">
                {stats.insufficientCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">구매 필요</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700">
                충분 자재
              </CardDescription>
              <CardTitle className="text-3xl text-green-700">
                {stats.sufficientCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600">재고 충분</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-700">
                승인 대기
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-700">
                {stats.pendingOrdersCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-600">구매 요청</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700">
                발주 중
              </CardDescription>
              <CardTitle className="text-3xl text-blue-700">
                {stats.orderedOrdersCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-600">입고 대기</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>대기 금액</CardDescription>
              <CardTitle className="text-2xl">
                {(stats.totalPendingAmount / 1000000).toFixed(1)}M
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">원</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>자재 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                데이터를 불러오는 중...
              </div>
            ) : (
              <Tabs defaultValue="insufficient" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="insufficient">
                    부족 자재 ({insufficientMaterials.length})
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    전체 자재 ({materials.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="insufficient" className="mt-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>자재코드</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>현재재고</TableHead>
                          <TableHead>최소재고</TableHead>
                          <TableHead>부족수량</TableHead>
                          <TableHead>단가</TableHead>
                          <TableHead>리드타임</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insufficientMaterials.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="text-center text-muted-foreground py-8"
                            >
                              부족한 자재가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          insufficientMaterials.map((material) => {
                            const shortage =
                              material.minStock - material.currentStock;
                            return (
                              <TableRow key={material.id}>
                                <TableCell className="font-medium">
                                  {material.code}
                                </TableCell>
                                <TableCell>{material.name}</TableCell>
                                <TableCell>{material.category}</TableCell>
                                <TableCell>{material.supplier}</TableCell>
                                <TableCell className="text-red-600 font-semibold">
                                  {material.currentStock.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  {material.minStock.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-red-600 font-semibold">
                                  {shortage.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  {material.unitPrice.toLocaleString()}원
                                </TableCell>
                                <TableCell>{material.leadTimeDays}일</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleOpenPurchaseDialog(material)
                                    }
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    <ShoppingCart className="w-4 h-4 mr-1" />
                                    구매 요청
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="all" className="mt-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>자재코드</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>현재재고</TableHead>
                          <TableHead>최소재고</TableHead>
                          <TableHead>단가</TableHead>
                          <TableHead>리드타임</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materials.map((material) => {
                          const isInsufficient =
                            material.currentStock < material.minStock;
                          return (
                            <TableRow key={material.id}>
                              <TableCell className="font-medium">
                                {material.code}
                              </TableCell>
                              <TableCell>{material.name}</TableCell>
                              <TableCell>{material.category}</TableCell>
                              <TableCell>{material.supplier}</TableCell>
                              <TableCell
                                className={
                                  isInsufficient
                                    ? "text-red-600 font-semibold"
                                    : ""
                                }
                              >
                                {material.currentStock.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {material.minStock.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {material.unitPrice.toLocaleString()}원
                              </TableCell>
                              <TableCell>{material.leadTimeDays}일</TableCell>
                              <TableCell>
                                {isInsufficient ? (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    부족
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-600">충분</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant={
                                    isInsufficient ? "default" : "outline"
                                  }
                                  onClick={() =>
                                    handleOpenPurchaseDialog(material)
                                  }
                                  className={
                                    isInsufficient
                                      ? "bg-orange-600 hover:bg-orange-700"
                                      : ""
                                  }
                                >
                                  <ShoppingCart className="w-4 h-4 mr-1" />
                                  구매 요청
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>구매 주문 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                데이터를 불러오는 중...
              </div>
            ) : (
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">
                    승인 대기 ({pendingOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    승인 완료 ({approvedOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="ordered">
                    발주 중 ({orderedOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="delivered">
                    입고 완료 ({deliveredOrders.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>주문번호</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>단가</TableHead>
                          <TableHead>총액</TableHead>
                          <TableHead>요청일</TableHead>
                          <TableHead>요청자</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingOrders.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={9}
                              className="text-center text-muted-foreground py-8"
                            >
                              승인 대기 중인 주문이 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell>{order.materialName}</TableCell>
                              <TableCell>{order.supplier}</TableCell>
                              <TableCell className="font-semibold">
                                {order.quantity.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {order.unitPrice.toLocaleString()}원
                              </TableCell>
                              <TableCell className="font-semibold">
                                {order.totalAmount.toLocaleString()}원
                              </TableCell>
                              <TableCell>
                                {new Date(order.orderDate).toLocaleDateString(
                                  "ko-KR"
                                )}
                              </TableCell>
                              <TableCell>{order.requestedBy}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleApprovePurchaseOrder(order.id)
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  승인
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="approved" className="mt-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>주문번호</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>총액</TableHead>
                          <TableHead>승인자</TableHead>
                          <TableHead>예상 입고일</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedOrders.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground py-8"
                            >
                              승인 완료된 주문이 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          approvedOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell>{order.materialName}</TableCell>
                              <TableCell>{order.supplier}</TableCell>
                              <TableCell className="font-semibold">
                                {order.quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {order.totalAmount.toLocaleString()}원
                              </TableCell>
                              <TableCell>{order.approvedBy}</TableCell>
                              <TableCell>
                                {new Date(
                                  order.expectedDeliveryDate
                                ).toLocaleDateString("ko-KR")}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleOrderPurchase(order.id)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Package className="w-4 h-4 mr-1" />
                                  발주
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="ordered" className="mt-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>주문번호</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>총액</TableHead>
                          <TableHead>예상 입고일</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderedOrders.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground py-8"
                            >
                              발주 중인 주문이 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          orderedOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell>{order.materialName}</TableCell>
                              <TableCell>{order.supplier}</TableCell>
                              <TableCell className="font-semibold">
                                {order.quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {order.totalAmount.toLocaleString()}원
                              </TableCell>
                              <TableCell>
                                {new Date(
                                  order.expectedDeliveryDate
                                ).toLocaleDateString("ko-KR")}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-blue-600">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  입고 대기
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleReceiveMaterial(order.id)
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  입고 처리
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="delivered" className="mt-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>주문번호</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>총액</TableHead>
                          <TableHead>주문일</TableHead>
                          <TableHead>입고일</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground py-8"
                            >
                              입고 완료된 주문이 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          deliveredOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell>{order.materialName}</TableCell>
                              <TableCell>{order.supplier}</TableCell>
                              <TableCell className="font-semibold">
                                {order.quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {order.totalAmount.toLocaleString()}원
                              </TableCell>
                              <TableCell>
                                {new Date(order.orderDate).toLocaleDateString(
                                  "ko-KR"
                                )}
                              </TableCell>
                              <TableCell>
                                {order.actualDeliveryDate
                                  ? new Date(
                                      order.actualDeliveryDate
                                    ).toLocaleDateString("ko-KR")
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-600">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  입고 완료
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구매 요청</DialogTitle>
            <DialogDescription>
              자재 구매 수량을 입력하고 요청하세요.
            </DialogDescription>
          </DialogHeader>
          {selectedMaterial && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    자재명
                  </Label>
                  <p className="font-medium">{selectedMaterial.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    자재코드
                  </Label>
                  <p className="font-medium">{selectedMaterial.code}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    공급업체
                  </Label>
                  <p className="font-medium">{selectedMaterial.supplier}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    리드타임
                  </Label>
                  <p className="font-medium">
                    {selectedMaterial.leadTimeDays}일
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    현재 재고
                  </Label>
                  <p className="font-medium text-red-600">
                    {selectedMaterial.currentStock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    최소 재고
                  </Label>
                  <p className="font-medium">
                    {selectedMaterial.minStock.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">구매 수량</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={purchaseQuantity}
                  onChange={(e) =>
                    setPurchaseQuantity(Number.parseInt(e.target.value) || 0)
                  }
                  min={1}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">단가</span>
                  <span className="font-medium">
                    {selectedMaterial.unitPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">수량</span>
                  <span className="font-medium">
                    {purchaseQuantity.toLocaleString()}개
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">총 금액</span>
                  <span className="font-semibold text-lg">
                    {(
                      selectedMaterial.unitPrice * purchaseQuantity
                    ).toLocaleString()}
                    원
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>예상 입고일:</strong>{" "}
                  {new Date(
                    Date.now() +
                      selectedMaterial.leadTimeDays * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPurchaseDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreatePurchaseOrder}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              구매 요청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
