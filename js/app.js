import {
  saveSupabaseConfig,
  loadSupabaseConfig,
  clearSupabaseConfig,
  testConnection,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchProducts,
  createProductWithVariants,
  updateProductWithDefaultVariant,
  softDeleteProduct,
  uploadProductImage,
  createOrder,
  fetchOrders,
  updateOrderDetails,
  returnOrder,
  calculateOrderTotals,
  fetchRevenueReport,
  fetchGrowthChartData,
  importProductsFromRows,
  importOrdersFromRows,
  fetchActivityLogs,
  generateProductCode,
} from "./api.js";

import { state, setState, addToCart, updateCartQuantity, removeFromCart, clearCart } from "./state.js";

import {
  qs,
  qsa,
  showView,
  showToast,
  setConnectionStatus,
  renderCategoryOptions,
  renderProducts,
  renderPosProducts,
  renderCart,
  renderOrders,
  renderDashboard,
  renderHistory,
  renderReceipt,
  formatDateTime,
  formatCurrency,
} from "./render.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindNavigation();
  bindSettings();
  bindProducts();
  bindCategories();
  bindPOS();
  bindOrders();
  bindHistory();
  bindReceipt();
  bindExcel();
  bindRefresh();
  bindReports();

  const config = loadSupabaseConfig();
  if (config) {
    qs("#supabaseUrl").value = config.url || "";
    qs("#supabaseKey").value = config.anonKey || "";
    try {
      await testConnection();
      setConnectionStatus("Đã kết nối Supabase", "success");
      await bootstrapData();
      await switchView("Dashboard");
    } catch (error) {
      console.error(error);
      setConnectionStatus("Lỗi kết nối Supabase", "error");
      showToast(error.message, "error");
      await switchView("Settings");
    }
  } else {
    setConnectionStatus("Chưa cấu hình Supabase", "muted");
    await switchView("Settings");
  }
}

function bindNavigation() {
  qsa(".nav-btn").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  qs("#btnOpenSettings")?.addEventListener("click", () => switchView("Settings"));
}

function bindRefresh() {
  qs("#btnRefresh")?.addEventListener("click", async () => {
    try { await refreshCurrentView(); showToast("Đã làm mới dữ liệu.", "success"); }
    catch (error) { console.error(error); showToast(error.message, "error"); }
  });
}

async function switchView(viewName) {
  setState({ currentView: viewName });
  showView(viewName);
  try {
    if (viewName === "Dashboard") await loadDashboard();
    if (viewName === "Products") await loadProducts();
    if (viewName === "Categories") await loadCategories();
    if (viewName === "POS") await loadProductsForPOS();
    if (viewName === "Orders") await loadOrders();
    if (viewName === "History") await loadHistory();
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  }
}

async function refreshCurrentView() {
  if (state.currentView === "Dashboard") await loadDashboard();
  if (state.currentView === "Products") await loadProducts();
  if (state.currentView === "Categories") await loadCategories();
  if (state.currentView === "POS") await loadProductsForPOS();
  if (state.currentView === "Orders") await loadOrders();
  if (state.currentView === "History") await loadHistory();
  if (state.currentView === "Settings") await testConnection();
}

async function bootstrapData() {
  await Promise.all([loadCategories(), loadProducts(), loadOrders(), loadHistory()]);
  await loadDashboard();
}

async function loadCategories() {
  const categories = await fetchCategories();
  setState({ categories });
  renderCategoryOptions(categories);
}

async function loadProducts() {
  const products = await fetchProducts({
    keyword: state.productKeyword,
    categoryId: state.productCategoryFilter,
    stockFilter: state.productStockFilter,
    sort: state.productSort,
  });
  setState({ products });
  renderProducts(products);
}

async function loadProductsForPOS() {
  const products = await fetchProducts({
    keyword: state.posKeyword,
    categoryId: state.posCategoryFilter,
    stockFilter: "in_stock",
    sort: state.posSort,
  });
  setState({ products });
  renderPosProducts(products);
}

async function loadOrders() {
  const orders = await fetchOrders({
    status: state.orderStatusFilter,
    fromDate: state.orderDateFrom,
    toDate: state.orderDateTo,
    keyword: state.orderKeyword,
    sort: state.orderSort,
  });
  setState({ orders });
  renderOrders(orders);
}

