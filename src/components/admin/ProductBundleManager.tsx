import React, { useMemo } from "react";
import { type Product, type BundleItemConfig } from "@/data/products.ts";
import { Plus, Trash2, Layers, Sparkles, Percent, DollarSign, PackagePlus, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils.ts";

interface ProductBundleManagerProps {
  bundleItems: BundleItemConfig[];
  availableProducts: Product[];
  currentProductId?: string;
  onUpdateBundleItems: (items: BundleItemConfig[]) => void;
}

export function ProductBundleManager({
  bundleItems,
  availableProducts,
  currentProductId,
  onUpdateBundleItems,
}: ProductBundleManagerProps) {
  // Filter out the current product itself to prevent circular self-bundling
  const selectableProducts = useMemo(() => {
    return availableProducts.filter((p) => p._id !== currentProductId && !p.isCombination);
  }, [availableProducts, currentProductId]);

  const handleAddItem = () => {
    if (selectableProducts.length === 0) return;
    // pick first selectable product not already in bundle if possible
    const alreadySelectedIds = new Set(bundleItems.map((b) => b.productId));
    const nextProduct = selectableProducts.find((p) => !alreadySelectedIds.has(p._id)) || selectableProducts[0];

    const newItem: BundleItemConfig = {
      productId: nextProduct._id,
      pricingType: "percentage_off",
      discountPercent: 15,
    };
    onUpdateBundleItems([...bundleItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = bundleItems.filter((_, i) => i !== index);
    onUpdateBundleItems(updated);
  };

  const handleChangeProduct = (index: number, newProdId: string) => {
    const updated = [...bundleItems];
    updated[index] = { ...updated[index], productId: newProdId };
    onUpdateBundleItems(updated);
  };

  const handleChangePricingType = (index: number, pricingType: "fixed" | "percentage_off") => {
    const updated = [...bundleItems];
    const targetProd = availableProducts.find((p) => p._id === updated[index].productId);
    const basePrice = targetProd?.salePrice ?? targetProd?.price ?? 50;

    if (pricingType === "fixed") {
      updated[index] = {
        ...updated[index],
        pricingType: "fixed",
        customPrice: Math.round(basePrice * 0.85 * 100) / 100,
        discountPercent: undefined,
      };
    } else {
      updated[index] = {
        ...updated[index],
        pricingType: "percentage_off",
        discountPercent: 15,
        customPrice: undefined,
      };
    }
    onUpdateBundleItems(updated);
  };

  const handleChangePriceValue = (index: number, val: number) => {
    const updated = [...bundleItems];
    if (updated[index].pricingType === "fixed") {
      updated[index] = { ...updated[index], customPrice: Math.max(0, val) };
    } else {
      updated[index] = { ...updated[index], discountPercent: Math.min(100, Math.max(0, val)) };
    }
    onUpdateBundleItems(updated);
  };

  // Calculations for all items in the combination
  const summary = useMemo(() => {
    let originalTotal = 0;
    let combinationTotal = 0;

    bundleItems.forEach((b) => {
      const prod = availableProducts.find((p) => p._id === b.productId);
      if (!prod) return;
      const basePrice = prod.salePrice ?? prod.price;
      originalTotal += basePrice;

      if (b.pricingType === "fixed") {
        combinationTotal += typeof b.customPrice === "number" ? b.customPrice : basePrice;
      } else {
        const pct = b.discountPercent ?? 0;
        combinationTotal += basePrice * (1 - pct / 100);
      }
    });

    const totalSavings = Math.max(0, originalTotal - combinationTotal);
    const savingsPercent = originalTotal > 0 ? Math.round((totalSavings / originalTotal) * 100) : 0;

    return {
      originalTotal,
      combinationTotal: Math.round(combinationTotal * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      savingsPercent,
    };
  }, [bundleItems, availableProducts]);

  return (
    <div className="space-y-3 bg-neutral-50/80 border border-neutral-200/90 rounded-2xl p-3.5 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/70 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center">
            <Layers size={13} />
          </div>
          <div>
            <h4
              className="text-xs font-semibold uppercase text-black tracking-tight"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              Promotional Bundle Products ({bundleItems.length} items)
            </h4>
            <p className="text-[11px] text-neutral-500 font-normal">
              Configure each combined product and customize individual promotional pricing.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-1 bg-black text-white px-2.5 py-1 rounded-lg text-xs hover:bg-neutral-800 cursor-pointer font-normal shadow-2xs"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          <Plus size={12} /> Add Combined Product
        </button>
      </div>

      {bundleItems.length === 0 ? (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-center space-y-1">
          <p className="text-xs text-amber-800 font-medium flex items-center justify-center gap-1.5">
            <AlertCircle size={14} /> No products added to this promotional combination yet.
          </p>
          <p className="text-[11px] text-amber-700 font-normal">
            Click "Add Combined Product" above to select products from your catalog.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {bundleItems.map((item, index) => {
            const prod = availableProducts.find((p) => p._id === item.productId);
            const originalPrice = prod ? prod.salePrice ?? prod.price : 0;
            const calculatedItemPrice =
              item.pricingType === "fixed"
                ? (item.customPrice ?? originalPrice)
                : originalPrice * (1 - (item.discountPercent ?? 0) / 100);

            return (
              <div
                key={index}
                className="bg-white border border-neutral-200 rounded-xl p-3 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-mono flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>

                    {/* Product Selection */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.productId}
                        onChange={(e) => handleChangeProduct(index, e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-black font-medium"
                      >
                        {selectableProducts.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({formatCurrency(p.salePrice ?? p.price)}) • {p.stock} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-neutral-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg cursor-pointer transition-colors shrink-0"
                    title="Remove from bundle"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Pricing Type Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-neutral-100">
                  {/* Pricing Switcher */}
                  <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80">
                    <button
                      type="button"
                      onClick={() => handleChangePricingType(index, "percentage_off")}
                      className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        item.pricingType === "percentage_off"
                          ? "bg-white text-black shadow-2xs"
                          : "text-neutral-500 hover:text-black"
                      }`}
                    >
                      <Percent size={11} /> Percentage Off
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangePricingType(index, "fixed")}
                      className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        item.pricingType === "fixed"
                          ? "bg-white text-black shadow-2xs"
                          : "text-neutral-500 hover:text-black"
                      }`}
                    >
                      <DollarSign size={11} /> Fixed Price
                    </button>
                  </div>

                  {/* Input value and computed price */}
                  <div className="flex items-center gap-2">
                    {item.pricingType === "percentage_off" ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent ?? 15}
                          onChange={(e) => handleChangePriceValue(index, Number(e.target.value))}
                          className="w-20 bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 text-xs outline-none focus:border-black font-mono text-right"
                        />
                        <span className="text-xs text-neutral-500 font-mono">% off</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.customPrice ?? originalPrice}
                          onChange={(e) => handleChangePriceValue(index, Number(e.target.value))}
                          className="w-24 bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 text-xs outline-none focus:border-black font-mono text-right"
                        />
                        <span className="text-xs text-neutral-500 font-mono">fixed price</span>
                      </div>
                    )}

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-neutral-900 font-mono">
                        {formatCurrency(calculatedItemPrice)}
                      </div>
                      <div className="text-[10px] text-neutral-400 line-through font-mono">
                        orig. {formatCurrency(originalPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-Calculated Bundle Summary Banner */}
      <div className="bg-neutral-900 text-white rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-neutral-300 font-medium">
            <Sparkles size={13} className="text-amber-400" />
            <span>Automatic Combination Price</span>
          </div>
          <span className="text-emerald-400 font-mono text-xs font-bold">
            {summary.savingsPercent > 0 ? `SAVE ${summary.savingsPercent}% (${formatCurrency(summary.totalSavings)})` : "Bundle Configured"}
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1 border-t border-neutral-800">
          <div>
            <div className="text-[10px] text-neutral-400 uppercase font-mono">Calculated Selling Price</div>
            <div className="text-lg font-bold text-white font-mono">
              {formatCurrency(summary.combinationTotal)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-neutral-400 uppercase font-mono">Original Combined Value</div>
            <div className="text-xs text-neutral-400 line-through font-mono">
              {formatCurrency(summary.originalTotal)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
