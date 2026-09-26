import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Minus, Trash2, Pencil, Search, X, AlertTriangle, PackageX, Loader2, User, Check, ShieldCheck } from "lucide-react";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n) => String(n).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

function formatDateBn(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBn(d.getFullYear())}`;
}

function formatDateTimeBn(ts) {
  const d = new Date(ts);
  const h = d.getHours();
  const h12 = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${toBn(d.getDate())} ${BN_MONTHS[d.getMonth()]} · ${toBn(h12)}:${toBn(mm)} ${ampm}`;
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

function expiryStatus(dateStr) {
  const d = daysUntil(dateStr);
  if (d < 0) return "expired";
  if (d <= 30) return "soon";
  return "ok";
}

function inRange(ts, range) {
  const now = new Date();
  const d = new Date(ts);
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    return d >= weekAgo;
  }
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

const UNIT_OPTIONS = ["পিস", "বক্স", "স্ট্রিপ", "বোতল", "টিউব"];
const LOW_STOCK_LIMIT = 5;
const TABS = [
  { key: "inventory", label: "ইনভেন্টরি" },
  { key: "report", label: "বিক্রয় রিপোর্ট" },
  { key: "suppliers", label: "সাপ্লায়ার" },
];
const REPORT_RANGES = [
  { key: "today", label: "আজ" },
  { key: "week", label: "এই সপ্তাহ" },
  { key: "month", label: "এই মাস" },
  { key: "all", label: "সব সময়" },
];