async function loadHistory() {
  const activityLogs = await fetchActivityLogs({
    keyword: state.historyKeyword,
    action: state.historyActionFilter,
    sort: state.historySort,
    limit: 200,
  });
  setState({ activityLogs });
  renderHistory(activityLogs);
}

async function loadDashboard() {
  const custom = state.reportPeriod === "custom" ? { fromDate: state.reportDateFrom, toDate: state.reportDateTo } : { fromDate: "", toDate: "" };
  const [report, chartData, products, activityLogs] = await Promise.all([
    fetchRevenueReport(state.reportPeriod, custom),
    fetchGrowthChartData(state.reportPeriod, custom),
    fetchProducts({ stockFilter: "", sort: "stock_asc" }),
    fetchActivityLogs({ limit: 8 }),
  ]);
  setState({ report, chartData, products, activityLogs });
  renderDashboard(report, chartData, products, activityLogs);
}

function bindSettings() {
  qs("#settingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const url = qs("#supabaseUrl").value.trim();
    const anonKey = qs("#supabaseKey").value.trim();
    try {
      saveSupabaseConfig({ url, anonKey });
      await testConnection();
      setConnectionStatus("Đã kết nối Supabase", "success");
      showToast("Đã lưu cấu hình Supabase.", "success");
      await bootstrapData();
      await switchView("Dashboard");
    } catch (error) {
      console.error(error);
      setConnectionStatus("Lỗi kết nối Supabase", "error");
      showToast(error.message, "error");
    }
  });

  qs("#btnClearConfig")?.addEventListener("click", () => {
    clearSupabaseConfig();
    setConnectionStatus("Đã xóa cấu hình", "muted");
    showToast("Đã xóa cấu hình Supabase.");
  });
}

function bindProducts() {
  qs("#btnAddProduct")?.addEventListener("click", () => openProductModal());
  qs("#btnCloseProductModal")?.addEventListener("click", () => qs("#productModal").close());
  qs("#btnCancelProductModal")?.addEventListener("click", () => qs("#productModal").close());

  qs("#productName")?.addEventListener("input", () => {
    const codeInput = qs("#productCode");
    if (!codeInput) return;
    if (!codeInput.value || codeInput.dataset.auto === "true") {
      codeInput.value = generateProductCode(qs("#productName").value);
      codeInput.dataset.auto = "true";
    }
  });
  qs("#productCode")?.addEventListener("input", () => { qs("#productCode").dataset.auto = "false"; });
  qs("#btnGenerateProductCode")?.addEventListener("click", () => {
    const codeInput = qs("#productCode");
    codeInput.value = generateProductCode(qs("#productName").value);
    codeInput.dataset.auto = "true";
  });

  qs("#productSearch")?.addEventListener("input", debounce(async (event) => { setState({ productKeyword: event.target.value.trim() }); await loadProducts(); }, 350));
  qs("#productCategoryFilter")?.addEventListener("change", async (event) => { setState({ productCategoryFilter: event.target.value }); await loadProducts(); });
  qs("#productStockFilter")?.addEventListener("change", async (event) => { setState({ productStockFilter: event.target.value }); await loadProducts(); });
  qs("#productSort")?.addEventListener("change", async (event) => { setState({ productSort: event.target.value }); await loadProducts(); });

  qs("#productList")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-product]");
    const deleteButton = event.target.closest("[data-delete-product]");
    if (editButton) {
      const product = state.products.find((item) => item.id === editButton.dataset.editProduct);
      if (product) openProductModal(product);
    }
    if (deleteButton) {
      const product = state.products.find((item) => item.id === deleteButton.dataset.deleteProduct);
      if (!product) return;
      if (!confirm(`Xóa hàng hóa '${product.name}'? Sản phẩm sẽ ẩn khỏi danh sách bán hàng.`)) return;
      try {
        await softDeleteProduct(product.id);
        showToast("Đã xóa hàng hóa.", "success");
        await Promise.all([loadProducts(), loadProductsForPOS(), loadDashboard(), loadHistory()]);
      } catch (error) {
        console.error(error);
        showToast(error.message, "error");
      }
    }
  });

  qs("#productForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.submitter;
    const isEdit = qs("#productForm").dataset.mode === "edit";
    const productId = qs("#productForm").dataset.productId;
    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = isEdit ? "Đang cập nhật..." : "Đang lưu...";
    try {
      const { productPayload, variant } = await readProductFormPayload(isEdit);
      if (isEdit) {
        await updateProductWithDefaultVariant(productId, productPayload, variant);
        showToast("Đã cập nhật hàng hóa.", "success");
      } else {
        await createProductWithVariants(productPayload, [variant]);
        showToast("Đã thêm hàng hóa.", "success");
      }
      qs("#productModal").close();
      await Promise.all([loadProducts(), loadProductsForPOS(), loadDashboard(), loadHistory()]);
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });
}

