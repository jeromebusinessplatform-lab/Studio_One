import React from "react";
import { type Product, type BundleItemConfig } from "@/data/products.ts";
import {
  X,
  Sparkles,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Percent,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Edit2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils.ts";

interface BundleViewModalProps {
  bundleProduct: Product | null;
  allProducts: Product[];
  onClose: () => void;
  onEditProduct?: (product: Product) => void;
}

export function BundleViewModal({
  bundleProduct,
  allProducts,
  onClose,
  onEditProduct,
}: BundleViewModalProps) {
  if (!bundleProduct) return null;

  const bundleItems: BundleItemConfig[] = bundleProduct.bundleItems || [];
  const currentPrice = bundleProduct.salePrice ?? bundleProduct.price;

  // Compute live breakdown
  let originalCombinedTotal = 0;
  let computedCombinationTotal = 0;

  const itemBreakdowns = bundleItems.map((item) => {
    const matchedProduct = allProducts.find((p) => p._id === item.productId);
    const regularPrice = matchedProduct ? matchedProduct.salePrice ?? matchedProduct.price : 0;
    originalCombinedTotal += regularPrice;

    let effectivePrice = regularPrice;
    if (item.pricingType === "fixed" && typeof item.customPrice === "number") {
      effectivePrice = item.customPrice;
    } else if (item.pricingType === "percentage_off" && typeof item.discountPercent === "number") {
      effectivePrice = regularPrice * (1 - item.discountPercent / 100);
    }
    computedCombinationTotal += effectivePrice;

    const isChildOutOfStock = matchedProduct ? matchedProduct.stock <= 0 || matchedProduct.available === false : false;

    return {
      config: item,
      product: matchedProduct,
      regularPrice,
      effectivePrice: Math.round(effectivePrice * 100) / 100,
      isOutOfStock: isChildOutOfStock,
    };
  });

  const totalSavings = Math.max(0, originalCombinedTotal - currentPrice);
  const savingsPercent =
    originalCombinedTotal > 0 ? Math.round((totalSavings / originalCombinedTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-300 overflow-hidden font-condensed animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-neutral-900 text-white border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Bundle Composition
                </span>
                <span className="bg-amber-500 text-neutral-950 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                  {bundleItems.length} Products
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {bundleProduct.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 font-sans text-xs">
          {/* Bundle Summary Banner */}
          <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200 flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-white border border-neutral-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
              {bundleProduct.image ? (
                <img
                  src={bundleProduct.image}
                  alt={bundleProduct.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ShoppingBag size={24} className="text-neutral-300" />
              )}
            </div>

            <div className="flex-1 min-w-0 font-condensed">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-neutral-900 uppercase">
                  {bundleProduct.name}
                </span>
                <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold uppercase">
                  BUNDLED
                </span>
              </div>
              {bundleProduct.subname && (
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">{bundleProduct.subname}</p>
              )}

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base font-bold text-black font-mono">
                  {formatCurrency(currentPrice)}
                </span>
                {originalCombinedTotal > currentPrice && (
                  <span className="text-xs text-neutral-400 line-through font-mono">
                    {formatCurrency(originalCombinedTotal)}
                  </span>
                )}
                {savingsPercent > 0 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                    SAVE {savingsPercent}% ({formatCurrency(totalSavings)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Child Items Breakdown */}
          <div className="space-y-2 font-condensed">
            <div className="flex items-center justify-between text-neutral-700">
              <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                <Layers size={13} className="text-amber-600" />
                Included Child Products ({bundleItems.length})
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Live Inventory Tracked
              </span>
            </div>

            {bundleItems.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center text-amber-800 text-xs">
                No child products configured in this bundle.
              </div>
            ) : (
              <div className="space-y-2">
                {itemBreakdowns.map((item, idx) => {
                  const prod = item.product;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-neutral-200 p-2.5 flex items-center justify-between gap-3 shadow-2xs hover:border-neutral-300 transition"
                    >
                      {/* Product identity */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                          {prod?.image ? (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Package size={16} className="text-neutral-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-xs text-neutral-900 truncate">
                            {prod?.name ?? "Catalog Item"}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>Orig: {formatCurrency(item.regularPrice)}</span>
                            <span>•</span>
                            <span
                              className={
                                item.isOutOfStock
                                  ? "text-red-600 font-semibold"
                                  : "text-emerald-700 font-semibold"
                              }
                            >
                              {prod ? (item.isOutOfStock ? "Out of stock" : `${prod.stock} in stock`) : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing calculation rule */}
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-xs font-bold text-neutral-900">
                          {formatCurrency(item.effectivePrice)}
                        </div>
                        <div className="text-[10px] text-amber-700 font-semibold">
                          {item.config.pricingType === "percentage_off"
                            ? `${item.config.discountPercent}% Off`
                            : "Custom Price"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing Math Overview Box */}
          <div className="bg-neutral-900 text-white rounded-xl p-3 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-neutral-400 text-[11px]">
              <span>Individual Items Sum:</span>
              <span>{formatCurrency(originalCombinedTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 text-[11px]">
              <span>Bundle Discount:</span>
              <span className="text-emerald-400 font-bold">-{formatCurrency(totalSavings)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800 text-white font-bold text-sm font-condensed">
              <span className="uppercase">Final Bundle Retail Price:</span>
              <span className="font-mono text-base text-amber-400">{formatCurrency(currentPrice)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-2 shrink-0">
          {onEditProduct ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditProduct(bundleProduct);
              }}
              className="min-h-[44px] px-4 bg-white border border-neutral-300 hover:border-black text-neutral-900 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Edit2 size={13} /> Edit Bundle in Catalog
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase transition cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
