'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  Package,
  Users,
  Sliders,
  Plus,
  ArrowLeft,
  Check,
  AlertCircle,
  Smartphone,
  ShieldAlert,
  Save,
} from 'lucide-react';
import { Product } from '../../lib/types';

export default function AdminPage() {
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'config' | 'customers'>('inventory');

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});

  // Customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Product Configurator state
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    id: '',
    name: '',
    price: 50,
    category: 'Apparel',
    description: '',
    imageUrl: '',
    stock: 20,
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 15,
    },
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Check saved access code on load
  useEffect(() => {
    const saved = sessionStorage.getItem('prime_admin_code');
    if (saved) {
      setAccessCode(saved);
      verifyCode(saved);
    }
  }, []);

  const verifyCode = async (codeToVerify?: string) => {
    const code = codeToVerify || accessCode;
    setAuthError('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('prime_admin_code', code);
        loadInventory();
        loadCustomers(code);
      } else {
        setAuthError('Invalid Admin Access Code');
      }
    } catch {
      setAuthError('Connection error verifying access code');
    }
  };

  const loadInventory = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        const map: Record<string, number> = {};
        data.products.forEach((p: Product) => {
          map[p.id] = p.stock;
        });
        setStockUpdates(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCustomers = async (code = accessCode) => {
    setLoadingCustomers(true);
    try {
      const res = await fetch('/api/admin/customers', {
        headers: { 'x-admin-code': code },
      });
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleStockChange = (id: string, delta: number) => {
    setStockUpdates((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + delta),
    }));
  };

  const saveStock = async (id: string) => {
    const newStock = stockUpdates[id];
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': accessCode,
        },
        body: JSON.stringify({ id, stock: newStock }),
      });
      if (res.ok) {
        setSaveSuccessMsg(`Stock updated for item #${id.substring(0, 8)}`);
        setTimeout(() => setSaveSuccessMsg(''), 2500);
        loadInventory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct.name || !editingProduct.price) return;

    const prodId =
      editingProduct.id ||
      'prod-' + editingProduct.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const payload: Product = {
      id: prodId,
      name: editingProduct.name,
      price: Number(editingProduct.price),
      description: editingProduct.description || '',
      category: editingProduct.category || 'Apparel',
      imageUrl: editingProduct.imageUrl || '',
      stock: Number(editingProduct.stock || 0),
      bundleConfig: editingProduct.bundleConfig,
    };

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-code': accessCode,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaveSuccessMsg('Product configuration successfully saved');
        setTimeout(() => setSaveSuccessMsg(''), 2500);
        loadInventory();
        setActiveTab('inventory');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Gated Access Screen
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#07090c] text-white flex flex-col items-center justify-center p-4 font-['Montserrat']">
        <div className="w-full max-w-sm bg-[#0e1219] border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-['Oswald'] tracking-wide">
                PRIME ADMIN
              </h1>
              <p className="text-[11px] text-neutral-400">Restricted Console Access</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyCode();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                Access Code
              </label>
              <input
                id="admin-access-code"
                type="password"
                placeholder="Enter ADMIN_ACCESS_CODE"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full bg-[#151a24] border border-neutral-700 text-sm rounded-xl px-3.5 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {authError && (
              <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              id="admin-login-btn"
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl font-['Oswald'] tracking-wide transition-colors"
            >
              AUTHENTICATE CONSOLE
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-[11px] text-neutral-500">
            <span>Default: PRIME_ADMIN_2026</span>
            <Link href="/" className="hover:text-amber-400 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Shopfront
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 2. Authenticated Admin Dashboard: Dense, Vertical-Scroll-Only Layout
  return (
    <div className="min-h-screen bg-[#07090c] text-neutral-100 flex flex-col font-['Montserrat'] max-w-lg mx-auto border-x border-neutral-800/60">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0b0e14]/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold font-['Oswald'] tracking-wide text-white leading-tight">
              PRIME CONTROL
            </h1>
            <span className="text-[10px] text-amber-400 font-mono">SECURE ADMIN NODE</span>
          </div>
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem('prime_admin_code');
            setIsAuthenticated(false);
          }}
          className="text-xs text-neutral-400 hover:text-red-400 font-mono px-2 py-1 bg-neutral-900 border border-neutral-800 rounded-lg"
        >
          Exit
        </button>
      </header>

      {/* Save Success Notice */}
      {saveSuccessMsg && (
        <div className="bg-emerald-950/80 border-b border-emerald-700/60 text-emerald-300 text-xs py-2 px-4 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Module Selector - Dense Tabs */}
      <nav className="p-3 bg-[#0d1017] border-b border-neutral-800/80 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all font-['Oswald'] ${
            activeTab === 'inventory'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          INVENTORY
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all font-['Oswald'] ${
            activeTab === 'config'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          CONFIGURATOR
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all font-['Oswald'] ${
            activeTab === 'customers'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          CUSTOMERS
        </button>
      </nav>

      {/* Content Container - Vertical-Scroll-Only, No Tables */}
      <main className="flex-1 p-3.5 space-y-4 overflow-y-auto">
        {/* MODULE 1: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-['Oswald']">
                Catalog Stock Control ({products.length})
              </h2>
              <button
                onClick={loadInventory}
                className="text-[11px] text-amber-400 hover:underline font-mono"
              >
                Refresh
              </button>
            </div>

            {loadingProducts ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-neutral-900 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p) => {
                  const currentCount = stockUpdates[p.id] ?? p.stock;
                  const isZero = currentCount === 0;
                  const isDirty = currentCount !== p.stock;

                  return (
                    <div
                      key={p.id}
                      className="bg-[#11151e] border border-neutral-800 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-white truncate font-['Oswald']">
                            {p.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                            <span>${p.price}</span>
                            <span>•</span>
                            <span>{p.category}</span>
                            {p.bundleConfig && (
                              <span className="text-amber-400 font-semibold">
                                Bundle: {p.bundleConfig.discountPercent}% Off
                              </span>
                            )}
                          </div>
                        </div>

                        {isZero ? (
                          <span className="text-[10px] font-bold bg-red-950/60 border border-red-800 text-red-400 px-2 py-0.5 rounded shrink-0">
                            OUT OF STOCK
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded shrink-0 font-mono">
                            {currentCount} IN STOCK
                          </span>
                        )}
                      </div>

                      {/* Stock Stepper Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStockChange(p.id, -5)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-mono"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleStockChange(p.id, -1)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-mono"
                          >
                            -1
                          </button>
                          <input
                            type="number"
                            value={currentCount}
                            onChange={(e) =>
                              setStockUpdates({
                                ...stockUpdates,
                                [p.id]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-14 bg-black border border-neutral-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-white"
                          />
                          <button
                            onClick={() => handleStockChange(p.id, 1)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-mono"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleStockChange(p.id, 5)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-mono"
                          >
                            +5
                          </button>
                        </div>

                        <button
                          onClick={() => saveStock(p.id)}
                          disabled={!isDirty}
                          className={`px-3 py-1 rounded text-xs font-bold font-['Oswald'] transition-colors ${
                            isDirty
                              ? 'bg-amber-500 text-black hover:bg-amber-400'
                              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          }`}
                        >
                          SAVE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODULE 2: PRODUCT CONFIGURATOR */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-['Oswald']">
                Product & Bundle Configurator
              </h2>
              <button
                type="button"
                onClick={() =>
                  setEditingProduct({
                    id: '',
                    name: '',
                    price: 60,
                    category: 'Hardware',
                    description: '',
                    imageUrl: '',
                    stock: 15,
                    bundleConfig: { bundleSize: 2, discountPercent: 15 },
                  })
                }
                className="text-xs text-amber-400 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> New Item
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="bg-[#11151e] border border-neutral-800 rounded-xl p-4 space-y-3.5">
              <div>
                <label className="block text-[11px] uppercase text-neutral-400 font-semibold mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g. Apex Tactical Cargo"
                  className="w-full bg-[#161b26] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase text-neutral-400 font-semibold mb-1">
                    Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                    className="w-full bg-[#161b26] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-neutral-400 font-semibold mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                    className="w-full bg-[#161b26] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase text-neutral-400 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={editingProduct.category || 'Apparel'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-[#161b26] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Apparel">Apparel</option>
                    <option value="Hardware">Hardware</option>
                    <option value="EDC Gear">EDC Gear</option>
                    <option value="Nutrition">Nutrition</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase text-neutral-400 font-semibold mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-[#161b26] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase text-neutral-400 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Detailed specifications..."
                  className="w-full bg-[#161b26] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 'Buy More, Save More' Bundle Configuration */}
              <div className="bg-[#181f2e] border border-amber-900/40 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 font-['Oswald'] uppercase">
                    &apos;Buy More, Save More&apos; Bundle Config
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">Bundle Min Units</label>
                    <input
                      type="number"
                      min="2"
                      value={editingProduct.bundleConfig?.bundleSize || 2}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          bundleConfig: {
                            ...editingProduct.bundleConfig,
                            bundleSize: parseInt(e.target.value) || 2,
                            discountPercent: editingProduct.bundleConfig?.discountPercent || 15,
                          },
                        })
                      }
                      className="w-full bg-black border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">Discount % Off</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={editingProduct.bundleConfig?.discountPercent || 15}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          bundleConfig: {
                            ...editingProduct.bundleConfig,
                            bundleSize: editingProduct.bundleConfig?.bundleSize || 2,
                            discountPercent: parseInt(e.target.value) || 15,
                          },
                        })
                      }
                      className="w-full bg-black border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl font-['Oswald'] tracking-wide flex items-center justify-center gap-2 shadow transition-colors"
              >
                <Save className="w-4 h-4" />
                SAVE CONFIGURATION
              </button>
            </form>
          </div>
        )}

        {/* MODULE 3: CUSTOMER MANAGEMENT & FRAUD DETECTION */}
        {activeTab === 'customers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase font-bold text-neutral-400 tracking-wider font-['Oswald']">
                Telegram Members & Fingerprints ({customers.length})
              </h2>
              <button
                onClick={() => loadCustomers()}
                className="text-[11px] text-amber-400 hover:underline font-mono"
              >
                Refresh
              </button>
            </div>

            {loadingCustomers ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-neutral-900 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="bg-[#11151e] border border-neutral-800 rounded-xl p-6 text-center space-y-2">
                <Users className="w-8 h-8 mx-auto text-neutral-600" />
                <p className="text-xs text-neutral-400">No member profiles captured yet</p>
                <p className="text-[11px] text-neutral-500">
                  Telegram user profiles and fraud fingerprints will appear here upon Mini App launch.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {customers.map((c) => {
                  const isExpanded = expandedCustomer === c.id;
                  const fp = c.fingerprints?.[0] || null;

                  return (
                    <div
                      key={c.id}
                      className="bg-[#11151e] border border-neutral-800 rounded-xl p-3.5 space-y-2"
                    >
                      {/* Customer Header Bar */}
                      <div
                        onClick={() => setExpandedCustomer(isExpanded ? null : c.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold font-mono">
                            {c.tgName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white font-['Oswald'] flex items-center gap-1.5">
                              <span>{c.tgName || 'Telegram User'}</span>
                              <span className="text-[10px] text-amber-400 font-mono font-normal">
                                {c.tgUsername || `@${c.id}`}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-2">
                              <span>ID: {c.primeMemberId || 'PRM-MEMBER'}</span>
                              <span>•</span>
                              <span>TG: {c.tgUserId || c.id}</span>
                            </div>
                          </div>
                        </div>

                        <button className="text-neutral-500 hover:text-neutral-300">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Collapsible Details - Zero horizontal scroll */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-neutral-800 space-y-3 text-xs font-['Montserrat'] animate-fade-in">
                          {/* Capture Attributes */}
                          <div className="bg-[#0b0e14] rounded-lg p-2.5 space-y-1 text-[11px] font-mono">
                            <div className="text-neutral-400 font-sans font-semibold text-[10px] uppercase tracking-wider text-amber-400 pb-0.5">
                              Persistent Telegram Record
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Phone:</span>
                              <span className="text-neutral-300">{c.phoneNumber || 'Not Shared'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Enrolled:</span>
                              <span className="text-neutral-300">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Last Seen:</span>
                              <span className="text-neutral-300">{c.lastSeen ? new Date(c.lastSeen).toLocaleTimeString() : 'N/A'}</span>
                            </div>
                            {c.groups && c.groups.length > 0 && (
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Groups:</span>
                                <span className="text-neutral-300">{c.groups.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Fraud Detection / Fingerprinting Snapshot */}
                          <div className="bg-[#090b10] border border-neutral-800/80 rounded-lg p-2.5 space-y-1.5 text-[11px] font-mono">
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 font-sans">
                              <ShieldAlert className="w-3 h-3" />
                              Fraud Detection Fingerprint
                            </div>

                            {fp ? (
                              <div className="space-y-1 text-[10px]">
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Device ID:</span>
                                  <span className="text-neutral-300 truncate max-w-[170px]">{fp.deviceId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">App ID:</span>
                                  <span className="text-neutral-300">{fp.appId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">IP (Session):</span>
                                  <span className="text-neutral-300">{fp.ipSession || '127.0.0.1'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">ISP / Network:</span>
                                  <span className="text-neutral-300">{fp.isp}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">VPN Flag:</span>
                                  <span className={fp.vpnDetected ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                    {fp.vpnDetected ? 'DETECTED' : 'CLEAR'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Graphics GPU:</span>
                                  <span className="text-neutral-300 truncate max-w-[170px]">{fp.graphics}</span>
                                </div>
                                {fp.location && (
                                  <div className="flex justify-between">
                                    <span className="text-neutral-500">GPS / Lat-Long:</span>
                                    <span className="text-neutral-300">
                                      {fp.location.latitude?.toFixed(4)}, {fp.location.longitude?.toFixed(4)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-neutral-500 py-1">
                                No raw hardware fingerprint captured for this session yet.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