function openProductModal(product = null) {
  const form = qs("#productForm");
  form.reset();
  form.dataset.mode = product ? "edit" : "create";
  form.dataset.productId = product?.id || "";
  qs("#productModalTitle").textContent = product ? "Sửa hàng hóa" : "Thêm hàng hóa";
  qs("#productModalDesc").textContent = product ? "Cập nhật thông tin, giá bán, giá vốn và tồn kho." : "Form đơn giản cho sản phẩm thường. Mỗi sản phẩm có một tồn kho, một giá vốn và một giá bán.";
  qs("#productSubmitLabel").textContent = product ? "Cập nhật hàng hóa" : "Lưu hàng hóa";

  if (product) {
    const variant = product.product_variants?.[0] || {};
    qs("#productName").value = product.name || "";
    qs("#productCategory").value = product.category_id || "";
    qs("#productCode").value = product.product_code || "";
    qs("#productCode").dataset.auto = "false";
    qs("#productSku").value = product.sku || "";
    qs("#productDescription").value = product.description || "";
    qs("#costPrice").value = Number(variant.cost_price || 0);
    qs("#salePrice").value = Number(variant.sale_price || 0);
    qs("#stockQty").value = Number(variant.stock_qty || 0);
  } else {
    qs("#productCategory").value = "";
    qs("#productCode").dataset.auto = "true";
  }
  qs("#productModal").showModal();
}

async function readProductFormPayload(isEdit = false) {
  const file = qs("#productImage").files?.[0];
  const imageUrl = file ? await uploadProductImage(file) : undefined;
  const productName = qs("#productName").value.trim();
  if (!productName) throw new Error("Tên sản phẩm không được để trống.");
  const productCode = qs("#productCode").value.trim() || generateProductCode(productName);
  const productPayload = {
    category_id: qs("#productCategory").value || null,
    name: productName,
    product_code: productCode,
    sku: qs("#productSku").value.trim(),
    barcode: null,
    brand: null,
    unit: null,
    description: qs("#productDescription").value.trim(),
  };
  if (file) productPayload.image_url = imageUrl;
  if (!isEdit && !file) productPayload.image_url = null;
  const variant = {
    variant_name: "Mặc định",
    size: null,
    color: null,
    attributes: {},
    cost_price: Number(qs("#costPrice").value || 0),
    sale_price: Number(qs("#salePrice").value || 0),
    stock_qty: Number(qs("#stockQty").value || 0),
  };
  return { productPayload, variant };
}

function bindCategories() {
  qs("#categoryForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = qs("#categoryNameInput");
    const name = input.value.trim();
    const form = qs("#categoryForm");
    const isEdit = form.dataset.mode === "edit";
    const categoryId = form.dataset.categoryId;
    if (!name) return;
    try {
      if (isEdit) {
        await updateCategory(categoryId, name);
        showToast("Đã cập nhật danh mục.", "success");
      } else {
        await createCategory(name);
        showToast("Đã thêm danh mục.", "success");
      }
      resetCategoryForm();
      await Promise.all([loadCategories(), loadProducts(), loadProductsForPOS(), loadDashboard(), loadHistory()]);
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    }
  });

  qs("#btnCancelCategoryEdit")?.addEventListener("click", resetCategoryForm);

  qs("#categoryManageList")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-category]");
    const deleteButton = event.target.closest("[data-delete-category]");
    if (editButton) {
      const category = state.categories.find((item) => item.id === editButton.dataset.editCategory);
      if (!category) return;
      qs("#categoryForm").dataset.mode = "edit";
      qs("#categoryForm").dataset.categoryId = category.id;
      qs("#categoryFormTitle").textContent = "Sửa danh mục";
      qs("#categoryNameInput").value = category.name || "";
      qs("#btnSaveCategory").textContent = "Cập nhật danh mục";
      qs("#btnCancelCategoryEdit").classList.remove("hidden");
      qs("#categoryNameInput").focus();
    }
    if (deleteButton) {
      const category = state.categories.find((item) => item.id === deleteButton.dataset.deleteCategory);
      if (!category) return;
      const productCount = state.products.filter((product) => product.category_id === category.id).length;
      if (!confirm(`Xóa danh mục '${category.name}'? ${productCount} sản phẩm thuộc danh mục này sẽ chuyển thành chưa phân loại.`)) return;
      try {
        await deleteCategory(category.id);
        showToast("Đã xóa danh mục.", "success");
        await Promise.all([loadCategories(), loadProducts(), loadProductsForPOS(), loadDashboard(), loadHistory()]);
      } catch (error) {
        console.error(error);
        showToast(error.message, "error");
      }
    }
  });
}

