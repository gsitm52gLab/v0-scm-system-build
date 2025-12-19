"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

export default function UrgentOrderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    customer: "",
    product: "",
    category: "EV" as "EV" | "SV" | "ESS" | "PLBM",
    quantity: "",
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",
    specialNotes: "",
  });

  // 세방산업 직원 또는 관리자만 접근 가능
  if (!user || (user.company !== "세방산업" && user.role !== "관리자")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Alert className="max-w-md" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            이 페이지는 세방산업 직원 또는 관리자만 접근할 수 있습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.customer ||
      !formData.product ||
      !formData.quantity ||
      !formData.deliveryDate
    ) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const quantity = Number.parseInt(formData.quantity);
      const unitPrice = formData.category === "EV" ? 50000000 : 40000000;

      const newOrder = {
        id: `ORD-URGENT-${Date.now()}`,
        orderDate: formData.orderDate,
        customer: formData.customer,
        product: formData.product,
        category: formData.category,
        destination: formData.customer === "현대차" ? "울산공장" : "천안공장",
        predictedQuantity: quantity,
        confirmedQuantity: quantity,
        unitPrice: unitPrice,
        totalAmount: quantity * unitPrice,
        status: "confirmed",
        leadTimeDays: 30,
        expectedDeliveryDate: formData.deliveryDate,
        specialNotes: `[긴급주문] ${formData.specialNotes}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "긴급 주문 등록 완료",
          description: `${formData.customer} - ${formData.product} ${quantity}대가 등록되었습니다.`,
        });

        // 폼 초기화
        setFormData({
          customer: "",
          product: "",
          category: "EV",
          quantity: "",
          orderDate: new Date().toISOString().split("T")[0],
          deliveryDate: "",
          specialNotes: "",
        });

        // 판매 계획 페이지로 이동
        setTimeout(() => {
          router.push("/sales");
        }, 1500);
      }
    } catch (error) {
      console.error("[v0] Failed to create urgent order:", error);
      toast({
        title: "오류",
        description: "긴급 주문 등록에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">긴급 주문 등록</h1>
          <p className="text-muted-foreground mt-1">
            고객사로부터 받은 긴급 주문을 직접 입력합니다
          </p>
        </div>

        <Alert className="mb-6 border-orange-500 bg-orange-50">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>긴급 주문 안내:</strong> 이 페이지는 고객사로부터 전화, 이메일
            등으로 받은 긴급 주문을 신속하게 시스템에 등록하기 위한 페이지입니다.
            등록된 주문은 즉시 판매 계획에 반영됩니다.
          </AlertDescription>
        </Alert>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>주문 정보 입력</CardTitle>
            <CardDescription>
              긴급 주문 정보를 정확히 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">
                    발주사 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.customer}
                    onValueChange={(value) => handleChange("customer", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="발주사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="현대차">현대차</SelectItem>
                      <SelectItem value="삼성SDI">삼성SDI</SelectItem>
                      <SelectItem value="일본거래처">일본거래처</SelectItem>
                      <SelectItem value="유럽거래처">유럽거래처</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    제품 카테고리 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleChange("category", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EV">EV (전기차)</SelectItem>
                      <SelectItem value="SV">SV (SUV)</SelectItem>
                      <SelectItem value="ESS">ESS (에너지저장)</SelectItem>
                      <SelectItem value="PLBM">PLBM (배터리모듈)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">
                  제품명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="product"
                  placeholder="예: EV-2024-001"
                  value={formData.product}
                  onChange={(e) => handleChange("product", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    수량 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="수량 입력"
                    value={formData.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderDate">
                    주문일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => handleChange("orderDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">
                  납품 희망일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    handleChange("deliveryDate", e.target.value)
                  }
                  min={formData.orderDate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialNotes">특이사항</Label>
                <Input
                  id="specialNotes"
                  placeholder="긴급 주문 사유 및 특이사항 입력"
                  value={formData.specialNotes}
                  onChange={(e) =>
                    handleChange("specialNotes", e.target.value)
                  }
                />
              </div>

              {formData.quantity && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">주문 요약</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">발주사:</span>{" "}
                      <span className="font-medium">{formData.customer}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">제품:</span>{" "}
                      <span className="font-medium">{formData.product}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">수량:</span>{" "}
                      <span className="font-medium">
                        {Number.parseInt(formData.quantity || "0").toLocaleString()}대
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">예상 금액:</span>{" "}
                      <span className="font-medium text-lg">
                        {(
                          Number.parseInt(formData.quantity || "0") *
                          (formData.category === "EV" ? 50000000 : 40000000)
                        ).toLocaleString()}
                        원
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/sales")}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  긴급 주문 등록
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  );
}

