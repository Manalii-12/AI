import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Package
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getProducts, createProduct, getSuppliers } from '../api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cold Brew');
  const [unit, setUnit] = useState('Glass Bottle (250ml)');
  const [costPrice, setCostPrice] = useState(1.50);
  const [sellingPrice, setSellingPrice] = useState(4.00);
  const [stockQuantity, setStockQuantity] = useState(100);
  const [reorderLevel, setReorderLevel] = useState(40);
  const [supplierId, setSupplierId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [prodRes, suppRes] = await Promise.all([
        getProducts({ category: categoryFilter || undefined, search: search || undefined }),
        getSuppliers()
      ]);
      setProducts(prodRes.data);
      setSuppliers(suppRes.data);
      if (suppRes.data.length > 0 && !supplierId) {
        setSupplierId(suppRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, search]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createProduct({
        sku,
        name,
        category,
        unit,
        cost_price: parseFloat(costPrice),
        selling_price: parseFloat(sellingPrice),
        stock_quantity: parseInt(stockQuantity),
        reorder_level: parseInt(reorderLevel),
        supplier_id: supplierId ? parseInt(supplierId) : undefined
      });
      setShowAddModal(false);
      setSku('');
      setName('');
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['Cold Brew', 'Kombucha', 'Sparkling Tea', 'Functional Juice'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
            <Coffee className="w-6 h-6 text-[#347A59]" />
            <span>Beverage Catalog & Unit Economics</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Monitor product cost basis, gross margins, available inventory, and 30-day sales run rates.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-[#F4F8F5] font-bold text-xs shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Beverage SKU</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E5ECE7] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#111827] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search beverage by SKU or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#347A59] focus:outline-none focus:border-[#347A59]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              categoryFilter === '' ? 'bg-[#347A59] text-[#F4F8F5] font-bold' : 'text-[#111827] hover:text-[#111827]'
            }`}
          >
            All Lines
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat ? 'bg-[#347A59] text-[#F4F8F5] font-bold' : 'text-[#111827] hover:text-[#111827]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const margin = ((p.selling_price - p.cost_price) / p.selling_price) * 100;
          return (
            <div key={p.id} className="bg-white rounded-2xl p-5 border border-[#E5ECE7] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EBF4EE] text-[#111827] border border-[#E5ECE7]">
                    {p.sku}
                  </span>
                  <StatusBadge status={p.stock_status} />
                </div>

                <h3 className="text-sm font-bold text-[#111827] mb-1">{p.name}</h3>
                <p className="text-[11px] text-[#111827] mb-3">{p.description || p.category} • {p.unit}</p>

                {/* Pricing & Margins */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-[#111827] uppercase font-bold block">Selling Price</span>
                    <span className="font-bold text-[#111827] font-mono">${p.selling_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#111827] uppercase font-bold block">Unit Cost</span>
                    <span className="font-semibold text-[#111827] font-mono">${p.cost_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#111827] uppercase font-bold block">Gross Margin</span>
                    <span className="font-bold text-emerald-700 font-mono">{margin.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Stock Stats */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#111827]">
                    <span>Available Stock:</span>
                    <strong className="font-mono text-emerald-700">{p.available_stock} units</strong>
                  </div>
                  <div className="flex justify-between text-[#111827] text-[11px]">
                    <span>Reserved for Orders:</span>
                    <span className="font-mono text-amber-700 font-semibold">{p.reserved_stock} units</span>
                  </div>
                  <div className="flex justify-between text-[#111827] text-[11px]">
                    <span>Reorder Threshold:</span>
                    <span className="font-mono text-[#111827]">{p.reorder_level} units</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5ECE7] flex items-center justify-between text-[11px]">
                <span className="text-[#111827]">Supplier: <strong className="text-[#111827]">{p.supplier_name}</strong></span>
                <span className="text-emerald-700 font-bold">{p.sales_velocity_30d} sold / 30d</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-base font-bold text-[#111827] mb-4">Add Beverage Product SKU</h2>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. HUG-KOM-PAS"
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Product Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hugg Passionfruit Guava Kombucha"
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-[#F4F8F5] font-bold text-xs"
                >
                  {submitting ? 'Adding...' : 'Create SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
