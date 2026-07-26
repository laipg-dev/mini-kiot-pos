import { state, getCartSubtotal, getCartTotal, getVariantLabel, attributesToText, getProductTotalStock, getProductMinPrice } from "./state.js";

let growthChartInstance = null;
let categoryChartInstance = null;

export function qs(selector) { return document.querySelector(selector); }
export function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }

export function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function formatNumber(value) { return Number(value || 0).toLocaleString("vi-VN"); }
export function formatPercent(value) { return `${(Number(value || 0) * 100).toFixed(1)}%`; }

export function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function showToast(message, type = "default") {
  const toast = qs("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden", "bg-slate-900", "bg-red-600", "bg-emerald-600");
  toast.classList.add(type === "error" ? "bg-red-600" : type === "success" ? "bg-emerald-600" : "bg-slate-900");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 3800);
}

export function setConnectionStatus(text, type = "muted") {
  ["#connectionStatus", "#mobileConnectionStatus"].forEach((selector) => {
    const el = qs(selector);
    if (!el) return;
    el.textContent = text;
    el.classList.remove("text-slate-300", "text-slate-500", "text-emerald-600", "text-red-600", "text-emerald-400", "text-red-400");
    if (type === "success") el.classList.add(selector === "#connectionStatus" ? "text-emerald-400" : "text-emerald-600");
    else if (type === "error") el.classList.add(selector === "#connectionStatus" ? "text-red-400" : "text-red-600");
    else el.classList.add(selector === "#connectionStatus" ? "text-slate-300" : "text-slate-500");
  });
}

export function showView(viewName) {
  const views = ["Dashboard", "Products", "Categories", "POS", "Orders", "History", "Settings"];
  const titles = { Dashboard: "Báo cáo", Products: "Hàng hóa", Categories: "Danh mục", POS: "Bán hàng POS", Orders: "Đơn hàng", History: "Lịch sử", Settings: "Cài đặt" };
  for (const view of views) {
    const section = qs(`#view${view}`);
    if (section) section.classList.toggle("hidden", view !== viewName);
  }
  const pageTitle = qs("#pageTitle");
  if (pageTitle) pageTitle.textContent = titles[viewName] || viewName;
  qsa(".nav-btn").forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("bg-white/10", active);
    button.classList.toggle("text-white", active && !button.closest("nav")?.classList.contains("lg:hidden"));
    button.classList.toggle("text-blue-600", active && button.closest("nav")?.classList.contains("lg:hidden"));
    button.classList.toggle("text-slate-500", !active && button.closest("nav")?.classList.contains("lg:hidden"));
    button.classList.toggle("text-slate-300", !active && !button.closest("nav")?.classList.contains("lg:hidden"));
  });
}

export function renderCategoryOptions(categories) {
  ["#productCategory", "#productCategoryFilter", "#posCategoryFilter"].forEach((selector) => {
    const select = qs(selector);
    if (!select) return;
    const first = selector === "#productCategory" ? "Chưa chọn danh mục" : "Tất cả danh mục";
    const current = select.value;
    select.innerHTML = [`<option value="">${first}</option>`, ...categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)].join("");
    select.value = current;
  });
  renderCategoryManager(categories);
}

export function renderCategoryManager(categories = []) {
  const list = qs("#categoryManageList");
  const summary = qs("#categorySummary");
  if (!list) return;
  if (summary) summary.textContent = `${formatNumber(categories.length)} danh mục`;
  if (!categories.length) {
    list.innerHTML = emptyBlock("Chưa có danh mục", "Hãy thêm danh mục đầu tiên để phân loại hàng hóa rõ ràng hơn.");
    return;
  }
  const productCountMap = new Map();
  for (const product of state.products || []) {
    if (!product.category_id) continue;
    productCountMap.set(product.category_id, (productCountMap.get(product.category_id) || 0) + 1);
  }
  list.innerHTML = categories.map((category) => {
    const count = productCountMap.get(category.id) || 0;
    return `
      <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div class="min-w-0 flex items-start gap-3">
            <div class="h-11 w-11 shrink-0 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">🏷️</div>
            <div class="min-w-0">
              <h5 class="font-black text-slate-950 truncate">${escapeHtml(category.name || "Chưa đặt tên")}</h5>
              <p class="mt-1 text-xs text-slate-500">Tạo lúc ${formatDateTime(category.created_at)}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 lg:justify-end">
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">${formatNumber(count)} sản phẩm</span>
            <button data-edit-category="${category.id}" class="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Sửa</button>
            <button data-delete-category="${category.id}" class="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Xóa</button>
          </div>
        </div>
      </article>`;
  }).join("");
}


