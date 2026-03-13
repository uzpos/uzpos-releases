"use client";

import { usePosStore } from "@/store/posStore";
import { TableGrid } from "@/components/pos/TableGrid";
import { OrderScreen } from "@/components/pos/OrderScreen";
import { Navbar } from "@/components/Navbar";

export default function PosPage() {
  const { selectedTableId } = usePosStore();

  return (
    <div className="min-h-screen bg-black/95 flex flex-col overflow-hidden">
      {!selectedTableId ? (
        <>
          <Navbar />
          <div className="flex-1 overflow-auto">
            <TableGrid />
          </div>
        </>
      ) : (
        <OrderScreen />
      )}
    </div>
  );
}