function resetCategoryForm() {
  const form = qs("#categoryForm");
  if (!form) return;
  form.reset();
  form.dataset.mode = "create";
  form.dataset.categoryId = "";
  qs("#categoryFormTitle").textContent = "Thêm danh mục";
  qs("#btnSaveCategory").textContent = "Thêm danh mục";
  qs("#btnCancelCategoryEdit").classList.add("hidden");
}

function bindPOS()
 {
  qs("#posSearch")?.addEventListener("input", debounce(async (event) => { setState({ posKeyword: event.target.value.trim() }); await loadProductsForPOS(); }, 350));
  qs("#posCategoryFilter")?.addEventListener("change", async (event) => { setState({ posCategoryFilter: event.target.value }); await loadProductsForPOS(); });
  qs("#posSort")?.addEventListener("change", async (event) => { setState({ posSort: event.target.value }); await loadProductsForPOS(); });

  qs("#posProductList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-cart]");
    if (!button) return;
    try { addToCart(button.dataset.addCart); renderCart(Number(qs("#cartDiscount")?.value || 0)); }
    catch (error) { showToast(error.message, "error"); }
  });

  qs("#cartItems")?.addEventListener("input", (event) => {
    const input = event.target.closest("[data-cart-qty]");
    if (!input) return;
    try { updateCartQuantity(input.dataset.cartQty, input.value); renderCart(Number(qs("#cartDiscount")?.value || 0)); }
    catch (error) { showToast(error.message, "error"); renderCart(Number(qs("#cartDiscount")?.value || 0)); }
  });

  qs("#cartItems")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-cart]");
    if (!button) return;
    removeFromCart(button.dataset.removeCart);
    renderCart(Number(qs("#cartDiscount")?.value || 0));
  });

  qs("#cartDiscount")?.addEventListener("input", (event) => renderCart(Number(event.target.value || 0)));
  qs("#btnClearCart")?.addEventListener("click", () => { clearCart(); renderCart(Number(qs("#cartDiscount")?.value || 0)); });
  qs("#btnCheckout")?.addEventListener("click", checkout);
  renderCart(0);
}

async function checkout() {
  if (!state.cart.length) return;
  const button = qs("#btnCheckout");
  const discount = Number(qs("#cartDiscount")?.value || 0);
  const cartSnapshot = structuredClone(state.cart);
  const totals = calculateOrderTotals(cartSnapshot, discount);
  button.disabled = true;
  button.textContent = "Đang tạo đơn...";
  try {
    const order = await createOrder({
      items: cartSnapshot,
      discount,
      customer_name: qs("#posCustomerName")?.value.trim(),
      customer_phone: qs("#posCustomerPhone")?.value.trim(),
      customer_address: qs("#posCustomerAddress")?.value.trim(),
    });
    renderReceipt(order, cartSnapshot, totals.discount);
    qs("#receiptModal").showModal();
    clearCart();
    qs("#cartDiscount").value = 0;
    if (qs("#posCustomerName")) qs("#posCustomerName").value = "";
    if (qs("#posCustomerPhone")) qs("#posCustomerPhone").value = "";
    if (qs("#posCustomerAddress")) qs("#posCustomerAddress").value = "";
    renderCart(0);
    showToast("Đã tạo đơn hàng và trừ tồn kho.", "success");
    await Promise.all([loadProductsForPOS(), loadOrders(), loadDashboard(), loadHistory()]);
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Tạo đơn & In hóa đơn";
  }
}

