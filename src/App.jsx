import "./index.css";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, TrendingUp, Plus, X, Pencil, Trash2, ArrowUpRight,
  ArrowDownRight, Wallet, Box, Receipt, BarChart3, ChevronRight,
  Calendar, Check
} from "lucide-react";

/* ----------------------------------------------------------------------
   MEU GIRO — controle pessoal de compra/revenda
   Paleta: fundo carvão quase-preto, verde-cifrão como acento único,
   tipografia condensada para números (peso do dado), regular pra label.
   Persistência: localStorage (dados ficam salvos no navegador/aparelho)
---------------------------------------------------------------------- */

const BRL = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayISO = () => new Date().toISOString().slice(0, 10);

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function useStorage(key, fallback) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch (e) {
      /* ignore parse errors, keep fallback */
    } finally {
      setLoaded(true);
    }
  }, [key]);

  const persist = useCallback((next) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.error("storage set failed", e);
    }
  }, [key]);

  return [value, persist, loaded];
}

function inPeriod(dateStr, period, customRange) {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  if (period === "hoje") {
    return dateStr === todayISO();
  }
  if (period === "semana") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (period === "mes") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === "ano") {
    return d.getFullYear() === now.getFullYear();
  }
  if (period === "custom" && customRange?.from && customRange?.to) {
    return dateStr >= customRange.from && dateStr <= customRange.to;
  }
  return true;
}

const PERIODS = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
];

/* ---------------------------- shell / nav ---------------------------- */

