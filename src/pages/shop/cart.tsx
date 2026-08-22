import { useCart } from "@/context/CartContext.tsx";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, CheckSquare, Square, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils.ts";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    totalItems,
    toggleSelect,
    selectAll,
    deselectAll,
    selectedItems,
    selectedCount,
    selectedSubtotal,
  } = useCart();
  const navigate = useNavigate();

  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const noneSelected = selectedItems.length === 0;

  const handleToggleAll = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  const handleProceedCheckout = () => {
    if (noneSelected) return;
    navigate("/shop/checkout");
  };

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-10">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1
            className="text-black font-normal uppercase text-xl leading-tight"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            SHOPPING CART
          </h1>
          <p className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            {selectedCount} of {totalItems} items selected for checkout
          </p>
        </div>
        <Link
          to="/shop"
          className="text-xs font-normal text-black border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          Add Items
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center py-20 bg-white m-3 rounded-2xl border border-neutral-200 shadow-xs">
          <ShoppingBag size={48} className="mx-auto mb-3 text-neutral-300" />
          <h2
            className="text-lg font-normal text-neutral-800"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            Your cart is empty
          </h2>
          <p className="text-xs text-neutral-500 mt-1 mb-5 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            Explore our catalog to add items to your cart.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-normal text-xs uppercase tracking-wide hover:bg-neutral-800 transition-colors"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            Browse Products <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {/* Master Select Bar */}
          <div className="bg-white rounded-xl border border-neutral-200/90 px-3.5 py-2.5 shadow-2xs flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-2 text-xs font-medium text-neutral-800 hover:text-black cursor-pointer select-none"
              style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "13px" }}
            >
              {allSelected ? (
                <CheckSquare size={16} className="text-black" />
              ) : (
                <Square size={16} className="text-neutral-400" />
              )}
              <span>{allSelected ? "Deselect All Items" : `Select All (${items.length} items)`}</span>
            </button>

            <span
              className="text-xs text-neutral-500 font-mono"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              {selectedItems.length} product{selectedItems.length === 1 ? "" : "s"} selected
            </span>
          </div>

          {/* Cart items list with individual checkout checkboxes */}
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-3 shadow-xs space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className={`flex items-center gap-3 border-b border-neutral-100 pb-3 last:border-0 last:pb-0 transition-opacity ${
                  item.selected ? "opacity-100" : "opacity-60 bg-neutral-50/50 -mx-1 px-1 rounded-lg"
                }`}
              >
                {/* Item Select Checkbox */}
                <input
                  type="checkbox"
                  id={`cart-item-${item.productId}`}
                  checked={item.selected}
                  onChange={() => toggleSelect(item.productId)}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer accent-black shrink-0"
                  aria-label={`Select ${item.productName} for checkout`}
                />

                {/* Image */}
                <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-100 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ShoppingBag size={20} className="text-neutral-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3
                      className="font-normal text-neutral-900 text-sm truncate"
                      style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                    >
                      {item.productName}
                    </h3>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-neutral-300 hover:text-red-500 p-0.5 cursor-pointer transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div
                    className="text-xs text-black font-normal mt-0.5"
                    style={{ fontFamily: "'Ubuntu', sans-serif" }}
                  >
                    {formatCurrency(item.unitPrice)} each
                  </div>

                  {/* Quantity Stepper & Subtotal preview */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="h-6 border border-neutral-200 rounded-md flex items-center bg-neutral-50 overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="px-2 h-full text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={10} className="stroke-[2.5]" />
                      </button>
                      <span
                        className="px-2 text-xs font-normal text-black font-mono"
                        style={{ fontFamily: "'Ubuntu', sans-serif" }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="px-2 h-full text-neutral-600 hover:bg-neutral-200 active:bg-neutral-300 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus size={10} className="stroke-[2.5]" />
                      </button>
                    </div>

                    <div
                      className="text-xs font-semibold text-neutral-900 font-mono"
                      style={{ fontFamily: "'Ubuntu', sans-serif" }}
                    >
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing summary - ONLY Subtotal displayed as requested */}
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs space-y-2">
            <div className="flex justify-between items-baseline">
              <span
                className="text-sm font-normal text-neutral-700 uppercase"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                Cart Subtotal ({selectedCount} item{selectedCount === 1 ? "" : "s"} selected)
              </span>
              <span
                className="text-xl font-bold text-black font-mono"
                style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "20px" }}
              >
                {formatCurrency(selectedSubtotal)}
              </span>
            </div>

            {items.some((i) => !i.selected) && (
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                <Info size={12} className="text-neutral-400 shrink-0" />
                <span>Unselected items will remain in your cart for later purchase.</span>
              </div>
            )}
          </div>

          {noneSelected ? (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-center text-xs text-amber-800 font-medium">
              Please select at least 1 item to proceed to checkout
            </div>
          ) : null}

          <button
            onClick={handleProceedCheckout}
            disabled={noneSelected}
            className="w-full bg-black hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-normal py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
            style={{
              fontFamily: "'Ubuntu', sans-serif",
              fontSize: "15px",
              letterSpacing: "0.5px",
            }}
          >
            PROCEED TO CHECKOUT ({selectedCount} ITEMS • {formatCurrency(selectedSubtotal)}) <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

