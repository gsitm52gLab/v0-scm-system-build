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
import type { Inventory, Order } from "@/lib/db";
import {
  Package,
  Truck,
  CheckCircle2,
  Calendar,
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

interface ShippingOrder {
  id: string;
  orderNumber: string;
  orderId: string;
  customer: string;
  product: string;
  quantity: number;
  shippingDate: string;
  destination: string;
  status: "planned" | "ready" | "shipped" | "delivered";
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export default function ShippingPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingQuantity, setShippingQuantity] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inventoryResponse, ordersResponse] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/orders"),
      ]);

      const [inventoryData, ordersData] = await Promise.all([
        inventoryResponse.json(),
        ordersResponse.json(),
      ]);

      if (inventoryData.success) {
        setInventory(inventoryData.data);
      }

      if (ordersData.success) {
        // 승인된 주문만 가져오기
        const approvedOrders = ordersData.data.filter(
          (o: Order) => o.status === "approved" || o.status === "in_production"
        );
        setOrders(approvedOrders);
      }

      // 출하 주문 목록 (로컬 스토리지에서 가져오기)
      const savedShippingOrders = localStorage.getItem("shippingOrders");
      if (savedShippingOrders) {
        setShippingOrders(JSON.parse(savedShippingOrders));
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

  const handleOpenShippingDialog = (order: Order) => {
    const inventoryItem = inventory.find((i) => i.product === order.product);
    if (!inventoryItem || inventoryItem.quantity === 0) {
      toast({
        title: "재고 부족",
        description: "출고 가능한 재고가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setSelectedOrder(order);
    setShippingQuantity(
      Math.min(order.confirmedQuantity, inventoryItem.quantity)
    );
    setShowShippingDialog(true);
  };

  const handleCreateShippingOrder = async () => {
    if (!selectedOrder || shippingQuantity <= 0) {
      toast({
        title: "입력 오류",
        description: "출하 수량을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const inventoryItem = inventory.find(
      (i) => i.product === selectedOrder.product
    );
    if (!inventoryItem || inventoryItem.quantity < shippingQuantity) {
      toast({
        title: "재고 부족",
        description: "재고가 부족합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newShippingOrder: ShippingOrder = {
        id: `SHIP-${Date.now()}`,
        orderNumber: `SH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        orderId: selectedOrder.id,
        customer: selectedOrder.customer,
        product: selectedOrder.product,
        quantity: shippingQuantity,
        shippingDate: new Date().toISOString(),
        destination: selectedOrder.destination,
        status: "planned",
        createdAt: new Date().toISOString(),
      };

      // 재고 차감
      await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: selectedOrder.product,
          quantity: inventoryItem.quantity - shippingQuantity,
        }),
      });

      // 주문 상태 업데이트
      await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOrder.id,
          status: "in_production",
        }),
      });

      // 출하 주문 저장
      const updatedShippingOrders = [...shippingOrders, newShippingOrder];
      setShippingOrders(updatedShippingOrders);
      localStorage.setItem(
        "shippingOrders",
        JSON.stringify(updatedShippingOrders)
      );

      toast({
        title: "출하 계획 생성 완료",
        description: `${selectedOrder.customer} - ${selectedOrder.product} ${shippingQuantity}대 출하 계획이 생성되었습니다.`,
      });

      setShowShippingDialog(false);
      setSelectedOrder(null);
      setShippingQuantity(0);
      await fetchData();
    } catch (error) {
      console.error("[v0] Failed to create shipping order:", error);
      toast({
        title: "오류",
        description: "출하 계획 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReadyShipping = async (shippingId: string) => {
    try {
      const updatedOrders = shippingOrders.map((order) =>
        order.id === shippingId ? { ...order, status: "ready" as const } : order
      );
      setShippingOrders(updatedOrders);
      localStorage.setItem("shippingOrders", JSON.stringify(updatedOrders));

      toast({
        title: "출고 준비 완료",
        description: "출고 준비가 완료되었습니다.",
      });
    } catch (error) {
      console.error("[v0] Failed to ready shipping:", error);
    }
  };

  const handleShipOrder = async (shippingId: string) => {
    try {
      const updatedOrders = shippingOrders.map((order) =>
        order.id === shippingId
          ? {
              ...order,
              status: "shipped" as const,
              shippedAt: new Date().toISOString(),
            }
          : order
      );
      setShippingOrders(updatedOrders);
      localStorage.setItem("shippingOrders", JSON.stringify(updatedOrders));

      // 주문 상태 업데이트
      const shippingOrder = shippingOrders.find((o) => o.id === shippingId);
      if (shippingOrder) {
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: shippingOrder.orderId,
            status: "shipped",
          }),
        });
      }

      toast({
        title: "출하 완료",
        description: "제품이 출하되었습니다.",
      });
    } catch (error) {
      console.error("[v0] Failed to ship order:", error);
    }
  };

  const handleDeliverOrder = async (shippingId: string) => {
    try {
      const updatedOrders = shippingOrders.map((order) =>
        order.id === shippingId
          ? {
              ...order,
              status: "delivered" as const,
              deliveredAt: new Date().toISOString(),
            }
          : order
      );
      setShippingOrders(updatedOrders);
      localStorage.setItem("shippingOrders", JSON.stringify(updatedOrders));

      // 주문 상태 업데이트
      const shippingOrder = shippingOrders.find((o) => o.id === shippingId);
      if (shippingOrder) {
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: shippingOrder.orderId,
            status: "delivered",
            actualDeliveryDate: new Date().toISOString(),
          }),
        });
      }

      toast({
        title: "배송 완료",
        description: "고객사에 배송이 완료되었습니다.",
      });
    } catch (error) {
      console.error("[v0] Failed to deliver order:", error);
    }
  };

  const plannedShippings = shippingOrders.filter((s) => s.status === "planned");
  const readyShippings = shippingOrders.filter((s) => s.status === "ready");
  const shippedOrders = shippingOrders.filter((s) => s.status === "shipped");
  const deliveredOrders = shippingOrders.filter((s) => s.status === "delivered");

  const stats = {
    totalInventory: inventory.reduce((sum, i) => sum + i.quantity, 0),
    plannedCount: plannedShippings.length,
    readyCount: readyShippings.length,
    shippedCount: shippedOrders.length,
    deliveredCount: deliveredOrders.length,
    availableOrders: orders.length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">출하 관리</h1>
          <p className="text-muted-foreground mt-1">
            창고 재고를 확인하고 출하 계획을 수립합니다
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 재고</CardDescription>
              <CardTitle className="text-3xl">
                {stats.totalInventory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">대</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700">
                출하 계획
              </CardDescription>
              <CardTitle className="text-3xl text-blue-700">
                {stats.plannedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-600">계획 수립</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-yellow-700">
                출고 준비
              </CardDescription>
              <CardTitle className="text-3xl text-yellow-700">
                {stats.readyCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-600">준비 중</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700">
                출하 중
              </CardDescription>
              <CardTitle className="text-3xl text-purple-700">
                {stats.shippedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-600">배송 중</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardDescription className="text-green-700">
                배송 완료
              </CardDescription>
              <CardTitle className="text-3xl text-green-700">
                {stats.deliveredCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600">완료</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>출하 가능</CardDescription>
              <CardTitle className="text-3xl">
                {stats.availableOrders}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">주문</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>창고 재고 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                데이터를 불러오는 중...
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제품코드</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>재고수량</TableHead>
                      <TableHead>보관위치</TableHead>
                      <TableHead>최종 업데이트</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          재고가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product}
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="font-semibold text-lg">
                            {item.quantity.toLocaleString()}대
                          </TableCell>
                          <TableCell>{item.location}</TableCell>
                          <TableCell>
                            {new Date(item.updatedAt).toLocaleDateString(
                              "ko-KR"
                            )}
                          </TableCell>
                          <TableCell>
                            {item.quantity > 0 ? (
                              <Badge className="bg-green-600">출고 가능</Badge>
                            ) : (
                              <Badge variant="secondary">재고 없음</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>출하 가능 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문번호</TableHead>
                    <TableHead>발주사</TableHead>
                    <TableHead>제품</TableHead>
                    <TableHead>주문수량</TableHead>
                    <TableHead>재고수량</TableHead>
                    <TableHead>납품지</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-8"
                      >
                        출하 가능한 주문이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => {
                      const inventoryItem = inventory.find(
                        (i) => i.product === order.product
                      );
                      const availableQty = inventoryItem?.quantity || 0;

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.id}
                          </TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.product}</TableCell>
                          <TableCell className="font-semibold">
                            {order.confirmedQuantity.toLocaleString()}대
                          </TableCell>
                          <TableCell
                            className={
                              availableQty >= order.confirmedQuantity
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {availableQty.toLocaleString()}대
                          </TableCell>
                          <TableCell>{order.destination}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenShippingDialog(order)}
                              disabled={availableQty === 0}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Package className="w-4 h-4 mr-1" />
                              출하 계획
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>출하 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="planned" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="planned">
                  출하 계획 ({plannedShippings.length})
                </TabsTrigger>
                <TabsTrigger value="ready">
                  출고 준비 ({readyShippings.length})
                </TabsTrigger>
                <TabsTrigger value="shipped">
                  출하 중 ({shippedOrders.length})
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  배송 완료 ({deliveredOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="planned" className="mt-6">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>출하번호</TableHead>
                        <TableHead>발주사</TableHead>
                        <TableHead>제품</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>납품지</TableHead>
                        <TableHead>계획일</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plannedShippings.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-8"
                          >
                            출하 계획이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        plannedShippings.map((shipping) => (
                          <TableRow key={shipping.id}>
                            <TableCell className="font-medium">
                              {shipping.orderNumber}
                            </TableCell>
                            <TableCell>{shipping.customer}</TableCell>
                            <TableCell>{shipping.product}</TableCell>
                            <TableCell className="font-semibold">
                              {shipping.quantity.toLocaleString()}대
                            </TableCell>
                            <TableCell>{shipping.destination}</TableCell>
                            <TableCell>
                              {new Date(
                                shipping.shippingDate
                              ).toLocaleDateString("ko-KR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleReadyShipping(shipping.id)}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                출고 준비
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="ready" className="mt-6">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>출하번호</TableHead>
                        <TableHead>발주사</TableHead>
                        <TableHead>제품</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>납품지</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readyShippings.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-8"
                          >
                            출고 준비 중인 항목이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        readyShippings.map((shipping) => (
                          <TableRow key={shipping.id}>
                            <TableCell className="font-medium">
                              {shipping.orderNumber}
                            </TableCell>
                            <TableCell>{shipping.customer}</TableCell>
                            <TableCell>{shipping.product}</TableCell>
                            <TableCell className="font-semibold">
                              {shipping.quantity.toLocaleString()}대
                            </TableCell>
                            <TableCell>{shipping.destination}</TableCell>
                            <TableCell>
                              <Badge className="bg-yellow-600">출고 준비</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleShipOrder(shipping.id)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <Truck className="w-4 h-4 mr-1" />
                                출하
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="shipped" className="mt-6">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>출하번호</TableHead>
                        <TableHead>발주사</TableHead>
                        <TableHead>제품</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>납품지</TableHead>
                        <TableHead>출하일</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippedOrders.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-8"
                          >
                            출하 중인 항목이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        shippedOrders.map((shipping) => (
                          <TableRow key={shipping.id}>
                            <TableCell className="font-medium">
                              {shipping.orderNumber}
                            </TableCell>
                            <TableCell>{shipping.customer}</TableCell>
                            <TableCell>{shipping.product}</TableCell>
                            <TableCell className="font-semibold">
                              {shipping.quantity.toLocaleString()}대
                            </TableCell>
                            <TableCell>{shipping.destination}</TableCell>
                            <TableCell>
                              {shipping.shippedAt
                                ? new Date(
                                    shipping.shippedAt
                                  ).toLocaleDateString("ko-KR")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleDeliverOrder(shipping.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                배송 완료
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
                        <TableHead>출하번호</TableHead>
                        <TableHead>발주사</TableHead>
                        <TableHead>제품</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>납품지</TableHead>
                        <TableHead>출하일</TableHead>
                        <TableHead>배송완료일</TableHead>
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
                            배송 완료된 항목이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        deliveredOrders.map((shipping) => (
                          <TableRow key={shipping.id}>
                            <TableCell className="font-medium">
                              {shipping.orderNumber}
                            </TableCell>
                            <TableCell>{shipping.customer}</TableCell>
                            <TableCell>{shipping.product}</TableCell>
                            <TableCell className="font-semibold">
                              {shipping.quantity.toLocaleString()}대
                            </TableCell>
                            <TableCell>{shipping.destination}</TableCell>
                            <TableCell>
                              {shipping.shippedAt
                                ? new Date(
                                    shipping.shippedAt
                                  ).toLocaleDateString("ko-KR")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {shipping.deliveredAt
                                ? new Date(
                                    shipping.deliveredAt
                                  ).toLocaleDateString("ko-KR")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                배송 완료
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
          </CardContent>
        </Card>
      </div>

      <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>출하 계획 생성</DialogTitle>
            <DialogDescription>
              출하 수량을 입력하고 계획을 생성하세요.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    주문번호
                  </Label>
                  <p className="font-medium">{selectedOrder.id}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    발주사
                  </Label>
                  <p className="font-medium">{selectedOrder.customer}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">제품</Label>
                  <p className="font-medium">{selectedOrder.product}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    납품지
                  </Label>
                  <p className="font-medium">{selectedOrder.destination}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    주문 수량
                  </Label>
                  <p className="font-medium">
                    {selectedOrder.confirmedQuantity.toLocaleString()}대
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    재고 수량
                  </Label>
                  <p className="font-medium text-green-600">
                    {(
                      inventory.find((i) => i.product === selectedOrder.product)
                        ?.quantity || 0
                    ).toLocaleString()}
                    대
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingQuantity">출하 수량</Label>
                <Input
                  id="shippingQuantity"
                  type="number"
                  value={shippingQuantity}
                  onChange={(e) =>
                    setShippingQuantity(Number.parseInt(e.target.value) || 0)
                  }
                  min={1}
                  max={Math.min(
                    selectedOrder.confirmedQuantity,
                    inventory.find((i) => i.product === selectedOrder.product)
                      ?.quantity || 0
                  )}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>출하 후 재고:</strong>{" "}
                  {(
                    (inventory.find((i) => i.product === selectedOrder.product)
                      ?.quantity || 0) - shippingQuantity
                  ).toLocaleString()}
                  대
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowShippingDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateShippingOrder}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Package className="w-4 h-4 mr-2" />
              출하 계획 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