function bindOrders() {
  qs("#orderSearch")?.addEventListener("input", debounce(async (event) => { setState({ orderKeyword: event.target.value.trim() }); await loadOrders(); }, 350));
  qs("#orderStatusFilter")?.addEventListener("change", async (event) => { setState({ orderStatusFilter: event.target.value }); await loadOrders(); });
  qs("#orderDateFrom")?.addEventListener("change", async (event) => { setState({ orderDateFrom: event.target.value }); await loadOrders(); });
  qs("#orderDateTo")?.addEventListener("change", async (event) => { setState({ orderDateTo: event.target.value }); await loadOrders(); });
  qs("#orderSort")?.addEventListener("change", async (event) => { setState({ orderSort: event.target.value }); await loadOrders(); });

  qs("#orderList")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-order]");
    const returnButton = event.target.closest("[data-return-order]");
    try {
      if (editButton) {
        const order = state.orders.find((item) => item.id === editButton.dataset.editOrder);
        if (order) openOrderEditModal(order);
        return;
      }
      if (returnButton) {
        if (!confirm("Bạn chắc chắn muốn xử lý trả hàng và hoàn tồn kho?")) return;
        await returnOrder(returnButton.dataset.returnOrder);
        showToast("Đã trả hàng và hoàn kho.", "success");
      }
      await Promise.all([loadOrders(), loadProducts(), loadDashboard(), loadHistory()]);
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    }
  });

  qs("#btnCloseOrderEditModal")?.addEventListener("click", closeOrderEditModal);
  qs("#btnCancelOrderEditModal")?.addEventListener("click", closeOrderEditModal);
  qs("#orderEditDiscount")?.addEventListener("input", updateOrderEditTotalPreview);
  qs("#orderEditForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Đang lưu...";
    try {
      await updateOrderDetails(qs("#orderEditId").value, {
        customer_name: qs("#orderEditCustomerName").value.trim(),
        customer_phone: qs("#orderEditCustomerPhone").value.trim(),
        customer_address: qs("#orderEditCustomerAddress").value.trim(),
        discount: Number(qs("#orderEditDiscount").value || 0),
      });
      closeOrderEditModal();
      showToast("Đã cập nhật đơn hàng.", "success");
      await Promise.all([loadOrders(), loadDashboard(), loadHistory()]);
    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

}

function openOrderEditModal(order) {
  qs("#orderEditId").value = order.id || "";
  qs("#orderEditCode").value = order.code || "";
  qs("#orderEditStatus").value = statusLabel(order.status);
  qs("#orderEditCustomerName").value = order.customer_name || "Khách lẻ";
  qs("#orderEditCustomerPhone").value = order.customer_phone || "";
  qs("#orderEditCustomerAddress").value = order.customer_address || "";
  qs("#orderEditDiscount").value = Number(order.discount || 0);
  qs("#orderEditForm").dataset.subtotal = Number(order.subtotal || 0);
  qs("#orderEditForm").dataset.orderId = order.id || "";
  const items = order.order_items || [];
  qs("#orderEditItemCount").textContent = `${items.length} dòng`;
  qs("#orderEditItems").innerHTML = items.length ? items.map((item) => `
    <div class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div class="min-w-0"><p class="font-bold text-slate-800 truncate">${escapeHtml(item.product_name || "")}</p><p class="text-xs text-slate-400">${escapeHtml(item.category_name || "Chưa phân loại")}</p></div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right text-xs">
          <p><span class="block text-slate-400">SL</span><strong>${Number(item.quantity || 0).toLocaleString("vi-VN")}</strong></p>
          <p><span class="block text-slate-400">Giá bán</span><strong>${formatCurrency(item.sale_price || 0)}</strong></p>
          <p><span class="block text-slate-400">Giá vốn</span><strong>${formatCurrency(item.cost_price || 0)}</strong></p>
          <p><span class="block text-slate-400">Thành tiền</span><strong class="text-blue-600">${formatCurrency(item.line_total || 0)}</strong></p>
        </div>
      </div>
    </div>`).join("") : `<p class="text-sm text-slate-500">Đơn chưa có chi tiết hàng bán.</p>`;
  updateOrderEditTotalPreview();
  qs("#orderEditModal").showModal();
}

function updateOrderEditTotalPreview() {
  const form = qs("#orderEditForm");
  const subtotal = Number(form?.dataset.subtotal || 0);
  const discount = Math.max(0, Number(qs("#orderEditDiscount")?.value || 0));
  const total = Math.max(0, subtotal - discount);
  if (qs("#orderEditTotalPreview")) qs("#orderEditTotalPreview").value = formatCurrency(total);
}

function closeOrderEditModal() {
  qs("#orderEditModal")?.close();
}

function statusLabel(status) {
  if (status === "completed") return "Hoàn thành";
  if (status === "returned") return "Trả hàng";
  if (status === "cancelled") return "Đã hủy cũ";
  return status || "Không rõ";
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function bindHistory() {
  qs("#historySearch")?.addEventListener("input", debounce(async (event) => { setState({ historyKeyword: event.target.value.trim() }); await loadHistory(); }, 350));
  qs("#historyActionFilter")?.addEventListener("change", async (event) => { setState({ historyActionFilter: event.target.value }); await loadHistory(); });
  qs("#historySort")?.addEventListener("change", async (event) => { setState({ historySort: event.target.value }); await loadHistory(); });
  qs("#btnExportHistory")?.addEventListener("click", async () => {
    if (!state.activityLogs.length) await loadHistory();
    exportHistoryToExcel();
  });
}

function bindReports() {
  syncReportFilterUi();
  qs("#reportPeriod")?.addEventListener("change", async (event) => {
    const period = event.target.value;
    if (period === "custom") {
      const today = new Date().toISOString().slice(0, 10);
      const from = qs("#reportDateFrom")?.value || state.reportDateFrom || today;
      const to = qs("#reportDateTo")?.value || state.reportDateTo || today;
      if (qs("#reportDateFrom")) qs("#reportDateFrom").value = from;
      if (qs("#reportDateTo")) qs("#reportDateTo").value = to;
      setState({ reportPeriod: period, reportDateFrom: from, reportDateTo: to });
    } else {
      setState({ reportPeriod: period, reportDateFrom: "", reportDateTo: "" });
      if (qs("#reportDateFrom")) qs("#reportDateFrom").value = "";
      if (qs("#reportDateTo")) qs("#reportDateTo").value = "";
    }
    syncReportFilterUi();
    await loadDashboard();
  });
  qs("#reportDateFrom")?.addEventListener("change", async (event) => {
    setState({ reportPeriod: "custom", reportDateFrom: event.target.value });
    if (qs("#reportPeriod")) qs("#reportPeriod").value = "custom";
    syncReportFilterUi();
    await loadDashboard();
  });
  qs("#reportDateTo")?.addEventListener("change", async (event) => {
    setState({ reportPeriod: "custom", reportDateTo: event.target.value });
    if (qs("#reportPeriod")) qs("#reportPeriod").value = "custom";
    syncReportFilterUi();
    await loadDashboard();
  });
}

function syncReportFilterUi() {
  const select = qs("#reportPeriod");
  const period = state.reportPeriod || select?.value || "today";

  if (select && select.value !== period) {
    select.value = period;
  }

  const customBox = qs("#reportCustomRange");
  const isCustom = period === "custom";
  if (customBox) customBox.classList.toggle("hidden", !isCustom);

  const fromInput = qs("#reportDateFrom");
  const toInput = qs("#reportDateTo");
  if (fromInput && fromInput.value !== state.reportDateFrom) fromInput.value = state.reportDateFrom || "";
  if (toInput && toInput.value !== state.reportDateTo) toInput.value = state.reportDateTo || "";
}

function bindReceipt() {
  qs("#btnCloseReceipt")?.addEventListener("click", () => qs("#receiptModal").close());
  qs("#btnPrintReceipt")?.addEventListener("click", () => window.print());
}

function bindExcel() {
  qs("#btnImportProducts")?.addEventListener("click", () => qs("#productExcelInput")?.click());
  qs("#productExcelInput")?.addEventListener("change", async (event) => importProductFile(event));
  qs("#btnImportOrders")?.addEventListener("click", () => qs("#orderExcelInput")?.click());
  qs("#orderExcelInput")?.addEventListener("change", async (event) => importOrderFile(event));

  qs("#btnExportProducts")?.addEventListener("click", () => {
    if (!state.products.length) { showToast("Không có hàng hóa để export.", "error"); return; }
    exportProductsToExcel();
  });
  qs("#btnExportOrders")?.addEventListener("click", async () => {
    if (!state.orders.length) await loadOrders();
    if (!state.orders.length) { showToast("Không có đơn hàng để export.", "error"); return; }
    exportOrdersToExcel();
  });
}

async function importProductFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const resultBox = qs("#importResult");
  resultBox?.classList.remove("hidden");
  if (resultBox) resultBox.textContent = "Đang đọc và import file Excel hàng hóa...";
  try {
    const rows = await readExcelRows(file);
    const result = await importProductsFromRows(rows);
    if (resultBox) resultBox.textContent = `Import thành công ${result.rowCount} dòng, tạo ${result.productCount} sản phẩm.`;
    showToast("Import hàng hóa thành công.", "success");
    await Promise.all([loadCategories(), loadProducts(), loadDashboard(), loadHistory()]);
  } catch (error) {
    console.error(error);
    if (resultBox) resultBox.textContent = error.message;
    showToast(error.message, "error");
  } finally { event.target.value = ""; }
}

async function importOrderFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const resultBox = qs("#orderImportResult");
  resultBox?.classList.remove("hidden");
  if (resultBox) resultBox.textContent = "Đang đọc và import đơn hàng từ Excel...";
  try {
    const rows = await readExcelRows(file);
    const result = await importOrdersFromRows(rows);
    if (resultBox) resultBox.textContent = `Import thành công ${result.orderCount} đơn hàng, ${result.itemCount} dòng chi tiết.`;
    showToast("Import đơn hàng thành công.", "success");
    await Promise.all([loadOrders(), loadProducts(), loadDashboard(), loadHistory()]);
  } catch (error) {
    console.error(error);
    if (resultBox) resultBox.textContent = error.message;
    showToast(error.message, "error");
  } finally { event.target.value = ""; }
}