function TopBar({ tab }) {
  const titles = {
    inicio: "Início",
    estoque: "Estoque",
    vendas: "Vendas",
    relatorios: "Relatórios",
  };
  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-mark">$</span>
        <span className="brand-name">Meu Giro</span>
      </div>
      <div className="topbar-section">{titles[tab]}</div>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const items = [
    { key: "inicio", label: "Início", Icon: BarChart3 },
    { key: "estoque", label: "Estoque", Icon: Box },
    { key: "vendas", label: "Vendas", Icon: Receipt },
    { key: "relatorios", label: "Relatórios", Icon: TrendingUp },
  ];
  return (
    <nav className="tabbar">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={"tab" + (tab === key ? " tab-active" : "")}
          onClick={() => setTab(key)}
        >
          <Icon size={20} strokeWidth={tab === key ? 2.4 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------ dashboard ------------------------------ */

function Dashboard({ products, sales, period, setPeriod, goAdd }) {
  const soldInPeriod = sales.filter((s) => inPeriod(s.date, period));

  const lucroBruto = soldInPeriod.reduce((acc, s) => acc + (s.price - s.cost) * s.qty, 0);
  const totalVendido = soldInPeriod.reduce((acc, s) => acc + s.price * s.qty, 0);
  const custoVendido = soldInPeriod.reduce((acc, s) => acc + s.cost * s.qty, 0);
  const itensVendidos = soldInPeriod.reduce((acc, s) => acc + s.qty, 0);
  const roi = custoVendido > 0 ? (lucroBruto / custoVendido) * 100 : 0;

  const ativos = products.filter((p) => p.qty > 0);
  const itensAtivos = ativos.reduce((acc, p) => acc + p.qty, 0);
  const lucroPrevisto = ativos.reduce((acc, p) => acc + (p.price - p.cost) * p.qty, 0);

  const parados = products
    .filter((p) => p.qty > 0)
    .map((p) => {
      const days = Math.floor((Date.now() - new Date(p.addedAt).getTime()) / 86400000);
      return { ...p, days };
    })
    .filter((p) => p.days >= 30)
    .sort((a, b) => b.days - a.days);

  const distribuicao = useMemo(() => {
    const byCat = {};
    ativos.forEach((p) => {
      const key = p.category || "Outros";
      byCat[key] = (byCat[key] || 0) + p.qty * p.cost;
    });
    const total = Object.values(byCat).reduce((a, b) => a + b, 0);
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value, pct: total ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [ativos]);

  return (
    <div className="screen">
      <div className="period-row">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={"chip" + (period === p.key ? " chip-active" : "")}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="hero-card">
        <div className="hero-label">LUCRO BRUTO REALIZADO</div>
        <div className="hero-value">{BRL(lucroBruto)}</div>
        <div className="hero-foot">
          <div>
            <div className="hero-foot-label">VENDAS NO PERÍODO</div>
            <div className="hero-foot-value">{itensVendidos} {itensVendidos === 1 ? "item" : "itens"}</div>
          </div>
          <div className={"roi-pill" + (roi < 0 ? " roi-neg" : "")}>
            {roi >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            ROI {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="stat-card">
          <div className="stat-label">Total Vendido</div>
          <div className="stat-value">{BRL(totalVendido)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Lucro Previsto</div>
          <div className="stat-value stat-green">{BRL(lucroPrevisto)}</div>
          <div className="stat-sub">Lucro em estoque</div>
        </div>
      </div>

      <div className="row-card">
        <div className="row-card-left">
          <Package size={18} />
          <span>Ativos</span>
        </div>
        <div className="row-card-right">{itensAtivos} {itensAtivos === 1 ? "item" : "itens"}</div>
      </div>

      <div className="section">
        <div className="section-title">DISTRIBUIÇÃO ATIVA</div>
        {distribuicao.length === 0 ? (
          <div className="empty-block">
            <div className="empty-title">Nenhum dado disponível</div>
            <div className="empty-sub">Registre seus produtos para ver a distribuição</div>
          </div>
        ) : (
          <div className="dist-list">
            {distribuicao.map((d) => (
              <div key={d.name} className="dist-row">
                <div className="dist-row-top">
                  <span>{d.name}</span>
                  <span>{d.pct.toFixed(0)}%</span>
                </div>
                <div className="dist-bar">
                  <div className="dist-bar-fill" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-title">PRODUTOS PARADOS (30+ DIAS)</div>
        {parados.length === 0 ? (
          <div className="empty-block empty-block-good">
            <div className="empty-icon"><Check size={22} /></div>
            <div className="empty-title">Tudo em ordem!</div>
            <div className="empty-sub">Seus produtos estão girando bem, continue assim!</div>
          </div>
        ) : (
          <div className="parados-list">
            {parados.map((p) => (
              <div key={p.id} className="parado-row">
                <div>
                  <div className="parado-name">{p.name}</div>
                  <div className="parado-days">{p.days} dias parado</div>
                </div>
                <div className="parado-qty">{p.qty}x</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={goAdd} aria-label="Adicionar produto">
        <Plus size={26} strokeWidth={2.4} />
      </button>
    </div>
  );
}

/* ------------------------------- estoque ------------------------------- */

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { name: "", category: "", brand: "", model: "", cost: "", price: "", qty: "1", notes: "" }
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.cost === "" || form.price === "" || form.qty === "") return;
    onSave({
      ...form,
      cost: parseFloat(form.cost) || 0,
      price: parseFloat(form.price) || 0,
      qty: parseInt(form.qty) || 0,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{initial ? "Editar produto" : "Novo produto"}</span>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="form">
          <label className="field">
            <span>Nome do produto</span>
            <input value={form.name} onChange={set("name")} placeholder="Ex: Parafusadeira de impacto" autoFocus />
          </label>
          <label className="field">
            <span>Categoria</span>
            <input value={form.category} onChange={set("category")} placeholder="Ex: Ferramentas" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Marca</span>
              <input value={form.brand} onChange={set("brand")} placeholder="Ex: Bosch, JBL..." />
            </label>
            <label className="field">
              <span>Modelo</span>
              <input value={form.model} onChange={set("model")} placeholder="Ex: GSR 12V" />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Custo (unid.)</span>
              <input inputMode="decimal" value={form.cost} onChange={set("cost")} placeholder="0,00" />
            </label>
            <label className="field">
              <span>Preço de venda</span>
              <input inputMode="decimal" value={form.price} onChange={set("price")} placeholder="0,00" />
            </label>
          </div>
          <label className="field">
            <span>Quantidade em estoque</span>
            <input inputMode="numeric" value={form.qty} onChange={set("qty")} placeholder="1" />
          </label>
          <label className="field">
            <span>Observações (opcional)</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={set("notes")}
              placeholder="Informações adicionais sobre o produto..."
            />
          </label>
          <button type="submit" className="primary-btn">
            {initial ? "Salvar alterações" : "Adicionar ao estoque"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Estoque({ products, addProduct, updateProduct, removeProduct }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const save = (data) => {
    if (editing) {
      updateProduct({ ...editing, ...data });
    } else {
      addProduct({ id: uid(), addedAt: new Date().toISOString(), ...data });
    }
    setShowForm(false);
    setEditing(null);
  };

  const ativos = products.filter((p) => p.qty > 0);
  const valorEstoque = ativos.reduce((acc, p) => acc + p.cost * p.qty, 0);

  return (
    <div className="screen">
      <div className="stat-card" style={{ marginBottom: 16 }}>
        <div className="stat-label">Valor investido em estoque</div>
        <div className="stat-value">{BRL(valorEstoque)}</div>
        <div className="stat-sub">{ativos.reduce((a, p) => a + p.qty, 0)} itens em {ativos.length} produtos</div>
      </div>

      {products.length === 0 ? (
        <div className="empty-block">
          <Box size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
          <div className="empty-title">Estoque vazio</div>
          <div className="empty-sub">Adicione seu primeiro produto para começar a girar</div>
        </div>
      ) : (
        <div className="list">
          {products.map((p) => (
            <div key={p.id} className="product-row">
              <div className="product-row-main">
                <div className="product-name">{p.name}</div>
                <div className="product-meta">
                  {[p.category, p.brand, p.model].filter(Boolean).join(" · ") || "Sem categoria"} · {p.qty} {p.qty === 1 ? "unid." : "unids."}
                </div>
                <div className="product-margin">
                  Custo {BRL(p.cost)} → Venda {BRL(p.price)}
                  <span className="margin-pill">+{BRL(p.price - p.cost)}</span>
                </div>
              </div>
              <div className="product-row-actions">
                <button className="icon-btn" onClick={() => { setEditing(p); setShowForm(true); }}>
                  <Pencil size={16} />
                </button>
                <button className="icon-btn icon-btn-danger" onClick={() => removeProduct(p.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => { setEditing(null); setShowForm(true); }}>
        <Plus size={26} strokeWidth={2.4} />
      </button>

      {showForm && (
        <ProductForm
          initial={editing}
          onSave={save}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

/* -------------------------------- vendas -------------------------------- */

function SaleForm({ products, onSave, onClose }) {
  const available = products.filter((p) => p.qty > 0);
  const [productId, setProductId] = useState(available[0]?.id || "");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());

  const product = available.find((p) => p.id === productId);

  useEffect(() => {
    if (product) setPrice(String(product.price));
  }, [productId]);

  const submit = (e) => {
    e.preventDefault();
    if (!product) return;
    const q = Math.min(parseInt(qty) || 0, product.qty);
    if (q <= 0) return;
    onSave({
      id: uid(),
      productId: product.id,
      name: product.name,
      cost: product.cost,
      price: parseFloat(price) || 0,
      qty: q,
      date,
    });
  };

  if (available.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <span>Registrar venda</span>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="empty-block">
            <div className="empty-title">Nenhum produto em estoque</div>
            <div className="empty-sub">Adicione produtos no Estoque antes de registrar vendas</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Registrar venda</span>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="form">
          <label className="field">
            <span>Produto</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.qty} disp.)</option>
              ))}
            </select>
          </label>
          <div className="field-row">
            <label className="field">
              <span>Quantidade</span>
              <input
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                max={product?.qty}
              />
            </label>
            <label className="field">
              <span>Preço de venda (unid.)</span>
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>Data</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {product && (
            <div className="preview-profit">
              Lucro nesta venda: <strong>{BRL((parseFloat(price || 0) - product.cost) * (parseInt(qty) || 0))}</strong>
            </div>
          )}
          <button type="submit" className="primary-btn">Confirmar venda</button>
        </form>
      </div>
    </div>
  );
}

function Vendas({ products, sales, addSale, removeSale }) {
  const [showForm, setShowForm] = useState(false);

  const sorted = [...sales].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalMes = sales
    .filter((s) => inPeriod(s.date, "mes"))
    .reduce((acc, s) => acc + s.price * s.qty, 0);

  return (
    <div className="screen">
      <div className="stat-card" style={{ marginBottom: 16 }}>
        <div className="stat-label">Vendido este mês</div>
        <div className="stat-value">{BRL(totalMes)}</div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-block">
          <Receipt size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
          <div className="empty-title">Nenhuma venda registrada</div>
          <div className="empty-sub">Toque no + para registrar sua primeira venda</div>
        </div>
      ) : (
        <div className="list">
          {sorted.map((s) => {
            const lucro = (s.price - s.cost) * s.qty;
            return (
              <div key={s.id} className="sale-row">
                <div className="sale-row-main">
                  <div className="product-name">{s.name}</div>
                  <div className="product-meta">
                    <Calendar size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                    {new Date(s.date + "T00:00:00").toLocaleDateString("pt-BR")} · {s.qty}x {BRL(s.price)}
                  </div>
                </div>
                <div className="sale-row-right">
                  <div className={"sale-profit" + (lucro < 0 ? " sale-profit-neg" : "")}>
                    {lucro >= 0 ? "+" : ""}{BRL(lucro)}
                  </div>
                  <button className="icon-btn icon-btn-danger" onClick={() => removeSale(s)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="fab" onClick={() => setShowForm(true)}>
        <Plus size={26} strokeWidth={2.4} />
      </button>

      {showForm && (
        <SaleForm
          products={products}
          onSave={(sale) => { addSale(sale); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------ relatorios ------------------------------ */

function Relatorios({ sales }) {
  const byMonth = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const key = s.date.slice(0, 7);
      if (!map[key]) map[key] = { vendido: 0, lucro: 0, itens: 0 };
      map[key].vendido += s.price * s.qty;
      map[key].lucro += (s.price - s.cost) * s.qty;
      map[key].itens += s.qty;
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [sales]);

  const maxLucro = Math.max(1, ...byMonth.map(([, v]) => v.lucro));

  const monthLabel = (key) => {
    const [y, m] = key.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
  };

  return (
    <div className="screen">
      {byMonth.length === 0 ? (
        <div className="empty-block">
          <TrendingUp size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
          <div className="empty-title">Sem dados ainda</div>
          <div className="empty-sub">Registre vendas para ver seus relatórios mensais</div>
        </div>
      ) : (
        <div className="section">
          <div className="section-title">LUCRO POR MÊS</div>
          <div className="report-list">
            {byMonth.map(([key, v]) => (
              <div key={key} className="report-row">
                <div className="report-row-top">
                  <span className="report-month">{monthLabel(key)}</span>
                  <span className={"report-lucro" + (v.lucro < 0 ? " sale-profit-neg" : "")}>
                    {v.lucro >= 0 ? "+" : ""}{BRL(v.lucro)}
                  </span>
                </div>
                <div className="dist-bar">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${Math.max(4, (Math.abs(v.lucro) / maxLucro) * 100)}%` }}
                  />
                </div>
                <div className="report-row-sub">
                  {v.itens} itens vendidos · {BRL(v.vendido)} em vendas
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- app --------------------------------- */

export default function App() {
  const [tab, setTab] = useState("inicio");
  const [period, setPeriod] = useState("mes");
  const [products, setProducts, productsLoaded] = useStorage("giro:products", []);
  const [sales, setSales, salesLoaded] = useStorage("giro:sales", []);

  const addProduct = (p) => setProducts([...products, p]);
  const updateProduct = (p) => setProducts(products.map((x) => (x.id === p.id ? p : x)));
  const removeProduct = (id) => setProducts(products.filter((x) => x.id !== id));

  const addSale = (sale) => {
    setSales([...sales, sale]);
    const prod = products.find((p) => p.id === sale.productId);
    if (prod) {
      updateProduct({ ...prod, qty: Math.max(0, prod.qty - sale.qty) });
    }
  };

  const removeSale = (sale) => {
    setSales(sales.filter((s) => s.id !== sale.id));
    const prod = products.find((p) => p.id === sale.productId);
    if (prod) updateProduct({ ...prod, qty: prod.qty + sale.qty });
  };

  const ready = productsLoaded && salesLoaded;

  return (
    <div className="app-root">
      <style>{CSS}</style>
      <TopBar tab={tab} />
      <main className="main">
        {!ready ? (
          <div className="screen"><div className="empty-block">Carregando…</div></div>
        ) : tab === "inicio" ? (
          <Dashboard products={products} sales={sales} period={period} setPeriod={setPeriod} goAdd={() => setTab("estoque")} />
        ) : tab === "estoque" ? (
          <Estoque products={products} addProduct={addProduct} updateProduct={updateProduct} removeProduct={removeProduct} />
        ) : tab === "vendas" ? (
          <Vendas products={products} sales={sales} addSale={addSale} removeSale={removeSale} />
        ) : (
          <Relatorios sales={sales} />
        )}
      </main>
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

/* --------------------------------- styles -------------------------------- */

const CSS = `
:root {
  --bg: #0a0f0c;
  --bg-card: #10171311;
  --surface: #131c16;
  --surface-2: #1a2620;
  --line: #223028;
  --green: #3ddc6f;
  --green-dim: #2a9650;
  --text: #eef5f0;
  --text-dim: #8aa396;
  --text-faint: #5c7268;
  --danger: #e0654f;
  --radius: 18px;
}

* { box-sizing: border-box; }

.app-root {
  background: var(--bg);
  background-image: radial-gradient(circle at 50% 0%, #11241a 0%, #0a0f0c 55%);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line);
}

.brand { display: flex; align-items: center; gap: 8px; }
.brand-mark {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(160deg, #4fe085, #1f8c4a);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; color: #06140a;
  font-size: 15px;
}
.brand-name { font-weight: 700; font-size: 17px; letter-spacing: -0.01em; }
.topbar-section { color: var(--text-dim); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

.main { flex: 1; overflow-y: auto; padding-bottom: 100px; }
.screen { padding: 18px 16px 24px; position: relative; min-height: calc(100vh - 140px); }

.period-row { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; }
.chip {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--text-dim);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.chip-active { background: var(--green); color: #06180c; border-color: var(--green); }

.hero-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 14px;
}
.hero-label { font-size: 11px; letter-spacing: 0.08em; color: var(--text-faint); font-weight: 700; margin-bottom: 8px; }
.hero-value { font-size: 38px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; margin-bottom: 16px; }
.hero-foot { display: flex; align-items: center; justify-content: space-between; }
.hero-foot-label { font-size: 10px; color: var(--text-faint); letter-spacing: 0.06em; font-weight: 700; margin-bottom: 2px; }
.hero-foot-value { font-size: 14px; font-weight: 600; }
.roi-pill {
  display: flex; align-items: center; gap: 4px;
  background: rgba(61,220,111,0.12);
  color: var(--green);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.roi-neg { background: rgba(224,101,79,0.12); color: var(--danger); }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; }
.stat-label { font-size: 12px; color: var(--text-dim); font-weight: 600; margin-bottom: 6px; }
.stat-value { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.stat-green { color: var(--green); }
.stat-sub { font-size: 12px; color: var(--text-faint); margin-top: 4px; }

.row-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px 18px;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 22px;
}
.row-card-left { display: flex; align-items: center; gap: 10px; color: var(--text-dim); font-weight: 600; font-size: 14px; }
.row-card-right { font-weight: 700; }

.section { margin-bottom: 24px; }
.section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.07em; color: var(--text-dim); margin-bottom: 10px; }

.empty-block {
  background: var(--surface);
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  padding: 28px 20px;
  text-align: center;
  color: var(--text-dim);
}
.empty-block-good { border-style: solid; }
.empty-icon { color: var(--green); margin-bottom: 6px; }
.empty-title { font-weight: 700; color: var(--text); margin-bottom: 4px; }
.empty-sub { font-size: 13px; color: var(--text-faint); }

.dist-list { display: flex; flex-direction: column; gap: 14px; }
.dist-row-top { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.dist-bar { height: 6px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
.dist-bar-fill { height: 100%; background: linear-gradient(90deg, var(--green-dim), var(--green)); border-radius: 4px; }

.parados-list { display: flex; flex-direction: column; gap: 8px; }
.parado-row {
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
}
.parado-name { font-weight: 600; font-size: 14px; }
.parado-days { font-size: 12px; color: var(--danger); margin-top: 2px; }
.parado-qty { font-weight: 700; color: var(--text-dim); }

.fab {
  position: fixed;
  bottom: 88px;
  right: calc(50% - 240px + 20px);
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--green);
  color: #06180c;
  border: none;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(61,220,111,0.35);
  cursor: pointer;
}
@media (max-width: 480px) {
  .fab { right: 20px; }
}

.tabbar {
  display: flex;
  border-top: 1px solid var(--line);
  background: #0c1310;
  padding: 10px 0 max(10px, env(safe-area-inset-bottom));
  position: sticky;
  bottom: 0;
}
.tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: none; border: none; color: var(--text-faint);
  font-size: 11px; font-weight: 600;
  padding: 4px 0;
  cursor: pointer;
}
.tab-active { color: var(--green); }

.list { display: flex; flex-direction: column; gap: 10px; }
.product-row, .sale-row {
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 10px;
}
.product-row-main, .sale-row-main { flex: 1; min-width: 0; }
.product-name { font-weight: 700; font-size: 14px; }
.product-meta { font-size: 12px; color: var(--text-dim); margin-top: 3px; }
.product-margin { font-size: 12px; color: var(--text-faint); margin-top: 6px; display: flex; align-items: center; gap: 8px; }
.margin-pill { background: rgba(61,220,111,0.12); color: var(--green); padding: 2px 8px; border-radius: 999px; font-weight: 700; }
.product-row-actions { display: flex; gap: 6px; }

.sale-row-right { display: flex; align-items: center; gap: 10px; }
.sale-profit { font-weight: 700; color: var(--green); }
.sale-profit-neg { color: var(--danger); }

.icon-btn {
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text-dim);
  border-radius: 10px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.icon-btn-danger:hover { color: var(--danger); }

.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(4,8,6,0.7);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 50;
}
.modal {
  background: #0e1612;
  border-top: 1px solid var(--line);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 480px;
  padding: 20px 18px 28px;
  max-height: 88vh;
  overflow-y: auto;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 700; font-size: 16px; margin-bottom: 18px;
}

.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-dim); font-weight: 600; }
.field-row { display: flex; gap: 12px; }
.field-row .field { flex: 1; }
.field input, .field select {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  color: var(--text);
  font-size: 15px;
  font-family: inherit;
}
.field input:focus, .field select:focus { outline: none; border-color: var(--green); }
.field textarea {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}
.field textarea:focus { outline: none; border-color: var(--green); }

.preview-profit {
  background: rgba(61,220,111,0.08);
  border: 1px solid rgba(61,220,111,0.25);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-dim);
}
.preview-profit strong { color: var(--green); }

.primary-btn {
  background: var(--green);
  color: #06180c;
  border: none;
  border-radius: 14px;
  padding: 15px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  margin-top: 4px;
}

.report-list { display: flex; flex-direction: column; gap: 16px; }
.report-row { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
.report-row-top { display: flex; justify-content: space-between; margin-bottom: 8px; }
.report-month { font-weight: 700; text-transform: capitalize; }
.report-lucro { font-weight: 700; color: var(--green); }
.report-row-sub { font-size: 12px; color: var(--text-faint); margin-top: 6px; }
`;