export function renderProducts(products) {
  const list = qs("#productList");
  if (!list) return;
  const summary = qs("#productResultSummary");
  if (summary) {
    const stockTotal = products.reduce((sum, product) => sum + getProductTotalStock(product), 0);
    summary.textContent = `${formatNumber(products.length)} sản phẩm, tổng tồn ${formatNumber(stockTotal)}.`;
  }
  if (!products.length) {
    list.innerHTML = emptyBlock("Chưa có hàng hóa", "Hãy thêm sản phẩm đầu tiên hoặc import từ file Excel.");
    return;
  }
  list.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Sản phẩm</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Mã / SKU</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Danh mục</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Giá bán</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Giá vốn</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Tồn kho</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">${products.map(renderProductTableRow).join("")}</tbody>
      </table>
    </div>`;
}

function renderProductTableRow(product) {
  const totalStock = getProductTotalStock(product);
  const firstVariant = (product.product_variants || [])[0] || {};
  const image = product.image_url || placeholderImage(product.name);
  return `
    <tr class="hover:bg-slate-50 align-top">
      <td class="px-4 py-4 min-w-80">
        <div class="flex items-center gap-3">
          <img src="${image}" alt="${escapeHtml(product.name)}" class="h-14 w-14 rounded-2xl object-cover bg-slate-100" />
          <div class="min-w-0">
            <p class="font-bold text-slate-900 truncate">${escapeHtml(product.name)}</p>
            ${product.description ? `<p class="mt-1 text-xs text-slate-400 line-clamp-1">${escapeHtml(product.description)}</p>` : ""}
          </div>
        </div>
      </td>
      <td class="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
        <p class="font-semibold">${escapeHtml(product.product_code || product.sku || "-")}</p>
        <p class="text-xs text-slate-400">SKU: ${escapeHtml(product.sku || "-")}</p>
      </td>
      <td class="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">${escapeHtml(product.categories?.name || "Chưa phân loại")}</span>
      </td>
      <td class="px-4 py-4 text-right font-bold text-blue-600 whitespace-nowrap">${formatCurrency(firstVariant.sale_price || getProductMinPrice(product))}</td>
      <td class="px-4 py-4 text-right text-slate-600 whitespace-nowrap">${formatCurrency(firstVariant.cost_price)}</td>
      <td class="px-4 py-4 text-right whitespace-nowrap"><span class="inline-flex rounded-full ${totalStock > 5 ? "bg-emerald-50 text-emerald-700" : totalStock > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"} px-3 py-1 text-xs font-bold">${formatNumber(totalStock)}</span></td>
      <td class="px-4 py-4 text-right whitespace-nowrap">
        <div class="inline-flex gap-2">
          <button data-edit-product="${product.id}" class="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Sửa</button>
          <button data-delete-product="${product.id}" class="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Xóa</button>
        </div>
      </td>
    </tr>`;
}

export function renderPosProducts(products) {
  const list = qs("#posProductList");
  if (!list) return;
  const cards = [];
  for (const product of products) for (const variant of product.product_variants || []) cards.push(renderPosProductCard(product, variant));
  list.innerHTML = cards.length ? cards.join("") : `<div class="col-span-full">${emptyBlock("Không có sản phẩm để bán", "Hãy thêm hàng hóa, import Excel hoặc kiểm tra bộ lọc.")}</div>`;
}

function renderPosProductCard(product, variant) {
  const variantLabel = getVariantLabel(variant);
  const disabled = Number(variant.stock_qty || 0) <= 0;
  const image = product.image_url || placeholderImage(product.name);
  return `
    <button data-add-cart="${variant.id}" class="group text-left rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.99]"}" ${disabled ? "disabled" : ""}>
      <div class="aspect-[4/3] bg-slate-100 overflow-hidden"><img src="${image}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover group-hover:scale-105 transition" /></div>
      <div class="p-4"><p class="text-[11px] text-slate-400 uppercase">${escapeHtml(product.categories?.name || "Chưa phân loại")}</p><h3 class="text-sm font-bold line-clamp-2 min-h-10">${escapeHtml(product.name)}</h3><div class="mt-3 flex items-center justify-between gap-2"><span class="text-sm font-black text-blue-600">${formatCurrency(variant.sale_price)}</span><span class="text-xs rounded-full bg-slate-100 px-2 py-1 text-slate-600">Tồn ${formatNumber(variant.stock_qty)}</span></div></div>
    </button>`;
}

export function renderCart(discount = 0) {
  const container = qs("#cartItems");
  const subtotalEl = qs("#cartSubtotal");
  const totalEl = qs("#cartTotal");
  const checkoutBtn = qs("#btnCheckout");
  if (!container || !subtotalEl || !totalEl) return;
  container.innerHTML = state.cart.length ? state.cart.map(renderCartItem).join("") : emptyBlock("Giỏ hàng trống", "Chọn sản phẩm để bắt đầu bán hàng.");
  subtotalEl.textContent = formatCurrency(getCartSubtotal());
  totalEl.textContent = formatCurrency(getCartTotal(discount));
  if (checkoutBtn) checkoutBtn.disabled = !state.cart.length;
}

function renderCartItem(item) {
  return `
    <div class="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <img src="${item.image_url || placeholderImage(item.product_name)}" alt="${escapeHtml(item.product_name)}" class="h-12 w-12 rounded-xl object-cover bg-slate-100" />
      <div class="flex-1 min-w-0"><p class="text-sm font-bold truncate">${escapeHtml(item.product_name)}</p><p class="text-xs text-slate-500">${item.variant_label && item.variant_label !== "Mặc định" ? escapeHtml(item.variant_label) + " · " : ""}${formatCurrency(item.sale_price)}</p></div>
      <input data-cart-qty="${item.variant_id}" type="number" min="1" max="${item.stock_qty}" value="${item.quantity}" class="w-16 rounded-xl border border-slate-300 px-2 py-2 text-center text-sm outline-none focus:border-blue-500" />
      <button data-remove-cart="${item.variant_id}" class="rounded-xl bg-red-50 px-2 py-2 text-sm font-bold text-red-600">✕</button>
    </div>`;
}

export function renderOrders(orders) {
  const list = qs("#orderList");
  if (!list) return;
  list.innerHTML = orders.length ? orders.map(renderOrderCard).join("") : emptyBlock("Chưa có đơn hàng", "Các hóa đơn mới hoặc đơn import sẽ hiển thị tại đây.");
}

function renderOrderCard(order) {
  const badge = getOrderBadge(order.status);
  const items = order.order_items || [];
  const revenue = Number(order.total || 0);
  const cost = Number(order.total_cost || 0);
  const profit = Number(order.gross_profit ?? (revenue - cost));
  const margin = revenue > 0 ? profit / revenue : 0;
  const isCompleted = order.status === "completed";
  const profitLabel = isCompleted ? "Lợi nhuận" : "Lợi nhuận trước hủy/trả";

  return `
    <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div class="flex items-start justify-between gap-3"><div><h3 class="font-black text-slate-950">${escapeHtml(order.code)}</h3><p class="text-xs text-slate-500">${formatDateTime(order.created_at)}</p><p class="text-xs text-slate-500">${escapeHtml(order.customer_name || "Khách lẻ")} ${order.customer_phone ? `· ${escapeHtml(order.customer_phone)}` : ""}</p>${order.customer_address ? `<p class="mt-1 text-xs text-slate-500">📍 ${escapeHtml(order.customer_address)}</p>` : ""}</div><span class="rounded-full px-3 py-1 text-xs font-bold ${badge.className}">${badge.label}</span></div>
      <div class="space-y-2 max-h-44 overflow-y-auto pr-1">${items.map((item) => `<div class="flex justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm"><span class="text-slate-600 truncate">${escapeHtml(item.product_name)} <span class="text-slate-400">${item.variant_label && item.variant_label !== "Mặc định" ? escapeHtml(item.variant_label) + " " : ""}x${item.quantity}</span></span><span class="font-semibold whitespace-nowrap">${formatCurrency(item.line_total)}</span></div>`).join("")}</div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-200 pt-4">
        <div class="rounded-2xl bg-blue-50 p-3">
          <p class="text-xs text-slate-500">Doanh thu</p>
          <p class="mt-1 font-black text-blue-700">${formatCurrency(revenue)}</p>
        </div>
        <div class="rounded-2xl bg-orange-50 p-3">
          <p class="text-xs text-slate-500">Giá vốn</p>
          <p class="mt-1 font-black text-orange-700">${formatCurrency(cost)}</p>
        </div>
        <div class="rounded-2xl ${isCompleted ? "bg-emerald-50" : "bg-slate-100"} p-3">
          <p class="text-xs text-slate-500">${profitLabel}</p>
          <p class="mt-1 font-black ${isCompleted ? "text-emerald-700" : "text-slate-500"}">${formatCurrency(profit)}</p>
        </div>
        <div class="rounded-2xl bg-violet-50 p-3">
          <p class="text-xs text-slate-500">Biên lợi nhuận</p>
          <p class="mt-1 font-black text-violet-700">${formatPercent(margin)}</p>
        </div>
      </div>

      ${!isCompleted ? `<p class="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Đơn đã ${order.status === "returned" ? "trả hàng" : "hủy"}, nên doanh thu và lợi nhuận này không được ghi nhận vào báo cáo.</p>` : ""}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><p class="text-xs text-slate-500">Tổng thanh toán</p><p class="text-lg font-black text-blue-600">${formatCurrency(order.total)}</p></div>
        ${isCompleted ? `<div class="flex flex-wrap gap-2"><button data-edit-order="${order.id}" class="rounded-2xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Sửa</button><button data-return-order="${order.id}" class="rounded-2xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-100">Trả hàng</button></div>` : ""}
      </div>
    </article>`;
}

function getOrderBadge(status) {
  if (status === "completed") return { label: "Hoàn thành", className: "bg-emerald-50 text-emerald-700" };
  if (status === "cancelled") return { label: "Đã hủy", className: "bg-red-50 text-red-700" };
  if (status === "returned") return { label: "Trả hàng", className: "bg-amber-50 text-amber-700" };
  return { label: status || "Không rõ", className: "bg-slate-100 text-slate-600" };
}

export function renderDashboard(report, chartData, products = [], activityLogs = []) {
  setText("#statRevenue", formatCurrency(report?.revenue || 0));
  setText("#statProfit", formatCurrency(report?.grossProfit || 0));
  setText("#statCost", formatCurrency(report?.cost || 0));
  setText("#statOrderCount", formatNumber(report?.orderCount || 0));
  setText("#statMargin", formatPercent(report?.margin || 0));
  setText("#statAov", formatCurrency(report?.aov || 0));
  setText("#statSoldQty", formatNumber(report?.soldQty || 0));
  setText("#statReturnCancel", formatNumber(Number(report?.cancelledCount || 0) + Number(report?.returnedCount || 0)));
  const inventorySummary = calculateInventoryValue(products);
  setText("#statInventoryValue", formatCurrency(inventorySummary.costValue));
  setText("#statInventoryQty", `${formatNumber(inventorySummary.quantity)} sản phẩm theo giá vốn`);
  renderGrowthChart(chartData || []);
  renderCategoryChart(buildCategoryBreakdown(report?.completed || []));
  renderTopProducts(report?.completed || []);
  renderLowStock(products);
  renderRecentActivity(activityLogs.slice(0, 6));
}

function calculateInventoryValue(products = []) {
  return products.reduce((summary, product) => {
    for (const variant of product.product_variants || []) {
      const quantity = Math.max(0, Number(variant.stock_qty || 0));
      const costPrice = Math.max(0, Number(variant.cost_price || 0));
      summary.quantity += quantity;
      summary.costValue += quantity * costPrice;
    }
    return summary;
  }, { quantity: 0, costValue: 0 });
}

function setText(selector, value) { const el = qs(selector); if (el) el.textContent = value; }

function buildCategoryBreakdown(orders) {
  const map = new Map();
  for (const order of orders) for (const item of order.order_items || []) {
    const key = item.category_name || "Chưa phân loại";
    map.set(key, (map.get(key) || 0) + Number(item.line_total || 0));
  }
  return Array.from(map.entries()).map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

function renderTopProducts(orders) {
  const map = new Map();
  for (const order of orders) for (const item of order.order_items || []) {
    const key = `${item.product_name} ${item.variant_label || ""}`.trim();
    if (!map.has(key)) map.set(key, { name: key, qty: 0, revenue: 0 });
    const current = map.get(key);
    current.qty += Number(item.quantity || 0);
    current.revenue += Number(item.line_total || 0);
  }
  const items = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const box = qs("#topProductsList");
  if (!box) return;
  box.innerHTML = items.length ? items.map((item, index) => `<div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div><p class="text-sm font-bold">${index + 1}. ${escapeHtml(item.name)}</p><p class="text-xs text-slate-500">Đã bán ${formatNumber(item.qty)}</p></div><span class="font-bold text-blue-600">${formatCurrency(item.revenue)}</span></div>`).join("") : emptySmall("Chưa có dữ liệu bán hàng.");
}

function renderLowStock(products) {
  const items = products.flatMap((product) => (product.product_variants || []).map((variant) => ({ product, variant }))).filter(({ variant }) => Number(variant.stock_qty || 0) <= 5).sort((a, b) => Number(a.variant.stock_qty || 0) - Number(b.variant.stock_qty || 0)).slice(0, 8);
  const box = qs("#lowStockList");
  if (!box) return;
  box.innerHTML = items.length ? items.map(({ product, variant }) => `<div class="flex items-center justify-between gap-3 rounded-2xl ${Number(variant.stock_qty || 0) <= 0 ? "bg-red-50" : "bg-amber-50"} p-3"><div><p class="text-sm font-bold">${escapeHtml(product.name)}</p><p class="text-xs text-slate-500">${escapeHtml(getVariantLabel(variant))}</p></div><span class="font-bold ${Number(variant.stock_qty || 0) <= 0 ? "text-red-600" : "text-amber-600"}">${formatNumber(variant.stock_qty)}</span></div>`).join("") : emptySmall("Không có hàng sắp hết.");
}

function renderRecentActivity(activityLogs) {
  const box = qs("#recentActivityList");
  if (!box) return;
  box.innerHTML = activityLogs.length ? activityLogs.map((item) => `<div class="rounded-2xl bg-slate-50 p-3"><p class="text-sm font-bold">${escapeHtml(actionLabel(item.action))}</p><p class="text-xs text-slate-500">${escapeHtml(item.description || item.code || "")}</p><p class="text-[11px] text-slate-400 mt-1">${formatDateTime(item.created_at)}</p></div>`).join("") : emptySmall("Chưa có lịch sử hoạt động.");
}

function renderGrowthChart(chartData) {
  const canvas = qs("#growthChart");
  if (!canvas || typeof Chart === "undefined") return;
  if (growthChartInstance) growthChartInstance.destroy();
  growthChartInstance = new Chart(canvas, {
    type: "line",
    data: { labels: chartData.map((item) => item.date), datasets: [{ label: "Doanh thu", data: chartData.map((item) => item.revenue), tension: 0.35 }, { label: "Lợi nhuận", data: chartData.map((item) => item.grossProfit), tension: 0.35 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}` } } }, scales: { y: { ticks: { callback: (value) => new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value) } } } },
  });
}