async function readExcelRows(file) {
  if (!window.XLSX) throw new Error("Không tải được thư viện Excel SheetJS.");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("File Excel không có sheet dữ liệu.");
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

function exportProductsToExcel() {
  const rows = [];
  for (const product of state.products) {
    const variant = product.product_variants?.[0] || {};
    rows.push({
      category_name: product.categories?.name || "",
      product_name: product.name || "",
      product_code: product.product_code || "",
      sku: product.sku || "",
      description: product.description || "",
      cost_price: Number(variant.cost_price || 0),
      sale_price: Number(variant.sale_price || 0),
      stock_qty: Number(variant.stock_qty || 0),
      image_url: product.image_url || "",
    });
  }
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");
  XLSX.writeFile(workbook, `hang-hoa-${dateStamp()}.xlsx`);
}

function exportOrdersToExcel() {
  const orderRows = state.orders.map((order) => ({
    code: order.code,
    created_at: formatDateTime(order.created_at),
    customer_name: order.customer_name || "Khách lẻ",
    customer_phone: order.customer_phone || "",
    customer_address: order.customer_address || "",
    status: order.status,
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    total_cost: Number(order.total_cost || 0),
    gross_profit: Number(order.gross_profit || 0),
  }));
  const itemRows = [];
  for (const order of state.orders) for (const item of order.order_items || []) {
    itemRows.push({
      order_code: order.code,
      created_at: formatDateTime(order.created_at),
      customer_name: order.customer_name || "Khách lẻ",
      customer_phone: order.customer_phone || "",
      customer_address: order.customer_address || "",
      status: order.status,
      product_name: item.product_name,
      category_name: item.category_name || "",
      variant_label: item.variant_label,
      quantity: Number(item.quantity || 0),
      sale_price: Number(item.sale_price || 0),
      cost_price: Number(item.cost_price || 0),
      line_total: Number(item.line_total || 0),
      line_cost: Number(item.line_cost || 0),
    });
  }
  const summary = [{ order_count: state.orders.length, revenue: state.orders.reduce((sum, order) => sum + Number(order.total || 0), 0), cost: state.orders.reduce((sum, order) => sum + Number(order.total_cost || 0), 0), gross_profit: state.orders.reduce((sum, order) => sum + Number(order.gross_profit || 0), 0) }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(orderRows), "Orders");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(itemRows), "OrderItems");
  XLSX.writeFile(workbook, `don-hang-${dateStamp()}.xlsx`);
}

function exportHistoryToExcel() {
  const rows = state.activityLogs.map((item) => ({ created_at: formatDateTime(item.created_at), action: item.action, entity_type: item.entity_type, code: item.code, description: item.description, amount: item.amount || "", detail_json: JSON.stringify(item.metadata || {}) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "ActivityLogs");
  XLSX.writeFile(workbook, `lich-su-hoat-dong-${dateStamp()}.xlsx`);
}

function dateStamp() { return new Date().toISOString().slice(0, 10); }
function debounce(fn, delay = 300) { let timer; return (...args) => { window.clearTimeout(timer); timer = window.setTimeout(() => fn(...args), delay); }; }
