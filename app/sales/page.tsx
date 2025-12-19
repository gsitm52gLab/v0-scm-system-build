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
import { StatCard } from "@/components/ui/stat-card";
import type { Order } from "@/lib/db";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Database,
  Download,
  Filter,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle,
  TrendingUp,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showSapSyncDialog, setShowSapSyncDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCustomer, setFilterCustomer] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      if (data.success) {
        // SRM 연동 주문(predicted) + 확정 주문(confirmed) + 승인 주문(approved) 모두 표시
        setOrders(
          data.data.filter(
            (o: Order) =>
              o.status === "predicted" ||
              o.status === "confirmed" ||
              o.status === "approved"
          )
        );
      }
    } catch (error) {
      console.error("[v0] Failed to fetch orders:", error);
      toast({
        title: "오류",
        description: "판매 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.id));
    }
  };

  const handleApproveOrders = async () => {
    try {
      // Update orders to approved status
      for (const orderId of selectedOrders) {
        const order = orders.find((o) => o.id === orderId);
        if (!order) continue;

        // 수량 결정: confirmedQuantity가 있으면 사용, 없으면 predictedQuantity 사용
        const quantity = order.confirmedQuantity || order.predictedQuantity;

        // 주문 상태를 approved로 변경하고 confirmedQuantity 설정
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: orderId,
            status: "approved",
            confirmedQuantity: quantity,
          }),
        });

        // Create production records
        const productionLine =
          order.product === "EV" ? "광주1공장" : "음성공장";
        const productionId = `PROD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        await fetch("/api/productions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: productionId,
            orderId: order.id,
            productionLine,
            plannedQuantity: quantity,
            inspectedQuantity: 0,
            productionDate: order.orderDate,
            status: "planned",
            createdAt: new Date().toISOString(),
          }),
        });
      }

      toast({
        title: "승인 완료",
        description: `${selectedOrders.length}건의 발주가 승인되고 생산관리자에게 이관되었습니다.`,
      });

      setSelectedOrders([]);
      setShowApprovalDialog(false);
      await fetchOrders();
    } catch (error) {
      console.error("[v0] Failed to approve orders:", error);
      toast({
        title: "오류",
        description: "발주 승인에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleRejectOrders = async () => {
    try {
      for (const orderId of selectedOrders) {
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId, status: "predicted" }),
        });
      }

      toast({
        title: "반려 완료",
        description: `${selectedOrders.length}건의 발주가 반려되었습니다.`,
      });

      setSelectedOrders([]);
      await fetchOrders();
    } catch (error) {
      console.error("[v0] Failed to reject orders:", error);
    }
  };

  const handleSapSync = async () => {
    try {
      for (const orderId of selectedOrders) {
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: orderId,
            sapSyncStatus: "synced",
            sapSyncDate: new Date().toISOString(),
            sapSyncBy: "영업담당자",
          }),
        });
      }

      toast({
        title: "SAP 연동 완료",
        description: `${selectedOrders.length}건의 주문이 SAP에 연동되었습니다.`,
      });

      setSelectedOrders([]);
      setShowSapSyncDialog(false);
      await fetchOrders();
    } catch (error) {
      console.error("[v0] Failed to sync with SAP:", error);
      toast({
        title: "오류",
        description: "SAP 연동에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const stats = {
    totalOrders: orders.length,
    totalQuantity: orders.reduce(
      (sum, o) => sum + (o.confirmedQuantity || o.predictedQuantity),
      0
    ),
    srmOrders: orders.filter((o) => o.srmOrderNumber).length,
    approvedOrders: orders.filter((o) => o.status === "approved").length,
    pendingOrders: orders.filter(
      (o) => o.status === "predicted" || o.status === "confirmed"
    ).length,
    sapSyncedOrders: orders.filter((o) => o.sapSyncStatus === "synced").length,
    hyundai: orders
      .filter((o) => o.customer === "현대차")
      .reduce(
        (sum, o) => sum + (o.confirmedQuantity || o.predictedQuantity),
        0
      ),
    samsung: orders
      .filter((o) => o.customer === "삼성SDI")
      .reduce(
        (sum, o) => sum + (o.confirmedQuantity || o.predictedQuantity),
        0
      ),
  };

  // 필터링된 주문 목록
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || order.status === filterStatus;

    const matchesCustomer =
      filterCustomer === "all" || order.customer === filterCustomer;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              판매 계획 대시보드
            </h1>
            <p className="text-muted-foreground mt-1">
              SRM 연동 주문 및 발주사 확정 주문을 검토하고 승인하여
              생산관리자에게 이관합니다
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="총 주문"
            value={stats.totalOrders}
            icon={<ShoppingCart />}
            variant="info"
            suffix="건"
            description={`총 수량: ${stats.totalQuantity.toLocaleString()}대`}
          />
          <StatCard
            label="승인 대기"
            value={stats.pendingOrders}
            icon={<Clock />}
            variant="warning"
            suffix="건"
            description="검토 및 승인 필요"
            highlight={stats.pendingOrders > 0}
          />
          <StatCard
            label="승인 완료"
            value={stats.approvedOrders}
            icon={<CheckCircle />}
            variant="success"
            suffix="건"
            description="생산 이관 완료"
          />
          <StatCard
            label="SRM 연동"
            value={stats.srmOrders}
            icon={<Building2 />}
            variant="default"
            suffix="건"
            description={`SAP 연동: ${stats.sapSyncedOrders}건`}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="주문번호, 발주사, 품목 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="predicted">SRM 연동</SelectItem>
                  <SelectItem value="confirmed">확정</SelectItem>
                  <SelectItem value="approved">승인 완료</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="발주사 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 발주사</SelectItem>
                  <SelectItem value="현대차">현대차</SelectItem>
                  <SelectItem value="삼성SDI">삼성SDI</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm ||
                filterStatus !== "all" ||
                filterCustomer !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterCustomer("all");
                  }}
                >
                  초기화
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>주문 승인 및 생산 이관</CardTitle>
                <CardDescription className="mt-1">
                  {filteredOrders.length}건의 주문{" "}
                  {selectedOrders.length > 0 &&
                    `(${selectedOrders.length}건 선택됨)`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSapSyncDialog(true)}
                  disabled={selectedOrders.length === 0}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Database className="w-4 h-4 mr-2" />
                  SAP 연동
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectOrders}
                  disabled={selectedOrders.length === 0}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  반려
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowApprovalDialog(true)}
                  disabled={selectedOrders.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  승인 및 생산 이관
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                데이터를 불러오는 중...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                {searchTerm ||
                filterStatus !== "all" ||
                filterCustomer !== "all"
                  ? "검색 조건에 맞는 주문이 없습니다."
                  : "승인 대기 중인 발주가 없습니다."}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedOrders.length === filteredOrders.length &&
                            filteredOrders.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded border-input"
                        />
                      </TableHead>
                      <TableHead>주문번호</TableHead>
                      <TableHead>발주월</TableHead>
                      <TableHead>발주사</TableHead>
                      <TableHead>품목</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                      <TableHead>배정 공장</TableHead>
                      <TableHead>SRM 연동</TableHead>
                      <TableHead>SAP 연동</TableHead>
                      <TableHead>승인 상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const productionLine =
                        order.product === "EV" ? "광주1공장" : "음성공장";
                      const quantity =
                        order.confirmedQuantity || order.predictedQuantity;

                      return (
                        <TableRow
                          key={order.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleSelectOrder(order.id)}
                              className="rounded border-input cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="font-medium font-mono text-sm">
                            {order.id}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {order.orderDate}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.customer === "현대차" ? "info" : "default"
                              }
                            >
                              {order.customer}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.product}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {quantity.toLocaleString()}
                            <span className="text-xs text-muted-foreground ml-1">
                              대
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                productionLine === "광주1공장"
                                  ? "warning"
                                  : "info"
                              }
                            >
                              {productionLine}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.srmOrderNumber ? (
                              <div className="space-y-1">
                                <Badge
                                  variant="outline"
                                  className="bg-green-50"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  SRM 연동
                                </Badge>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {order.srmOrderNumber}
                                </div>
                                {order.srmSyncBy && (
                                  <div className="text-xs text-muted-foreground">
                                    by {order.srmSyncBy}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary">수동 입력</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.sapSyncStatus === "synced" ? (
                              <div className="space-y-1">
                                <Badge
                                  variant="outline"
                                  className="bg-purple-50 text-purple-700 border-purple-300"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  SAP 연동
                                </Badge>
                                {order.sapSyncDate && (
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(
                                      order.sapSyncDate
                                    ).toLocaleDateString("ko-KR")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground"
                              >
                                미연동
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.status === "approved" ? (
                              <Badge className="bg-green-600">승인</Badge>
                            ) : (
                              <Badge variant="secondary">대기</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSapSyncDialog} onOpenChange={setShowSapSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SAP 시스템 연동</DialogTitle>
            <DialogDescription>
              선택한 {selectedOrders.length}건의 주문을 SAP 시스템에
              연동하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {selectedOrders.map((orderId) => {
                const order = orders.find((o) => o.id === orderId);
                if (!order) return null;

                return (
                  <div
                    key={orderId}
                    className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {order.customer} - {order.product}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-700">
                        {(
                          order.confirmedQuantity || order.predictedQuantity
                        ).toLocaleString()}
                        대
                      </span>
                      <Database className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSapSyncDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleSapSync}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Database className="w-4 h-4 mr-2" />
              SAP 연동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>발주 승인 및 생산 이관</DialogTitle>
            <DialogDescription>
              선택한 {selectedOrders.length}건의 발주를 승인하고 생산관리자에게
              이관하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {selectedOrders.map((orderId) => {
                const order = orders.find((o) => o.id === orderId);
                if (!order) return null;

                return (
                  <div
                    key={orderId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {order.customer} - {order.product}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {(
                          order.confirmedQuantity || order.predictedQuantity
                        ).toLocaleString()}
                        대
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Badge>
                        {order.product === "EV" ? "광주1공장" : "음성공장"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleApproveOrders}
              className="bg-green-600 hover:bg-green-700"
            >
              승인 및 이관
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