function renderCategoryChart(data) {
  const canvas = qs("#categoryChart");
  if (!canvas || typeof Chart === "undefined") return;
  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(canvas, {
    type: "bar",
    data: { labels: data.map((item) => item.category), datasets: [{ label: "Doanh thu", data: data.map((item) => item.revenue) }] },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatCurrency(context.raw) } } }, scales: { x: { ticks: { callback: (value) => new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value) } } } },
  });
}

export function renderHistory(logs) {
  const list = qs("#historyList");
  if (!list) return;
  if (!logs.length) {
    list.innerHTML = emptyBlock("Chưa có lịch sử", "Các thao tác nhập hàng, bán hàng, sửa đơn, trả hàng, sửa xóa hàng hóa và danh mục sẽ hiển thị tại đây.");
    return;
  }
  list.innerHTML = `<div class="p-4 space-y-4 bg-slate-50/50">${logs.map(renderActivityCard).join("")}</div>`;
}

function renderActivityCard(item) {
  const meta = actionMeta(item.action);
  return `
    <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
      <div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div class="min-w-0 flex items-start gap-3">
          <div class="h-12 w-12 shrink-0 rounded-2xl ${meta.iconClass} flex items-center justify-center text-xl">${meta.icon}</div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full ${actionClass(item.action)} px-3 py-1 text-xs font-bold">${escapeHtml(actionLabel(item.action))}</span>
              <span class="text-xs text-slate-400">${formatDateTime(item.created_at)}</span>
              <span class="text-xs rounded-full bg-slate-100 px-2 py-1 text-slate-500">${escapeHtml(item.code || "Không có mã")}</span>
            </div>
            <p class="mt-2 text-sm font-semibold text-slate-800 leading-6">${escapeHtml(item.description || "")}</p>
          </div>
        </div>
        <div class="xl:text-right whitespace-nowrap rounded-2xl bg-slate-50 px-4 py-3">
          <p class="text-xs text-slate-400">Giá trị</p>
          <p class="font-black text-blue-600">${item.amount ? formatCurrency(item.amount) : "-"}</p>
        </div>
      </div>
      ${renderActivityDetails(item)}
    </article>`;
}

