"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/db";
import { Pencil, Check, X, CheckCircle2 } from "lucide-react";

interface OrderTableProps {
  orders: Order[];
  onUpdate: (id: string, data: Partial<Order>) => Promise<void>;
  editable?: boolean;
}

export function OrderTable({
  orders,
  onUpdate,
  editable = false,
}: OrderTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    predictedQuantity: number;
    confirmedQuantity: number;
  }>({
    predictedQuantity: 0,
    confirmedQuantity: 0,
  });

  const handleEdit = (order: Order) => {
    setEditingId(order.id);
    setEditValues({
      predictedQuantity: order.predictedQuantity,
      confirmedQuantity: order.confirmedQuantity,
    });
  };

  const handleSave = async (id: string) => {
    await onUpdate(id, {
      predictedQuantity: editValues.predictedQuantity,
      confirmedQuantity: editValues.confirmedQuantity,
      status: editValues.confirmedQuantity > 0 ? "confirmed" : "predicted",
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const getStatusBadge = (status: Order["status"]) => {
    const variants = {
      predicted: { label: "예측", variant: "secondary" as const },
      confirmed: { label: "확정", variant: "default" as const },
      approved: { label: "승인완료", variant: "default" as const },
    };

    const { label, variant } = variants[status];
    return (
      <Badge
        variant={variant}
        className={status === "approved" ? "bg-green-600" : ""}
      >
        {label}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>주문번호</TableHead>
            <TableHead>발주월</TableHead>
            <TableHead>발주사</TableHead>
            <TableHead>품목</TableHead>
            <TableHead>예측수량</TableHead>
            <TableHead>확정수량</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>SRM 연동</TableHead>
            {editable && <TableHead className="text-right">작업</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell>{order.orderDate}</TableCell>
              <TableCell>{order.customer}</TableCell>
              <TableCell>{order.product}</TableCell>
              <TableCell>
                {editingId === order.id ? (
                  <Input
                    type="number"
                    value={editValues.predictedQuantity}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        predictedQuantity: Number.parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-24"
                  />
                ) : (
                  order.predictedQuantity.toLocaleString()
                )}
              </TableCell>
              <TableCell>
                {editingId === order.id ? (
                  <Input
                    type="number"
                    value={editValues.confirmedQuantity}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        confirmedQuantity: Number.parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-24"
                  />
                ) : (
                  order.confirmedQuantity.toLocaleString()
                )}
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell>
                {order.srmOrderNumber ? (
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-green-50">
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
              {editable && (
                <TableCell className="text-right">
                  {editingId === order.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSave(order.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(order)}
                      disabled={order.status === "approved"}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