const emptyMedForm = {
  id: null,
  name: "",
  category: "",
  batchNo: "",
  stock: "",
  unit: "পিস",
  price: "",
  costPrice: "",
  expiryDate: "",
  supplierId: "",
};
const emptySupplierForm = { id: null, name: "", phone: "", address: "" };

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function MugdhoLimited() {
  const [medicines, setMedicines] = useState([]);
  const [sales, setSales] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [currentStaffId, setCurrentStaffId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [reportRange, setReportRange] = useState("today");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyMedForm);
  const [formError, setFormError] = useState("");
  const nameInputRef = useRef(null);

  const [rowAction, setRowAction] = useState(null);
  const [rowActionError, setRowActionError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteTxId, setDeleteTxId] = useState(null);

  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [supplierFormError, setSupplierFormError] = useState("");
  const [supplierDeleteId, setSupplierDeleteId] = useState(null);
  const supplierNameRef = useRef(null);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");

  // Load Data from localStorage
  useEffect(() => {
    try {
      const storedMeds = localStorage.getItem("mugdho-medicines");
      const storedSales = localStorage.getItem("mugdho-sales");
      const storedConfig = localStorage.getItem("mugdho-config");

      if (storedMeds) setMedicines(JSON.parse(storedMeds));
      if (storedSales) setSales(JSON.parse(storedSales));
      if (storedConfig) {
        const cfg = JSON.parse(storedConfig);
        setSuppliers(cfg.suppliers || []);
        setStaff(cfg.staff || []);
        setCurrentStaffId(cfg.currentStaffId || null);
      }
    } catch (e) {
      console.error("Failed to load local storage data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save Medicines to localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("mugdho-medicines", JSON.stringify(medicines));
    }
  }, [medicines, loading]);

  // Save Sales to localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("mugdho-sales", JSON.stringify(sales));
    }
  }, [sales, loading]);

  // Save Suppliers & Staff Config to localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        "mugdho-config",
        JSON.stringify({ suppliers, staff, currentStaffId })
      );
    }
  }, [suppliers, staff, currentStaffId, loading]);

  useEffect(() => {
    if (formOpen && nameInputRef.current) nameInputRef.current.focus();
  }, [formOpen]);

  useEffect(() => {
    if (supplierFormOpen && supplierNameRef.current) supplierNameRef.current.focus();
  }, [supplierFormOpen]);

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name || "";
  const currentStaffName = staff.find((s) => s.id === currentStaffId)?.name || "";

  const stats = useMemo(() => {
    const totalTypes = medicines.length;
    const totalUnits = medicines.reduce((s, m) => s + Number(m.stock || 0), 0);
    const expiredCount = medicines.filter((m) => expiryStatus(m.expiryDate) === "expired").length;
    const totalValue = medicines.reduce((s, m) => s + Number(m.stock || 0) * Number(m.price || 0), 0);
    return { totalTypes, totalUnits, expiredCount, totalValue };
  }, [medicines]);

  const filtered = useMemo(() => {
    let list = medicines;
    if (filter === "low") list = list.filter((m) => Number(m.stock) <= LOW_STOCK_LIMIT);
    if (filter === "expired") list = list.filter((m) => expiryStatus(m.expiryDate) === "expired");
    if (filter === "soon") list = list.filter((m) => expiryStatus(m.expiryDate) === "soon");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const rank = { expired: 0, soon: 1, ok: 2 };
      const sa = expiryStatus(a.expiryDate);
      const sb = expiryStatus(b.expiryDate);
      if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
      return a.name.localeCompare(b.name, "bn");
    });
  }, [medicines, filter, search]);

  const reportData = useMemo(() => {
    const inRangeSales = sales.filter((s) => inRange(s.timestamp, reportRange));
    const sellEntries = inRangeSales.filter((s) => s.type === "sell");
    const restockEntries = inRangeSales.filter((s) => s.type === "restock");
    const totalRevenue = sellEntries.reduce((s, e) => s + Number(e.total || 0), 0);
    const totalUnitsSold = sellEntries.reduce((s, e) => s + Number(e.qty || 0), 0);
    const estProfit = sellEntries.reduce((s, e) => s + (Number(e.unitPrice || 0) - Number(e.costPrice || 0)) * Number(e.qty || 0), 0);
    const byMed = {};
    sellEntries.forEach((e) => {
      byMed[e.medicineName] = (byMed[e.medicineName] || 0) + Number(e.qty || 0);
    });
    const topSelling = Object.entries(byMed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const transactions = [...inRangeSales].sort((a, b) => b.timestamp - a.timestamp);
    return { sellEntries, restockEntries, totalRevenue, totalUnitsSold, estProfit, topSelling, transactions };
  }, [sales, reportRange]);

  function openAddForm() {
    setForm(emptyMedForm);
    setFormError("");
    setFormOpen(true);
  }
  function openEditForm(med) {
    setForm({ ...emptyMedForm, ...med, stock: String(med.stock), price: String(med.price), costPrice: med.costPrice != null ? String(med.costPrice) : "" });
    setFormError("");
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setFormError("");
  }
  function submitForm(e) {
    e.preventDefault();
    if (!form.name.trim()) return setFormError("ঔষধের নাম লিখুন।");
    if (!form.expiryDate) return setFormError("মেয়াদ শেষের তারিখ দিন।");
    const stockNum = Number(form.stock);
    const priceNum = Number(form.price);
    const costNum = form.costPrice === "" ? 0 : Number(form.costPrice);
    if (form.stock === "" || isNaN(stockNum) || stockNum < 0) return setFormError("সঠিক স্টক সংখ্যা দিন।");
    if (form.price === "" || isNaN(priceNum) || priceNum < 0) return setFormError("সঠিক মূল্য দিন।");
    if (isNaN(costNum) || costNum < 0) return setFormError("সঠিক ক্রয়মূল্য দিন।");

    if (form.id) {
      setMedicines((prev) =>
        prev.map((m) => (m.id === form.id ? { ...form, stock: stockNum, price: priceNum, costPrice: costNum } : m))
      );
    } else {
      setMedicines((prev) => [...prev, { ...form, id: uid(), stock: stockNum, price: priceNum, costPrice: costNum }]);
    }
    setFormOpen(false);
    setFormError("");
  }

  function openSellForm(id) {
    setRowActionError("");
    setRowAction({ id, type: "sell", qty: "1" });
  }
  function openRestockForm(id) {
    setRowActionError("");
    setRowAction({ id, type: "restock", qty: "1" });
  }
  function cancelRowAction() {
    setRowAction(null);
    setRowActionError("");
  }
  function confirmRowAction() {
    if (!rowAction) return;
    const med = medicines.find((m) => m.id === rowAction.id);
    if (!med) return;
    const qty = Number(rowAction.qty);
    if (!qty || qty <= 0 || !Number.isFinite(qty)) {
      setRowActionError("সঠিক পরিমাণ দিন।");
      return;
    }
    if (rowAction.type === "sell" && qty > Number(med.stock)) {
      setRowActionError("স্টকে এত পরিমাণ নেই।");
      return;
    }
    const delta = rowAction.type === "sell" ? -qty : qty;
    setMedicines((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, stock: Math.max(0, Number(m.stock) + delta) } : m))
    );
    const record = {
      id: uid(),
      medicineId: med.id,
      medicineName: med.name,
      qty,
      unitPrice: Number(med.price),
      costPrice: Number(med.costPrice || 0),
      total: rowAction.type === "sell" ? qty * Number(med.price) : qty * Number(med.costPrice || 0),
      type: rowAction.type,
      staffName: currentStaffName,
      timestamp: Date.now(),
    };
    setSales((prev) => [record, ...prev]);
    setRowAction(null);
    setRowActionError("");
  }

  function confirmDelete(id) {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
    setDeleteId(null);
  }

  function confirmDeleteTx(id) {
    setSales((prev) => prev.filter((s) => s.id !== id));
    setDeleteTxId(null);
  }

  function openAddSupplier() {
    setSupplierForm(emptySupplierForm);
    setSupplierFormError("");
    setSupplierFormOpen(true);
  }
  function openEditSupplier(s) {
    setSupplierForm(s);
    setSupplierFormError("");
    setSupplierFormOpen(true);
  }
  function closeSupplierForm() {
    setSupplierFormOpen(false);
    setSupplierFormError("");
  }
  function submitSupplierForm(e) {
    e.preventDefault();
    if (!supplierForm.name.trim()) return setSupplierFormError("সাপ্লায়ারের নাম লিখুন।");
    if (supplierForm.id) {
      setSuppliers((prev) => prev.map((s) => (s.id === supplierForm.id ? supplierForm : s)));
    } else {
      setSuppliers((prev) => [...prev, { ...supplierForm, id: uid() }]);
    }
    setSupplierFormOpen(false);
    setSupplierFormError("");
  }
  function confirmDeleteSupplier(id) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setMedicines((prev) => prev.map((m) => (m.supplierId === id ? { ...m, supplierId: "" } : m)));
    setSupplierDeleteId(null);
  }

  function addStaff() {
    if (!newStaffName.trim()) return;
    const rec = { id: uid(), name: newStaffName.trim() };
    setStaff((prev) => [...prev, rec]);
    setCurrentStaffId(rec.id);
    setNewStaffName("");
  }
  function removeStaff(id) {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    if (currentStaffId === id) setCurrentStaffId(null);
  }

  const filterTabs = [
    { key: "all", label: "সব" },
    { key: "low", label: "কম স্টক" },
    { key: "soon", label: "শীঘ্রই মেয়াদ শেষ" },
    { key: "expired", label: "মেয়াদোত্তীর্ণ" },
  ];

  return (
    <div className="mg-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&family=Hind+Siliguri:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

        .mg-root {
          --bg: #F4F6F2;
          --surface: #FFFFFF;
          --ink: #16241D;
          --ink-soft: #52625A;
          --ink-faint: #8B968F;
          --primary: #1F4D3D;
          --primary-light: #2E7D63;
          --primary-wash: #E7EFEA;
          --line: #DEE5DE;
          --danger: #B23A2A;
          --danger-bg: #FBEAE7;
          --danger-line: #E9B9AE;
          --warn: #A66A13;
          --warn-bg: #FBF0DC;
          --warn-line: #E9CE9B;
          --info: #2E5F8A;
          --info-bg: #E7F0F8;
          font-family: 'Hind Siliguri', 'Inter', sans-serif;
          color: var(--ink);
          background: var(--bg);
          min-height: 100vh;
          padding: 28px 20px 60px;
          box-sizing: border-box;
        }
        .mg-root * { box-sizing: border-box; }
        .mg-wrap { max-width: 1020px; margin: 0 auto; }

        .mg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 22px;
          border-bottom: 1px solid var(--line);
          flex-wrap: wrap;
        }
        .mg-brand { display: flex; align-items: center; gap: 14px; }
        .mg-mark { width: 46px; height: 46px; flex: none; }
        .mg-brand-text h1 {
          font-family: 'Tiro Bangla', serif;
          font-size: 26px;
          font-weight: 400;
          letter-spacing: 0.3px;
          margin: 0;
          color: var(--primary);
        }
        .mg-brand-text p { margin: 2px 0 0; font-size: 13.5px; color: var(--ink-soft); }

        .mg-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .mg-staff-pill {
          display: flex; align-items: center; gap: 7px;
          background: var(--surface);
          border: 1px solid var(--line);
          padding: 9px 14px;
          border-radius: 999px;
          font-family: inherit;
          font-size: 13.5px;
          color: var(--ink-soft);
          cursor: pointer;
        }
        .mg-staff-pill:hover { border-color: var(--primary-light); color: var(--primary); }

        .mg-add-btn {
          display: flex; align-items: center; gap: 8px;
          background: var(--primary);
          color: #fff;
          border: none;
          padding: 11px 18px;
          border-radius: 7px;
          font-size: 14.5px;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .mg-add-btn:hover { background: var(--primary-light); }

        .mg-tabs { display: flex; gap: 22px; margin-top: 22px; border-bottom: 1px solid var(--line); }
        .mg-tab {
          padding: 10px 2px 12px;
          background: none; border: none; border-bottom: 2px solid transparent;
          font-family: inherit; font-size: 14.5px; color: var(--ink-soft);
          cursor: pointer;
        }
        .mg-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 500; }

        .mg-stats { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 26px; }
        .mg-stat { padding: 4px 20px; border-left: 1px solid var(--line); }
        .mg-stat:first-child { border-left: none; padding-left: 0; }
        .mg-stat-label { font-size: 13px; color: var(--ink-soft); margin: 0 0 6px; }
        .mg-stat-value { font-family: 'Inter', sans-serif; font-size: 26px; font-weight: 600; margin: 0; color: var(--ink); }
        .mg-stat-value.danger { color: var(--danger); }
        .mg-stat-value.small { font-size: 21px; }

        .mg-toolbar { display: flex; align-items: center; gap: 14px; margin-top: 30px; flex-wrap: wrap; }
        .mg-search { position: relative; flex: 1; min-width: 200px; }
        .mg-search input {
          width: 100%; padding: 10px 14px 10px 38px; border-radius: 7px;
          border: 1px solid var(--line); background: var(--surface);
          font-family: inherit; font-size: 14.5px; color: var(--ink);
        }
        .mg-search input:focus { outline: none; border-color: var(--primary-light); }
        .mg-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); }
        .mg-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .mg-chip {
          padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line);
          background: var(--surface); font-family: inherit; font-size: 13.5px;
          color: var(--ink-soft); cursor: pointer; white-space: nowrap; transition: all 0.15s ease;
        }
        .mg-chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }
        .mg-chip:not(.active):hover { border-color: var(--primary-light); color: var(--primary); }

        .mg-panel-head { display: flex; align-items: center; justify-content: space-between; margin-top: 32px; margin-bottom: 12px; gap: 14px; flex-wrap: wrap; }
        .mg-panel-title { font-family: 'Tiro Bangla', serif; font-weight: 400; font-size: 19px; color: var(--primary); margin: 0; display: flex; align-items: center; gap: 8px; }

        .mg-list-head {
          display: grid; grid-template-columns: 2.1fr 1.1fr 1.4fr 1.5fr 1fr 1.3fr;
          gap: 10px; padding: 14px 16px; margin-top: 14px; font-size: 12.5px; color: var(--ink-faint);
        }
        .mg-row {
          display: grid; grid-template-columns: 2.1fr 1.1fr 1.4fr 1.5fr 1fr 1.3fr;
          gap: 10px; align-items: center; padding: 15px 16px;
          background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--line);
          border-radius: 6px; margin-bottom: 8px;
        }
        .mg-row.expired { border-left-color: var(--danger); background: var(--danger-bg); }
        .mg-row.soon { border-left-color: var(--warn); background: var(--warn-bg); }

        .mg-srow { grid-template-columns: 1.6fr 1fr 1.8fr 0.9fr 1fr; }
        .mg-shead { grid-template-columns: 1.6fr 1fr 1.8fr 0.9fr 1fr; }

        .mg-tx-row { grid-template-columns: 0.8fr 1.7fr 0.7fr 1fr 1fr 1.2fr; }
        .mg-tx-head { grid-template-columns: 0.8fr 1.7fr 0.7fr 1fr 1fr 1.2fr; }

        .mg-tx-manage-row { grid-template-columns: 0.8fr 1.5fr 0.6fr 0.9fr 1.1fr 1.1fr 1fr; }
        .mg-tx-manage-head { grid-template-columns: 0.8fr 1.5fr 0.6fr 0.9fr 1.1fr 1.1fr 1fr; }

        .mg-cell-label { display: none; font-size: 11.5px; color: var(--ink-faint); margin-bottom: 2px; }
        .mg-med-name { font-size: 15px; font-weight: 500; margin: 0; }
        .mg-med-cat { font-size: 12.5px; color: var(--ink-soft); margin: 2px 0 0; }
        .mg-batch { font-size: 13.5px; color: var(--ink-soft); }

        .mg-stock-display { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .mg-stock-num { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14.5px; min-width: 18px; text-align: center; }
        .mg-stock-num.low { color: var(--danger); }
        .mg-unit-tag { font-size: 12px; color: var(--ink-faint); }
        .mg-mini-btn {
          width: 24px; height: 24px; border-radius: 5px; border: 1px solid var(--line);
          background: var(--surface); display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--ink-soft); flex: none;
        }
        .mg-mini-btn:hover { border-color: var(--primary-light); color: var(--primary); }

        .mg-qty-form { display: flex; flex-direction: column; gap: 5px; }
        .mg-qty-row { display: flex; align-items: center; gap: 6px; }
        .mg-qty-label { font-size: 12px; color: var(--ink-soft); white-space: nowrap; }
        .mg-qty-row input {
          width: 56px; padding: 6px 8px; border-radius: 5px; border: 1px solid var(--line);
          font-family: inherit; font-size: 13.5px;
        }
        .mg-qty-error { font-size: 11.5px; color: var(--danger); }

        .mg-expiry-date { font-size: 13.5px; }
        .mg-expiry-badge { display: inline-block; margin-top: 4px; font-size: 11.5px; padding: 2px 8px; border-radius: 999px; }
        .mg-expiry-badge.expired { background: var(--danger); color: #fff; }
        .mg-expiry-badge.soon { background: var(--warn); color: #fff; }

        .mg-price { font-family: 'Inter', sans-serif; font-size: 14.5px; }

        .mg-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .mg-icon-btn {
          width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--line);
          background: var(--surface); display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--ink-soft);
        }
        .mg-icon-btn:hover { border-color: var(--primary-light); color: var(--primary); }
        .mg-icon-btn.danger:hover { border-color: var(--danger); color: var(--danger); }

        .mg-confirm-row { display: flex; align-items: center; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
        .mg-confirm-text { font-size: 13px; color: var(--danger); }
        .mg-confirm-btn { font-size: 12.5px; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; font-family: inherit; }
        .mg-confirm-btn.yes { background: var(--danger); color: #fff; border-color: var(--danger); }

        .mg-empty { text-align: center; padding: 60px 20px; border: 1px dashed var(--line); border-radius: 10px; margin-top: 24px; }
        .mg-empty h3 { font-family: 'Tiro Bangla', serif; font-weight: 400; font-size: 20px; margin: 14px 0 6px; color: var(--primary); }
        .mg-empty p { font-size: 14px; color: var(--ink-soft); margin: 0 0 20px; }

        .mg-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 80px 0; color: var(--ink-soft); font-size: 14px; }
        .mg-spin { animation: mg-spin 1s linear infinite; }
        @keyframes mg-spin { to { transform: rotate(360deg); } }

        .mg-tx-badge { font-size: 11px; padding: 3px 9px; border-radius: 999px; display: inline-block; }
        .mg-tx-badge.sell { background: var(--primary-wash); color: var(--primary); }
        .mg-tx-badge.restock { background: var(--info-bg); color: var(--info); }

        .mg-topsell { margin-top: 22px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 16px 20px; }
        .mg-topsell h3 { font-size: 14.5px; font-weight: 500; margin: 0 0 12px; color: var(--ink); }
        .mg-topsell-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; font-size: 13.5px; border-top: 1px solid var(--line); }
        .mg-topsell-row:first-of-type { border-top: none; }
        .mg-topsell-name { color: var(--ink); }
        .mg-topsell-qty { color: var(--ink-soft); font-family: 'Inter', sans-serif; }

        .mg-overlay { position: fixed; inset: 0; background: rgba(22, 36, 29, 0.4); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50; }
        .mg-modal { background: var(--surface); border-radius: 10px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; padding: 26px; }
        .mg-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .mg-modal-head h2 { font-family: 'Tiro Bangla', serif; font-weight: 400; font-size: 20px; margin: 0; color: var(--primary); }
        .mg-close-btn { border: none; background: none; cursor: pointer; color: var(--ink-faint); padding: 4px; }
        .mg-close-btn:hover { color: var(--ink); }

        .mg-field { margin-bottom: 15px; }
        .mg-field label { display: block; font-size: 13px; color: var(--ink-soft); margin-bottom: 6px; }
        .mg-field input, .mg-field select {
          width: 100%; padding: 10px 12px; border-radius: 7px; border: 1px solid var(--line);
          font-family: inherit; font-size: 14.5px; color: var(--ink); background: var(--surface);
        }
        .mg-field input:focus, .mg-field select:focus { outline: none; border-color: var(--primary-light); }
        .mg-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mg-field-row-3 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; }

        .mg-form-error { font-size: 13px; color: var(--danger); background: var(--danger-bg); border: 1px solid var(--danger-line); padding: 9px 12px; border-radius: 6px; margin-bottom: 15px; }
        .mg-submit-btn { width: 100%; padding: 12px; background: var(--primary); color: #fff; border: none; border-radius: 7px; font-family: inherit; font-size: 15px; font-weight: 500; cursor: pointer; margin-top: 6px; }
        .mg-submit-btn:hover { background: var(--primary-light); }

        .mg-staff-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; max-height: 240px; overflow-y: auto; }
        .mg-staff-item { display: flex; align-items: center; gap: 8px; }
        .mg-staff-select {
          flex: 1; display: flex; align-items: center; gap: 8px; text-align: left;
          padding: 10px 12px; border-radius: 7px; border: 1px solid var(--line);
          background: var(--surface); font-family: inherit; font-size: 14px; color: var(--ink);
          cursor: pointer;
        }
        .mg-staff-item.active .mg-staff-select { border-color: var(--primary); background: var(--primary-wash); color: var(--primary); font-weight: 500; }
        .mg-staff-select:hover { border-color: var(--primary-light); }
        .mg-staff-add { display: flex; gap: 8px; }
        .mg-staff-add input {
          flex: 1; padding: 10px 12px; border-radius: 7px; border: 1px solid var(--line);
          font-family: inherit; font-size: 14px;
        }
        .mg-empty-note { font-size: 13px; color: var(--ink-soft); text-align: center; padding: 10px 0; }

        @media (max-width: 760px) {
          .mg-stats { grid-template-columns: repeat(2, 1fr); row-gap: 18px; }
          .mg-stat:nth-child(3) { border-left: none; padding-left: 0; }
          .mg-list-head, .mg-shead, .mg-tx-head, .mg-tx-manage-head { display: none; }
          .mg-row { grid-template-columns: 1fr; row-gap: 8px; }
          .mg-cell-label { display: block; }
          .mg-actions { justify-content: flex-start; margin-top: 4px; }
          .mg-header { align-items: flex-start; }
        }
      `}</style>

      <div className="mg-wrap">
        <header className="mg-header">
          <div className="mg-brand">
            <svg className="mg-mark" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="46" height="46" rx="10" fill="#1F4D3D" />
              <path d="M24 12v24M12 24h24" stroke="#EAF2EC" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
            <div className="mg-brand-text">
              <h1>MUGDHO LIMITED</h1>
              <p>ঔষধ স্টক ব্যবস্থাপনা</p>
            </div>
          </div>
          <div className="mg-header-actions">
            <button className="mg-staff-pill" onClick={() => setStaffModalOpen(true)}>
              <User size={14} /> {currentStaffName || "স্টাফ নির্বাচন করুন"}
            </button>
            {activeTab === "inventory" && (
              <button className="mg-add-btn" onClick={openAddForm}>
                <Plus size={17} /> নতুন ঔষধ যোগ করুন
              </button>
            )}
            {activeTab === "suppliers" && (
              <button className="mg-add-btn" onClick={openAddSupplier}>
                <Plus size={17} /> নতুন সাপ্লায়ার
              </button>
            )}
          </div>
        </header>

        <nav className="mg-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`mg-tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

        {activeTab === "inventory" && (
          <>
            <div className="mg-stats">
              <div className="mg-stat">
                <p className="mg-stat-label">মোট ঔষধের ধরন</p>
                <p className="mg-stat-value">{toBn(stats.totalTypes)}</p>
              </div>
              <div className="mg-stat">
                <p className="mg-stat-label">মোট স্টক ইউনিট</p>
                <p className="mg-stat-value">{toBn(stats.totalUnits)}</p>
              </div>
              <div className="mg-stat">
                <p className="mg-stat-label">মেয়াদোত্তীর্ণ</p>
                <p className={`mg-stat-value ${stats.expiredCount > 0 ? "danger" : ""}`}>{toBn(stats.expiredCount)}</p>
              </div>
              <div className="mg-stat">
                <p className="mg-stat-label">মোট স্টক মূল্য</p>
                <p className="mg-stat-value">৳{toBn(stats.totalValue.toLocaleString("en-IN"))}</p>
              </div>
            </div>

            <div className="mg-toolbar">
              <div className="mg-search">
                <Search size={16} />
                <input type="text" placeholder="ঔষধের নাম দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="mg-filters">
                {filterTabs.map((t) => (
                  <button key={t.key} className={`mg-chip ${filter === t.key ? "active" : ""}`} onClick={() => setFilter(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="mg-loading">
                <Loader2 size={18} className="mg-spin" /> তথ্য লোড হচ্ছে...
              </div>
            ) : filtered.length === 0 ? (
              <div className="mg-empty">
                <PackageX size={34} color="#8B968F" style={{ margin: "0 auto" }} />
                <h3>{medicines.length === 0 ? "এখনও কোনো ঔষধ যোগ করা হয়নি" : "কিছু পাওয়া যায়নি"}</h3>
                <p>{medicines.length === 0 ? "দোকানের স্টক ডিজিটাল ভাবে রাখতে প্রথম ঔষধটি যোগ করুন।" : "অন্য নাম দিয়ে খুঁজুন অথবা ফিল্টার পরিবর্তন করুন।"}</p>
                {medicines.length === 0 && (
                  <button className="mg-add-btn" onClick={openAddForm} style={{ margin: "0 auto" }}>
                    <Plus size={17} /> নতুন ঔষধ যোগ করুন
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mg-list-head">
                  <span>ঔষধের নাম</span>
                  <span>ব্যাচ নং</span>
                  <span>স্টক</span>
                  <span>মেয়াদ শেষ</span>
                  <span>মূল্য/একক</span>
                  <span></span>
                </div>
                {filtered.map((m) => {
                  const status = expiryStatus(m.expiryDate);
                  const supName = supplierName(m.supplierId);
                  return (
                    <div key={m.id} className={`mg-row ${status}`}>
                      <div>
                        <p className="mg-med-name">{m.name}</p>
                        {(m.category || supName) && (
                          <p className="mg-med-cat">{[m.category, supName].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                      <div>
                        <span className="mg-cell-label">ব্যাচ নং</span>
                        <span className="mg-batch">{m.batchNo || "—"}</span>
                      </div>
                      <div>
                        <span className="mg-cell-label">স্টক</span>
                        {rowAction && rowAction.id === m.id ? (
                          <div className="mg-qty-form">
                            <div className="mg-qty-row">
                              <span className="mg-qty-label">{rowAction.type === "sell" ? "বিক্রয়:" : "যোগ:"}</span>
                              <input
                                type="number"
                                min="1"
                                autoFocus
                                value={rowAction.qty}
                                onChange={(e) => setRowAction({ ...rowAction, qty: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && confirmRowAction()}
                              />
                              <button className="mg-icon-btn" onClick={confirmRowAction} aria-label="নিশ্চিত করুন">
                                <Check size={14} />
                              </button>
                              <button className="mg-icon-btn" onClick={cancelRowAction} aria-label="বাতিল">
                                <X size={14} />
                              </button>
                            </div>
                            {rowActionError && <span className="mg-qty-error">{rowActionError}</span>}
                          </div>
                        ) : (
                          <div className="mg-stock-display">
                            <span className={`mg-stock-num ${Number(m.stock) <= LOW_STOCK_LIMIT ? "low" : ""}`}>{toBn(m.stock)}</span>
                            <span className="mg-unit-tag">{m.unit}</span>
                            <button className="mg-mini-btn" onClick={() => openSellForm(m.id)} title="বিক্রয়" aria-label="বিক্রয়">
                              <Minus size={12} />
                            </button>
                            <button className="mg-mini-btn" onClick={() => openRestockForm(m.id)} title="মজুদ যোগ" aria-label="মজুদ যোগ">
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="mg-cell-label">মেয়াদ শেষ</span>
                        <div className="mg-expiry-date">{formatDateBn(m.expiryDate)}</div>
                        {status === "expired" && <span className="mg-expiry-badge expired">মেয়াদোত্তীর্ণ</span>}
                        {status === "soon" && <span className="mg-expiry-badge soon">{toBn(daysUntil(m.expiryDate))} দিন বাকি</span>}
                      </div>
                      <div>
                        <span className="mg-cell-label">মূল্য/একক</span>
                        <span className="mg-price">৳{toBn(m.price)}</span>
                      </div>
                      <div className="mg-actions">
                        {deleteId === m.id ? (
                          <div className="mg-confirm-row">
                            <span className="mg-confirm-text">মুছে ফেলবেন?</span>
                            <button className="mg-confirm-btn" onClick={() => setDeleteId(null)}>না</button>
                            <button className="mg-confirm-btn yes" onClick={() => confirmDelete(m.id)}>হ্যাঁ</button>
                          </div>
                        ) : (
                          <>
                            <button className="mg-icon-btn" onClick={() => openEditForm(m)} aria-label="সম্পাদনা">
                              <Pencil size={15} />
                            </button>
                            <button className="mg-icon-btn danger" onClick={() => setDeleteId(m.id)} aria-label="মুছুন">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {activeTab === "report" && (
          <>
            <div className="mg-toolbar" style={{ marginTop: 24 }}>
              <div className="mg-filters">
                {REPORT_RANGES.map((r) => (
                  <button key={r.key} className={`mg-chip ${reportRange === r.key ? "active" : ""}`} onClick={() => setReportRange(r.key)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mg-stats" style={{ marginTop: 22 }}>
              <div className="mg-stat">
                <p className="mg-stat-label">মোট বিক্রয়</p>
                <p className="mg-stat-value small">৳{toBn(reportData.totalRevenue.toLocaleString("en-IN"))}</p>
              </div>
              <div className="mg-stat">
                <p className="mg-stat-label">বিক্রিত ইউনিট</p>
                <p className="mg-stat-value small">{toBn(reportData.totalUnitsSold)}</p>
              </div>
              <div className="mg-stat">
                <p className="mg-stat-label">মোট লেনদেন</p>
                <p className="mg-stat-value small">{toBn(reportData.sellEntries.length)}</p>
              </div>
              <div className="mg-stat">
                <p className="mg-stat-label">আনুমানিক লাভ</p>
                <p className="mg-stat-value small">৳{toBn(Math.round(reportData.estProfit).toLocaleString("en-IN"))}</p>
              </div>
            </div>

            {reportData.topSelling.length > 0 && (
              <div className="mg-topsell">
                <h3>বেশি বিক্রি হওয়া ঔষধ</h3>
                {reportData.topSelling.map(([name, qty], i) => (
                  <div key={name} className="mg-topsell-row">
                    <span className="mg-topsell-name">{toBn(i + 1)}. {name}</span>
                    <span className="mg-topsell-qty">{toBn(qty)} ইউনিট</span>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div className="mg-loading">
                <Loader2 size={18} className="mg-spin" /> তথ্য লোড হচ্ছে...
              </div>
            ) : reportData.transactions.length === 0 ? (
              <div className="mg-empty">
                <PackageX size={34} color="#8B968F" style={{ margin: "0 auto" }} />
                <h3>কোনো লেনদেন নেই</h3>
                <p>এই সময়সীমার মধ্যে কোনো বিক্রয় বা মজুদ সংযোজনের তথ্য পাওয়া যায়নি।</p>
              </div>
            ) : (
              <>
                {/* 1. Editable / Manageable History */}
                <div className="mg-panel-head">
                  <h3 className="mg-panel-title">
                    <Trash2 size={18} /> বিক্রয় হিস্ট্রি (মুছে ফেলার সুবিধা সহ)
                  </h3>
                </div>
                <div className="mg-list-head mg-tx-manage-head">
                  <span>ধরন</span>
                  <span>ঔষধ</span>
                  <span>পরিমাণ</span>
                  <span>স্টাফ</span>
                  <span>সময়</span>
                  <span>মূল্য</span>
                  <span>অ্যাকশন</span>
                </div>
                {reportData.transactions.map((tx) => (
                  <div key={"manage-" + tx.id} className="mg-row mg-tx-manage-row">
                    <div>
                      <span className={`mg-tx-badge ${tx.type}`}>{tx.type === "sell" ? "বিক্রয়" : "মজুদ যোগ"}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">ঔষধ</span>
                      <span className="mg-med-name" style={{ fontSize: 14 }}>{tx.medicineName}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">পরিমাণ</span>
                      <span className="mg-price">{toBn(tx.qty)}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">স্টাফ</span>
                      <span className="mg-batch">{tx.staffName || "—"}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">সময়</span>
                      <span className="mg-batch">{formatDateTimeBn(tx.timestamp)}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">মূল্য</span>
                      <span className="mg-price">{tx.type === "sell" ? `৳${toBn(tx.total)}` : "—"}</span>
                    </div>
                    <div className="mg-actions">
                      {deleteTxId === tx.id ? (
                        <div className="mg-confirm-row">
                          <span className="mg-confirm-text">মুছবেন?</span>
                          <button className="mg-confirm-btn" onClick={() => setDeleteTxId(null)}>না</button>
                          <button className="mg-confirm-btn yes" onClick={() => confirmDeleteTx(tx.id)}>হ্যাঁ</button>
                        </div>
                      ) : (
                        <button className="mg-icon-btn danger" onClick={() => setDeleteTxId(tx.id)} aria-label="হিস্ট্রি ডিলিট করুন">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* 2. Permanent / Protected History */}
                <div className="mg-panel-head" style={{ marginTop: 40 }}>
                  <h3 className="mg-panel-title">
                    <ShieldCheck size={18} /> স্থায়ী বিক্রয় হিস্ট্রি (অল-টাইম সেভড, মুছে ফেলা যাবে না)
                  </h3>
                </div>
                <div className="mg-list-head mg-tx-head">
                  <span>ধরন</span>
                  <span>ঔষধ</span>
                  <span>পরিমাণ</span>
                  <span>স্টাফ</span>
                  <span>সময়</span>
                  <span>মূল্য</span>
                </div>
                {reportData.transactions.map((tx) => (
                  <div key={"perm-" + tx.id} className="mg-row mg-tx-row">
                    <div>
                      <span className={`mg-tx-badge ${tx.type}`}>{tx.type === "sell" ? "বিক্রয়" : "মজুদ যোগ"}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">ঔষধ</span>
                      <span className="mg-med-name" style={{ fontSize: 14 }}>{tx.medicineName}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">পরিমাণ</span>
                      <span className="mg-price">{toBn(tx.qty)}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">স্টাফ</span>
                      <span className="mg-batch">{tx.staffName || "—"}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">সময়</span>
                      <span className="mg-batch">{formatDateTimeBn(tx.timestamp)}</span>
                    </div>
                    <div>
                      <span className="mg-cell-label">মূল্য</span>
                      <span className="mg-price">{tx.type === "sell" ? `৳${toBn(tx.total)}` : "—"}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {activeTab === "suppliers" && (
          <>
            {loading ? (
              <div className="mg-loading">
                <Loader2 size={18} className="mg-spin" /> তথ্য লোড হচ্ছে...
              </div>
            ) : suppliers.length === 0 ? (
              <div className="mg-empty">
                <PackageX size={34} color="#8B968F" style={{ margin: "0 auto" }} />
                <h3>এখনও কোনো সাপ্লায়ার যোগ করা হয়নি</h3>
                <p>ঔষধ কোথা থেকে আসছে তা মনে রাখতে সাপ্লায়ারের তথ্য যোগ করুন।</p>
                <button className="mg-add-btn" onClick={openAddSupplier} style={{ margin: "0 auto" }}>
                  <Plus size={17} /> নতুন সাপ্লায়ার
                </button>
              </div>
            ) : (
              <>
                <div className="mg-list-head mg-shead">
                  <span>নাম</span>
                  <span>ফোন</span>
                  <span>ঠিকানা</span>
                  <span>ঔষধ সংখ্যা</span>
                  <span></span>
                </div>
                {suppliers.map((s) => {
                  const count = medicines.filter((m) => m.supplierId === s.id).length;
                  return (
                    <div key={s.id} className="mg-row mg-srow">
                      <div>
                        <p className="mg-med-name">{s.name}</p>
                      </div>
                      <div>
                        <span className="mg-cell-label">ফোন</span>
                        <span className="mg-batch">{s.phone || "—"}</span>
                      </div>
                      <div>
                        <span className="mg-cell-label">ঠিকানা</span>
                        <span className="mg-batch">{s.address || "—"}</span>
                      </div>
                      <div>
                        <span className="mg-cell-label">ঔষধ সংখ্যা</span>
                        <span className="mg-price">{toBn(count)}</span>
                      </div>
                      <div className="mg-actions">
                        {supplierDeleteId === s.id ? (
                          <div className="mg-confirm-row">
                            <span className="mg-confirm-text">মুছে ফেলবেন?</span>
                            <button className="mg-confirm-btn" onClick={() => setSupplierDeleteId(null)}>না</button>
                            <button className="mg-confirm-btn yes" onClick={() => confirmDeleteSupplier(s.id)}>হ্যাঁ</button>
                          </div>
                        ) : (
                          <>
                            <button className="mg-icon-btn" onClick={() => openEditSupplier(s)} aria-label="সম্পাদনা">
                              <Pencil size={15} />
                            </button>
                            <button className="mg-icon-btn danger" onClick={() => setSupplierDeleteId(s.id)} aria-label="মুছুন">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {formOpen && (
        <div className="mg-overlay" onClick={closeForm}>
          <div className="mg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mg-modal-head">
              <h2>{form.id ? "ঔষধ সম্পাদনা" : "নতুন ঔষধ যোগ করুন"}</h2>
              <button className="mg-close-btn" onClick={closeForm} aria-label="বন্ধ করুন">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitForm}>
              {formError && (
                <div className="mg-form-error">
                  <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
                  {formError}
                </div>
              )}
              <div className="mg-field">
                <label>ঔষধের নাম</label>
                <input ref={nameInputRef} type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমনঃ নাপা এক্সট্রা" />
              </div>
              <div className="mg-field">
                <label>ক্যাটাগরি (ঐচ্ছিক)</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="যেমনঃ ব্যথানাশক" />
              </div>
              <div className="mg-field">
                <label>সাপ্লায়ার (ঐচ্ছিক)</label>
                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">নির্বাচন করুন</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="mg-field-row">
                <div className="mg-field">
                  <label>স্টক পরিমাণ</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="০" />
                </div>
                <div className="mg-field">
                  <label>একক</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mg-field-row-3">
                <div className="mg-field">
                  <label>ব্যাচ নং (ঐচ্ছিক)</label>
                  <input type="text" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} placeholder="যেমনঃ BX-2214" />
                </div>
                <div className="mg-field">
                  <label>বিক্রয়মূল্য/একক (৳)</label>
                  <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="০" />
                </div>
              </div>
              <div className="mg-field-row">
                <div className="mg-field">
                  <label>ক্রয়মূল্য/একক (৳, ঐচ্ছিক)</label>
                  <input type="number" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="০" />
                </div>
                <div className="mg-field">
                  <label>মেয়াদ শেষের তারিখ</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="mg-submit-btn">{form.id ? "পরিবর্তন সংরক্ষণ করুন" : "ঔষধ যোগ করুন"}</button>
            </form>
          </div>
        </div>
      )}

      {supplierFormOpen && (
        <div className="mg-overlay" onClick={closeSupplierForm}>
          <div className="mg-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="mg-modal-head">
              <h2>{supplierForm.id ? "সাপ্লায়ার সম্পাদনা" : "নতুন সাপ্লায়ার"}</h2>
              <button className="mg-close-btn" onClick={closeSupplierForm} aria-label="বন্ধ করুন">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitSupplierForm}>
              {supplierFormError && (
                <div className="mg-form-error">
                  <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
                  {supplierFormError}
                </div>
              )}
              <div className="mg-field">
                <label>সাপ্লায়ারের নাম</label>
                <input ref={supplierNameRef} type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} placeholder="যেমনঃ রহমান ফার্মা হাউস" />
              </div>
              <div className="mg-field">
                <label>ফোন নম্বর (ঐচ্ছিক)</label>
                <input type="text" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} placeholder="০১৭xxxxxxxx" />
              </div>
              <div className="mg-field">
                <label>ঠিকানা (ঐচ্ছিক)</label>
                <input type="text" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} placeholder="দোকান/এলাকার নাম" />
              </div>
              <button type="submit" className="mg-submit-btn">{supplierForm.id ? "পরিবর্তন সংরক্ষণ করুন" : "সাপ্লায়ার যোগ করুন"}</button>
            </form>
          </div>
        </div>
      )}

      {staffModalOpen && (
        <div className="mg-overlay" onClick={() => setStaffModalOpen(false)}>
          <div className="mg-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="mg-modal-head">
              <h2>স্টাফ নির্বাচন করুন</h2>
              <button className="mg-close-btn" onClick={() => setStaffModalOpen(false)} aria-label="বন্ধ করুন">
                <X size={20} />
              </button>
            </div>
            <div className="mg-staff-list">
              {staff.length === 0 && <p className="mg-empty-note">এখনও কোনো স্টাফ যোগ করা হয়নি।</p>}
              {staff.map((s) => (
                <div key={s.id} className={`mg-staff-item ${s.id === currentStaffId ? "active" : ""}`}>
                  <button
                    className="mg-staff-select"
                    onClick={() => {
                      setCurrentStaffId(s.id);
                      setStaffModalOpen(false);
                    }}
                  >
                    <User size={15} /> {s.name}
                  </button>
                  <button className="mg-icon-btn danger" onClick={() => removeStaff(s.id)} aria-label="মুছুন">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mg-staff-add">
              <input
                type="text"
                placeholder="স্টাফের নাম লিখুন"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStaff()}
              />
              <button className="mg-add-btn" style={{ padding: "9px 14px" }} onClick={addStaff}>
                <Plus size={15} /> যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}