function actionMeta(action) {
  if (String(action).includes("product")) return { icon: "📦", iconClass: "bg-blue-50 text-blue-700" };
  if (String(action).includes("category")) return { icon: "🏷️", iconClass: "bg-indigo-50 text-indigo-700" };
  if (action === "order_returned") return { icon: "↩️", iconClass: "bg-amber-50 text-amber-700" };
  if (String(action).includes("order")) return { icon: "🧾", iconClass: "bg-emerald-50 text-emerald-700" };
  if (String(action).includes("import")) return { icon: "⬆️", iconClass: "bg-violet-50 text-violet-700" };
  return { icon: "🕘", iconClass: "bg-slate-100 text-slate-700" };
}


function actionClass(action) {
  if (String(action).includes("deleted") || action === "order_cancelled") return "bg-red-50 text-red-700";
  if (String(action).includes("updated") || action === "order_returned") return "bg-amber-50 text-amber-700";
  if (String(action).includes("import")) return "bg-violet-50 text-violet-700";
  if (String(action).includes("order")) return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

function renderActivityDetails(item) {
  const meta = item.metadata || {};
  try {
    if (item.action === "order_created" || item.action === "order_imported") return renderOrderActivity(meta);
    if (item.action === "order_updated") return renderOrderUpdatedActivity(meta);
    if (item.action === "order_cancelled" || item.action === "order_returned") return renderRestoreOrderActivity(meta);
    if (item.action === "product_created") return renderProductCreatedActivity(meta);
    if (item.action === "product_updated") return renderProductUpdatedActivity(meta);
    if (item.action === "product_deleted") return renderProductDeletedActivity(meta);
    if (item.action === "product_imported") return renderProductImportedActivity(meta);
    if (item.action === "category_created" || item.action === "category_updated" || item.action === "category_deleted") return renderCategoryActivity(meta);
  } catch (error) {
    console.warn("Không render được chi tiết lịch sử", error);
  }
  return `<pre class="mt-3 max-h-52 overflow-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">${escapeHtml(JSON.stringify(meta, null, 2))}</pre>`;
}

function renderOrderActivity(meta = {}) {
  const items = meta.items || [];
  return `<div class="mt-3 rounded-2xl bg-slate-50 p-3">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
      <p><span class="text-slate-400">Khách:</span> <strong>${escapeHtml(meta.customer_name || "Khách lẻ")}</strong></p>
      <p><span class="text-slate-400">SĐT:</span> <strong>${escapeHtml(meta.customer_phone || "-")}</strong></p>
      <p><span class="text-slate-400">Địa chỉ:</span> <strong>${escapeHtml(meta.customer_address || "-")}</strong></p>
      <p><span class="text-slate-400">Giảm:</span> <strong>${formatCurrency(meta.discount || 0)}</strong></p>
      <p><span class="text-slate-400">Tổng:</span> <strong>${formatCurrency(meta.total || 0)}</strong></p>
    </div>
    ${renderActivityItems(items)}
  </div>`;
}

function renderRestoreOrderActivity(meta = {}) {
  const items = meta.items || [];
  return `<div class="mt-3 rounded-2xl bg-slate-50 p-3">
    <p class="text-xs text-slate-500">Trạng thái: <strong>${escapeHtml(meta.previous_status || "completed")}</strong> → <strong>${escapeHtml(meta.next_status || "")}</strong>. Các dòng dưới đây đã được hoàn lại tồn kho.</p>
    ${renderActivityItems(items)}
  </div>`;
}

function renderActivityItems(items = []) {
  if (!items.length) return `<p class="mt-2 text-xs text-slate-400">Không có dòng chi tiết.</p>`;
  return `<div class="mt-3 grid gap-2">${items.map((item) => `
    <div class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div class="min-w-0"><p class="font-bold text-slate-800 truncate">${escapeHtml(item.product_name || "")}</p>${item.category_name ? `<p class="text-slate-400">${escapeHtml(item.category_name)}</p>` : ""}</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
          <p><span class="block text-slate-400">SL</span><strong>${formatNumber(item.quantity || 0)}</strong></p>
          <p><span class="block text-slate-400">Giá bán</span><strong>${formatCurrency(item.sale_price || 0)}</strong></p>
          <p><span class="block text-slate-400">Giá vốn</span><strong>${formatCurrency(item.cost_price || 0)}</strong></p>
          <p><span class="block text-slate-400">Thành tiền</span><strong class="text-blue-600">${formatCurrency(item.line_total || (Number(item.quantity || 0) * Number(item.sale_price || 0)))}</strong></p>
        </div>
      </div>
    </div>`).join("")}</div>`;
}

function renderOrderUpdatedActivity(meta = {}) {
  const before = meta.before || {};
  const after = meta.after || {};
  return `<div class="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="rounded-2xl bg-white/70 p-3"><p class="font-bold">Trước khi sửa</p><p>Khách: ${escapeHtml(before.customer_name || "Khách lẻ")}</p><p>SĐT: ${escapeHtml(before.customer_phone || "-")}</p><p>Địa chỉ: ${escapeHtml(before.customer_address || "-")}</p><p>Giảm giá: ${formatCurrency(before.discount || 0)}</p><p>Tổng: ${formatCurrency(before.total || 0)}</p></div>
      <div class="rounded-2xl bg-white/70 p-3"><p class="font-bold">Sau khi sửa</p><p>Khách: ${escapeHtml(after.customer_name || "Khách lẻ")}</p><p>SĐT: ${escapeHtml(after.customer_phone || "-")}</p><p>Địa chỉ: ${escapeHtml(after.customer_address || "-")}</p><p>Giảm giá: ${formatCurrency(after.discount || 0)}</p><p>Tổng: ${formatCurrency(after.total || 0)}</p></div>
    </div>
  </div>`;
}


function renderProductCreatedActivity(meta = {}) {
  const product = meta.product || {};
  const variant = (meta.variants || [])[0] || {};
  return `<div class="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 rounded-2xl bg-slate-50 p-3 text-xs"><p><span class="text-slate-400">Tên:</span><br><strong>${escapeHtml(product.name || "")}</strong></p><p><span class="text-slate-400">Mã:</span><br><strong>${escapeHtml(product.product_code || "-")}</strong></p><p><span class="text-slate-400">Giá bán:</span><br><strong>${formatCurrency(variant.sale_price || 0)}</strong></p><p><span class="text-slate-400">Giá vốn:</span><br><strong>${formatCurrency(variant.cost_price || 0)}</strong></p><p><span class="text-slate-400">Tồn:</span><br><strong>${formatNumber(variant.stock_qty || 0)}</strong></p></div>`;
}

function renderProductUpdatedActivity(meta = {}) {
  const before = meta.before || {};
  const after = meta.after || {};
  const beforeVariant = before.product_variants?.[0] || {};
  const afterVariant = after.variant || {};
  return `<div class="mt-3 rounded-2xl bg-slate-50 p-3 text-xs"><div class="grid grid-cols-1 md:grid-cols-2 gap-3"><div><p class="font-bold text-slate-500">Trước</p><p>${escapeHtml(before.name || "-")}</p><p>Giá bán: ${formatCurrency(beforeVariant.sale_price || 0)} · Giá vốn: ${formatCurrency(beforeVariant.cost_price || 0)} · Tồn: ${formatNumber(beforeVariant.stock_qty || 0)}</p></div><div><p class="font-bold text-slate-500">Sau</p><p>${escapeHtml(after.product?.name || "-")}</p><p>Giá bán: ${formatCurrency(afterVariant.sale_price || 0)} · Giá vốn: ${formatCurrency(afterVariant.cost_price || 0)} · Tồn: ${formatNumber(afterVariant.stock_qty || 0)}</p></div></div></div>`;
}

function renderProductDeletedActivity(meta = {}) {
  const product = meta.before || {};
  const variant = product.product_variants?.[0] || {};
  return `<div class="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-800">Đã ẩn khỏi bán hàng: <strong>${escapeHtml(product.name || "")}</strong>. Giá bán ${formatCurrency(variant.sale_price || 0)}, tồn ${formatNumber(variant.stock_qty || 0)}.</div>`;
}

function renderProductImportedActivity(meta = {}) {
  const rows = meta.imported_rows || [];
  return `<div class="mt-3 rounded-2xl bg-violet-50 p-3 text-xs text-violet-800"><p>Đã import <strong>${formatNumber(meta.product_count || 0)}</strong> sản phẩm từ <strong>${formatNumber(meta.row_count || 0)}</strong> dòng Excel.</p>${rows.length ? `<p class="mt-1">Ví dụ: ${escapeHtml(rows.slice(0, 5).map((row) => row.product_name).filter(Boolean).join(", "))}</p>` : ""}</div>`;
}

function renderCategoryActivity(meta = {}) {
  const before = meta.before || meta.category || {};
  const after = meta.after || meta.category || {};
  return `<div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
    <div class="rounded-2xl bg-slate-50 p-3"><p class="text-slate-400">Trước</p><p class="font-bold text-slate-800">${escapeHtml(before.name || "-")}</p></div>
    <div class="rounded-2xl bg-slate-50 p-3"><p class="text-slate-400">Sau</p><p class="font-bold text-slate-800">${escapeHtml(after.name || "-")}</p></div>
  </div>`;
}


export function renderReceipt(order, cartItems, discount = 0) {
  const container = qs("#receiptContent");
  if (!container) return;
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.sale_price || 0) * Number(item.quantity || 0), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  container.innerHTML = `<div class="text-center"><h3 class="text-lg font-black">MINI KIOT POS</h3><p class="text-xs text-slate-500">Hóa đơn bán hàng</p></div><div class="border-y border-dashed border-slate-300 py-3 text-xs text-slate-600"><p>Mã đơn: <strong>${escapeHtml(order?.code || "Đang cập nhật")}</strong></p><p>Ngày: ${formatDateTime(new Date())}</p>${order?.customer_name ? `<p>Khách: <strong>${escapeHtml(order.customer_name)}</strong></p>` : ""}${order?.customer_phone ? `<p>SĐT: ${escapeHtml(order.customer_phone)}</p>` : ""}${order?.customer_address ? `<p>Địa chỉ: ${escapeHtml(order.customer_address)}</p>` : ""}</div><div class="space-y-2">${cartItems.map((item) => `<div class="flex justify-between gap-3 text-sm"><span>${escapeHtml(item.product_name)} ${item.variant_label && item.variant_label !== "Mặc định" ? `(${escapeHtml(item.variant_label)})` : ""} x${item.quantity}</span><span>${formatCurrency(Number(item.sale_price || 0) * Number(item.quantity || 0))}</span></div>`).join("")}</div><div class="border-t border-dashed border-slate-300 pt-3 space-y-1 text-sm"><div class="flex justify-between"><span>Tạm tính</span><span>${formatCurrency(subtotal)}</span></div><div class="flex justify-between"><span>Giảm giá</span><span>${formatCurrency(discount)}</span></div><div class="flex justify-between text-base font-black"><span>Tổng</span><span>${formatCurrency(total)}</span></div></div><p class="text-center text-xs text-slate-500">Cảm ơn quý khách!</p>`;
}

function actionLabel(action) {
  const labels = { product_created: "Thêm hàng hóa", product_updated: "Sửa hàng hóa", product_deleted: "Xóa hàng hóa", product_imported: "Import hàng hóa", category_created: "Thêm danh mục", category_updated: "Sửa danh mục", category_deleted: "Xóa danh mục", order_created: "Bán hàng", order_updated: "Sửa đơn hàng", order_imported: "Import đơn hàng", order_cancelled: "Hủy đơn cũ", order_returned: "Trả hàng" };
  return labels[action] || action || "Hoạt động";
}

function emptyBlock(title, description) { return `<div class="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p class="font-bold text-slate-700">${escapeHtml(title)}</p><p class="mt-1 text-sm text-slate-500">${escapeHtml(description)}</p></div>`; }
function emptySmall(text) { return `<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">${escapeHtml(text)}</div>`; }

function placeholderImage(text = "P") { const label = encodeURIComponent(String(text || "P").slice(0, 2).toUpperCase()); return `https://placehold.co/160x160/e2e8f0/334155?text=${label}`; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
