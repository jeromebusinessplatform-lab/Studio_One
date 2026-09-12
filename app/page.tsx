'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Sparkles,
  Lock,
  Tag,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { Product, PrimeUser } from '../lib/types';
import { useCart, calculateItemDiscount } from './components/cart-context';
import { collectDeviceFingerprint } from '../lib/fingerprint';

const CATEGORIES = ['All', 'Apparel', 'Hardware', 'EDC Gear', 'Nutrition'];

export default function ShopfrontPage() {
  const {
    items: cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalCount,
    subtotal,
    bundleSavings,
    grandTotal,
    isOpen: isCartOpen,
    setIsOpen: setIsCartOpen,
  } = useCart();

  // Environment & Telegram auth states
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const [primeUser, setPrimeUser] = useState<PrimeUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Shop state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Detect Telegram & Authenticate with HMAC + Fingerprint
  useEffect(() => {
    async function initTelegramAuth(simulated = false) {
      setAuthLoading(true);
      const isTg =
        typeof window !== 'undefined' &&
        Boolean(
          (window as any).Telegram?.WebApp?.initData ||
          (window as any).TelegramWebviewProxy ||
          navigator.userAgent.includes('Telegram') ||
          simulated
        );

      setIsTelegram(isTg);

      if (!isTg && !simulated) {
        setAuthLoading(false);
        return;
      }

      // Collect background fraud detection fingerprint
      let fingerprintData = null;
      try {
        fingerprintData = await collectDeviceFingerprint();
      } catch (err) {
        console.warn('Fingerprint collection note:', err);
      }

      const tgWebApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
      const initData = tgWebApp?.initData || '';

      const simulatedUser = {
        id: 884729103,
        first_name: 'Devin',
        last_name: 'Vance',
        username: 'dvance_prime',
        phone: '+1 (555) 019-2834',
        groups: ['grp_alpha_recon', 'grp_prime_vip'],
        channels: ['chn_prime_drops'],
      };

      try {
        const res = await fetch('/api/auth/telegram/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            fingerprint: fingerprintData,
            simulatedUser: !initData ? simulatedUser : undefined,
          }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setPrimeUser(data.user);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('prime_session_token', data.sessionToken);
          }
        }
      } catch (err) {
        console.error('Authentication error:', err);
      } finally {
        setAuthLoading(false);
      }
    }

    initTelegramAuth();
  }, []);

  // 2. Fetch product catalog
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.products) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle Add To Cart
  const handleQuickAdd = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.stock <= 0) return;
    const added = addToCart(p, 1);
    if (added) {
      showToast(`Added ${p.name} to cart`);
    } else {
      showToast(`Cannot add more than available stock (${p.stock})`);
    }
  };

  const handleDetailAdd = () => {
    if (!activeProduct || activeProduct.stock <= 0) return;
    const added = addToCart(activeProduct, detailQuantity);
    if (added) {
      showToast(`Added ${detailQuantity}x ${activeProduct.name}`);
      setActiveProduct(null);
    } else {
      showToast(`Exceeds available stock (${activeProduct.stock})`);
    }
  };

  // Handle Checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ id: i.id, quantity: i.quantity })),
          primeMemberId: primeUser?.primeMemberId || 'PRM-GUEST',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderComplete(data.orderId);
        clearCart();
        // Refresh product stocks
        const refreshed = await fetch('/api/products');
        const refreshedData = await refreshed.json();
        if (refreshedData.products) setProducts(refreshedData.products);
      } else {
        showToast('Checkout failed. Please try again.');
      }
    } catch {
      showToast('Network error during checkout');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Telegram Access Gatekeeper view when outside Telegram
  if (isTelegram === false) {
    return (
      <main id="prime-gatekeeper" className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#07090c] text-neutral-200">
        <div className="w-full max-w-md bg-[#10141b] border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block text-xs uppercase tracking-widest text-amber-400 font-semibold px-2.5 py-1 bg-amber-950/40 border border-amber-800/40 rounded-full mb-3">
              Protected Environment
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white font-['Oswald']">
              PRIME COMMERCE
            </h1>
            <p className="text-sm text-neutral-400 mt-2 font-['Montserrat'] leading-relaxed">
              Exclusively accessible within the Telegram ecosystem. Browser direct-entry is restricted to verified cryptotoken sessions.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href="tg://resolve?domain=PrimeShopBot&appname=store"
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors font-['Oswald'] tracking-wide"
            >
              <Smartphone className="w-4 h-4" />
              OPEN IN TELEGRAM
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>

            {/* Test simulator button for AI Studio preview */}
            <button
              onClick={() => {
                setIsTelegram(true);
                // Trigger simulated authentication
                fetch('/api/auth/telegram/validate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    simulatedUser: {
                      id: 884729103,
                      first_name: 'Alex',
                      last_name: 'Vance',
                      username: 'avance_prime',
                      phone: '+1 (555) 019-2834',
                    },
                  }),
                })
                  .then((r) => r.json())
                  .then((d) => d.user && setPrimeUser(d.user));
              }}
              className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors font-['Montserrat']"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Launch Simulated Telegram Session
            </button>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-['Montserrat']">
            <span>HMAC-SHA256 Encrypted</span>
            <Link href="/admin" className="hover:text-amber-400 flex items-center gap-1 transition-colors">
              <Settings className="w-3 h-3" />
              Admin Portal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b0f] text-neutral-100 flex flex-col font-['Montserrat']">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in font-['Montserrat']">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#090b0f]/95 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-black font-['Oswald'] text-lg">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold tracking-wider text-white font-['Oswald'] leading-none">
                  PRIME
                </h1>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  PRO
                </span>
              </div>
              {primeUser ? (
                <div className="text-[10px] text-neutral-400 font-mono tracking-tight flex items-center gap-1">
                  <span className="text-neutral-500">ID:</span>
                  <span className="text-amber-300 font-semibold">{primeUser.primeMemberId}</span>
                </div>
              ) : (
                <div className="text-[10px] text-neutral-500 font-mono">
                  {authLoading ? 'Verifying...' : 'Secure Node'}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="prime-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl text-neutral-200 transition-colors"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              {totalCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {totalCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Mobile-First Max-Width Constraint */}
      <main className="flex-1 w-full max-w-md mx-auto px-3.5 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="prime-search-input"
            type="text"
            placeholder="Search tactical gear, hardware..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12161f] border border-neutral-800 text-xs rounded-xl pl-9 pr-4 py-2.5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-black font-semibold shadow-sm'
                    : 'bg-neutral-900/90 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* 'Buy More, Save More' Incentive Notice */}
        <div className="bg-gradient-to-r from-amber-950/40 via-neutral-900/60 to-neutral-900/40 border border-amber-900/40 rounded-xl p-3 flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-amber-300 font-['Oswald'] tracking-wide uppercase">
              Bundle Discounts Active
            </span>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Buy 2+ items to unlock automatic tiered savings at checkout.
            </p>
          </div>
        </div>

        {/* Mobile-First 3-Column Product Grid */}
        <section aria-label="Products">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="text-xs uppercase tracking-widest text-neutral-400 font-semibold font-['Oswald']">
              Featured Inventory ({filteredProducts.length})
            </h2>
            <span className="text-[11px] text-amber-400/80 font-mono">Live Sync</span>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-3 gap-2 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-neutral-900/70 rounded-xl aspect-[3/4] border border-neutral-800/50" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-neutral-500" />
              <p className="text-xs text-neutral-400">No products found matching &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="text-xs text-amber-400 underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= 5;
                const hasBundle = Boolean(p.bundleConfig);

                return (
                  <div
                    key={p.id}
                    id={`product-card-${p.id}`}
                    onClick={() => {
                      setActiveProduct(p);
                      setDetailQuantity(1);
                    }}
                    className={`group relative bg-[#11141c] hover:bg-[#151923] border border-neutral-800/80 hover:border-amber-500/50 rounded-xl p-2 flex flex-col justify-between cursor-pointer transition-all ${
                      isOutOfStock ? 'opacity-70' : ''
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      {isOutOfStock ? (
                        <span className="bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          OUT
                        </span>
                      ) : isLowStock ? (
                        <span className="bg-amber-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          {p.stock} LEFT
                        </span>
                      ) : null}
                    </div>

                    {/* Image */}
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-900 mb-2">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 33vw, 150px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}

                      {/* Bundle Tag Indicator */}
                      {hasBundle && !isOutOfStock && (
                        <div className="absolute bottom-1 right-1 bg-amber-500/90 text-black text-[8px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Sparkles className="w-2 h-2" />
                          BUNDLE
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-[11px] font-bold text-neutral-100 line-clamp-2 leading-tight font-['Oswald'] tracking-tight">
                          {p.name}
                        </h3>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{p.category}</p>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-neutral-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          ${p.price}
                        </span>

                        <button
                          onClick={(e) => handleQuickAdd(p, e)}
                          disabled={isOutOfStock}
                          aria-label={`Add ${p.name}`}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            isOutOfStock
                              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-sm'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Interactive Product Detail Drawer / Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-[#10141b] border-t border-neutral-700 rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4 animate-slide-up font-['Montserrat']">
            {/* Header / Close */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 font-['Oswald']">
                {activeProduct.category}
              </span>
              <button
                onClick={() => setActiveProduct(null)}
                className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Image */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
              {activeProduct.imageUrl ? (
                <Image
                  src={activeProduct.imageUrl}
                  alt={activeProduct.name}
                  fill
                  className="object-cover"
                />
              ) : null}
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-mono font-bold text-amber-400 border border-neutral-700">
                ${activeProduct.price}
              </div>
            </div>

            {/* Title & Stock */}
            <div>
              <h2 className="text-xl font-bold text-white font-['Oswald']">
                {activeProduct.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {activeProduct.stock > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> In Stock ({activeProduct.stock} units available)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-red-400 bg-red-950/40 border border-red-800/50 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-neutral-300 leading-relaxed">
              {activeProduct.description}
            </p>

            {/* 'Buy More, Save More' Bundle Config Breakdown */}
            {activeProduct.bundleConfig && (
              <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold font-['Oswald'] uppercase tracking-wider">
                    Buy More, Save More
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {activeProduct.bundleConfig.tieredDiscounts?.map((tier, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-center ${
                        detailQuantity >= tier.quantity
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <div>Qty {tier.quantity}+</div>
                      <div className="text-xs font-bold text-amber-400">{tier.discountPercent}% OFF</div>
                    </div>
                  )) || (
                    <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded-lg text-center col-span-2 text-neutral-300">
                      Buy {activeProduct.bundleConfig.bundleSize}+ units and get{' '}
                      <strong className="text-amber-400">{activeProduct.bundleConfig.discountPercent}% OFF</strong>!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Stepper & Add Action */}
            {activeProduct.stock > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800 rounded-xl p-2 px-3">
                  <span className="text-xs text-neutral-400 font-medium">Select Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                      disabled={detailQuantity <= 1}
                      className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center hover:bg-neutral-700 disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold font-mono text-white w-6 text-center">
                      {detailQuantity}
                    </span>
                    <button
                      onClick={() => setDetailQuantity(Math.min(activeProduct.stock, detailQuantity + 1))}
                      disabled={detailQuantity >= activeProduct.stock}
                      className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center hover:bg-neutral-700 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  id="detail-add-btn"
                  onClick={handleDetailAdd}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl font-['Oswald'] tracking-wide flex items-center justify-center gap-2 shadow-lg transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  ADD TO CART • $
                  {Math.max(
                    0,
                    activeProduct.price * detailQuantity -
                      calculateItemDiscount(activeProduct, detailQuantity)
                  ).toFixed(2)}
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full py-3.5 bg-neutral-800 text-neutral-500 font-bold rounded-xl font-['Oswald'] tracking-wide cursor-not-allowed"
              >
                PRODUCT CURRENTLY UNAVAILABLE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-[#10141b] border-t border-neutral-700 rounded-t-3xl p-5 max-h-[90vh] flex flex-col space-y-4 animate-slide-up font-['Montserrat']">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white font-['Oswald'] tracking-wide">
                  PRIME CART ({totalCount})
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh]">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-neutral-600" />
                  <p className="text-xs text-neutral-400">Your shopping cart is currently empty</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs text-amber-400 font-semibold"
                  >
                    Browse products
                  </button>
                </div>
              ) : (
                cartItems.map((item) => {
                  const discount = calculateItemDiscount(item.product, item.quantity);
                  const itemTotal = item.product.price * item.quantity - discount;

                  return (
                    <div
                      key={item.id}
                      className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex gap-3 items-center justify-between"
                    >
                      <div className="relative w-12 h-12 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                        {item.product.imageUrl && (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white font-['Oswald'] truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          ${item.product.price} each
                        </div>

                        {discount > 0 && (
                          <span className="inline-block text-[9px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded font-semibold mt-0.5">
                            Saved ${discount.toFixed(2)} with bundle
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700/80 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-neutral-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold w-4 text-center text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-5 h-5 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right min-w-[50px]">
                          <div className="text-xs font-bold text-amber-400 font-mono">
                            ${itemTotal.toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-[10px] text-neutral-500 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Summary & Checkout */}
            {cartItems.length > 0 && (
              <div className="pt-3 border-t border-neutral-800 space-y-2.5">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  {bundleSavings > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Bundle Savings</span>
                      <span className="font-mono">-${bundleSavings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-neutral-800">
                    <span>Total Due</span>
                    <span className="text-amber-400 font-mono">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  id="prime-checkout-btn"
                  onClick={handleCheckout}
                  disabled={isSubmittingOrder}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl font-['Oswald'] tracking-wide flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
                >
                  {isSubmittingOrder ? (
                    <span>LOCKING INVENTORY...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      COMPLETE ORDER • ${grandTotal.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderComplete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#121620] border border-amber-500/40 rounded-2xl p-6 text-center space-y-4 font-['Montserrat'] shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white font-['Oswald']">
                ORDER CONFIRMED
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Your inventory allocation has been secured in the vault.
              </p>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-xs space-y-1 text-left font-mono">
              <div className="flex justify-between text-neutral-400">
                <span>Ref:</span>
                <span className="text-amber-400 font-bold">{orderComplete}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Member:</span>
                <span className="text-white">{primeUser?.primeMemberId || 'PRM-GUEST'}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Dispatch:</span>
                <span className="text-emerald-400 font-semibold">Priority Telegram Route</span>
              </div>
            </div>

            <button
              onClick={() => {
                setOrderComplete(null);
                setIsCartOpen(false);
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl font-['Oswald'] tracking-wide transition-colors"
            >
              CONTINUE BROWSING
            </button>
          </div>
        </div>
      )}

      {/* Compact Footer */}
      <footer className="w-full max-w-md mx-auto px-4 py-3 border-t border-neutral-800/80 text-[11px] text-neutral-500 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>PRIME Engine v2.6</span>
        </div>
        <Link href="/admin" className="hover:text-amber-400 flex items-center gap-1 transition-colors">
          <Settings className="w-3 h-3" />
          <span>Portal Access</span>
        </Link>
      </footer>
    </div>
  );
}
