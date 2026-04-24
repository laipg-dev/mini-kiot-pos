import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseAttributes, getVariantLabel, getProductTotalStock, getProductMinPrice } from "./state.js";

const CONFIG_KEY = "mini_kiot_pos_supabase_config";
const PRODUCT_IMAGE_BUCKET = "product-images";
let supabaseClient = null;

export function saveSupabaseConfig({ url, anonKey }) {
  if (!url || !anonKey) throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY.");
  const config = { url: url.trim(), anonKey: anonKey.trim() };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  supabaseClient = createClient(config.url, config.anonKey);
  return config;
}

export function loadSupabaseConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { localStorage.removeItem(CONFIG_KEY); return null; }
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
  supabaseClient = null;
}

export function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const config = loadSupabaseConfig();
  if (!config?.url || !config?.anonKey) throw new Error("Chưa cấu hình Supabase.");
  supabaseClient = createClient(config.url, config.anonKey);
  return supabaseClient;
}

function handleSupabaseError(error, fallbackMessage = "Có lỗi xảy ra.") {
  if (error) {
    console.error("[Supabase Error]", error);
    throw new Error(error.message || fallbackMessage);
  }
}

export async function testConnection() {
  const supabase = getSupabase();
  const { error } = await supabase.from("categories").select("id").limit(1);
  handleSupabaseError(error, "Không thể kết nối Supabase.");
  return true;
}

export async function fetchCategories() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });
  handleSupabaseError(error, "Không thể tải danh mục.");
  return data || [];
}

export async function createCategory(name, { log = true } = {}) {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Tên danh mục không được để trống.");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .upsert({ name: cleanName }, { onConflict: "name" })
    .select()
    .single();
  handleSupabaseError(error, "Không thể tạo danh mục.");
  if (log) {
    await logActivity({
      action: "category_created",
      entity_type: "category",
      entity_id: data.id,
      code: data.name,
      description: `Thêm danh mục: ${data.name}`,
      metadata: { category: data },
    });
  }
  return data;
}

export async function updateCategory(categoryId, name) {
  const cleanName = String(name || "").trim();
  if (!categoryId) throw new Error("Thiếu ID danh mục.");
  if (!cleanName) throw new Error("Tên danh mục không được để trống.");
  const supabase = getSupabase();

  const { data: before } = await supabase.from("categories").select("*").eq("id", categoryId).single();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: cleanName })
    .eq("id", categoryId)
    .select()
    .single();
  handleSupabaseError(error, "Không thể cập nhật danh mục.");

  await logActivity({
    action: "category_updated",
    entity_type: "category",
    entity_id: categoryId,
    code: data.name,
    description: `Sửa danh mục: ${before?.name || ""} → ${data.name}`,
    metadata: { before, after: data },
  });
  return data;
}

export async function deleteCategory(categoryId) {
  if (!categoryId) throw new Error("Thiếu ID danh mục.");
  const supabase = getSupabase();
  const { data: before } = await supabase.from("categories").select("*").eq("id", categoryId).single();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  handleSupabaseError(error, "Không thể xóa danh mục.");

  await logActivity({
    action: "category_deleted",
    entity_type: "category",
    entity_id: categoryId,
    code: before?.name || "CATEGORY",
    description: `Xóa danh mục: ${before?.name || categoryId}. Sản phẩm thuộc danh mục này sẽ chuyển thành chưa phân loại.`,
    metadata: { before },
  });
  return true;
}

export async function upsertCategoriesByName(names = []) {
  const cleanNames = [...new Set(names.map((name) => String(name || "").trim()).filter(Boolean))];
  if (!cleanNames.length) return [];
  const supabase = getSupabase();
  const rows = cleanNames.map((name) => ({ name }));
  const { data, error } = await supabase.from("categories").upsert(rows, { onConflict: "name" }).select();
  handleSupabaseError(error, "Không thể tạo hoặc cập nhật danh mục.");
  return data || [];
}

export async function fetchProducts({ keyword = "", categoryId = "", stockFilter = "", sort = "newest" } = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from("products")
    .select(`
      *,
      categories ( id, name ),
      product_variants (
        id,
        variant_name,
        size,
        color,
        attributes,
        cost_price,
        sale_price,
        stock_qty,
        created_at
      )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (keyword) {
    const safeKeyword = keyword.replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${safeKeyword}%,product_code.ilike.%${safeKeyword}%,sku.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%`);
  }
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  handleSupabaseError(error, "Không thể tải hàng hóa.");
  return sortProducts(filterProductsByStock(data || [], stockFilter), sort);
}

function filterProductsByStock(products, stockFilter) {
  if (!stockFilter) return products;
  return products.filter((product) => {
    const stock = getProductTotalStock(product);
    if (stockFilter === "in_stock") return stock > 0;
    if (stockFilter === "low_stock") return stock > 0 && stock <= 5;
    if (stockFilter === "out_stock") return stock <= 0;
    return true;
  });
}

function sortProducts(products, sort) {
  return [...products].sort((a, b) => {
    if (sort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""), "vi");
    if (sort === "stock_asc") return getProductTotalStock(a) - getProductTotalStock(b);
    if (sort === "stock_desc") return getProductTotalStock(b) - getProductTotalStock(a);
    if (sort === "price_asc") return getProductMinPrice(a) - getProductMinPrice(b);
    if (sort === "price_desc") return getProductMinPrice(b) - getProductMinPrice(a);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

export async function createProductWithVariants(productPayload, variants = [], { log = true } = {}) {
  const supabase = getSupabase();
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      category_id: productPayload.category_id || null,
      name: productPayload.name,
      product_code: productPayload.product_code || null,
      sku: productPayload.sku || null,
      barcode: productPayload.barcode || null,
      brand: productPayload.brand || null,
      unit: productPayload.unit || null,
      description: productPayload.description || null,
      image_url: productPayload.image_url || null,
      is_active: true,
    })
    .select()
    .single();
  handleSupabaseError(productError, "Không thể tạo sản phẩm.");

  if (variants.length) {
    const variantRows = variants.map((variant) => ({
      product_id: product.id,
      variant_name: variant.variant_name || null,
      size: variant.size || null,
      color: variant.color || null,
      attributes: parseAttributes(variant.attributes),
      cost_price: Number(variant.cost_price || 0),
      sale_price: Number(variant.sale_price || 0),
      stock_qty: Number(variant.stock_qty || 0),
    }));
    const { error: variantError } = await supabase.from("product_variants").insert(variantRows);
    handleSupabaseError(variantError, "Không thể tạo biến thể sản phẩm.");
  }

  if (log) {
    await logActivity({
      action: "product_created",
      entity_type: "product",
      entity_id: product.id,
      code: product.sku || product.name,
      description: `Thêm hàng hóa: ${product.name}`,
      metadata: { product, variants, variant_count: variants.length },
    });
  }
  return product;
}

export async function updateProductWithDefaultVariant(productId, productPayload, variantPayload = {}) {
  if (!productId) throw new Error("Thiếu ID sản phẩm.");
  const supabase = getSupabase();

  const { data: beforeProduct } = await supabase
    .from("products")
    .select(`*, categories (id, name), product_variants (*)`)
    .eq("id", productId)
    .single();

  const productUpdate = {
    category_id: productPayload.category_id || null,
    name: productPayload.name,
    product_code: productPayload.product_code || null,
    sku: productPayload.sku || null,
    barcode: productPayload.barcode || null,
    brand: productPayload.brand || null,
    unit: productPayload.unit || null,
    description: productPayload.description || null,
  };
  if (productPayload.image_url !== undefined && productPayload.image_url !== null) productUpdate.image_url = productPayload.image_url;

  const { data: product, error: productError } = await supabase
    .from("products")
    .update(productUpdate)
    .eq("id", productId)
    .select()
    .single();
  handleSupabaseError(productError, "Không thể cập nhật sản phẩm.");

  const variantUpdate = {
    variant_name: "Mặc định",
    size: null,
    color: null,
    attributes: {},
    cost_price: Number(variantPayload.cost_price || 0),
    sale_price: Number(variantPayload.sale_price || 0),
    stock_qty: Number(variantPayload.stock_qty || 0),
  };

  const existingVariant = beforeProduct?.product_variants?.[0];
  let variant = null;
  if (existingVariant?.id) {
    const { data, error } = await supabase
      .from("product_variants")
      .update(variantUpdate)
      .eq("id", existingVariant.id)
      .select()
      .single();
    handleSupabaseError(error, "Không thể cập nhật giá và tồn kho.");
    variant = data;
  } else {
    const { data, error } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, ...variantUpdate })
      .select()
      .single();
    handleSupabaseError(error, "Không thể tạo dòng tồn kho mặc định.");
    variant = data;
  }

  await logActivity({
    action: "product_updated",
    entity_type: "product",
    entity_id: productId,
    code: product.product_code || product.sku || product.name,
    description: `Sửa hàng hóa: ${product.name}`,
    metadata: { before: beforeProduct, after: { product, variant } },
  });

  return { product, variant };
}

export async function softDeleteProduct(productId) {
  if (!productId) throw new Error("Thiếu ID sản phẩm.");
  const supabase = getSupabase();
  const { data: beforeProduct } = await supabase
    .from("products")
    .select(`*, categories (id, name), product_variants (*)`)
    .eq("id", productId)
    .single();

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", productId)
    .select()
    .single();
  handleSupabaseError(error, "Không thể xóa hàng hóa.");

  await logActivity({
    action: "product_deleted",
    entity_type: "product",
    entity_id: productId,
    code: beforeProduct?.product_code || beforeProduct?.sku || beforeProduct?.name || "PRODUCT",
    description: `Xóa hàng hóa: ${beforeProduct?.name || productId}`,
    metadata: { before: beforeProduct },
  });
  return data;
}

export async function uploadProductImage(file) {
  if (!file) return null;
  const supabase = getSupabase();
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `products/${fileName}`;
  const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(filePath, file, { cacheControl: "3600", upsert: false });
  handleSupabaseError(uploadError, "Không thể upload ảnh sản phẩm.");
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export function normalizeProductImportRows(rawRows = []) {
  return rawRows
    .map((row, index) => ({ ...normalizeProductImportRow(row), row_number: index + 2 }))
    .filter((row) => row.product_name || row.product_code || row.sku);
}

function normalizeProductImportRow(row) {
  const get = (...keys) => {
    for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
    return "";
  };
  return {
    category_name: cleanText(get("category_name", "Danh mục", "danh_muc")),
    product_name: cleanText(get("product_name", "Tên sản phẩm", "ten_san_pham")),
    product_code: cleanText(get("product_code", "Mã sản phẩm", "ma_san_pham")),
    sku: cleanText(get("sku", "SKU", "ma_sku")),
    description: cleanText(get("description", "Mô tả", "mo_ta")),
    cost_price: cleanNumber(get("cost_price", "Giá vốn", "gia_von")),
    sale_price: cleanNumber(get("sale_price", "Giá bán", "gia_ban")),
    stock_qty: cleanInteger(get("stock_qty", "Tồn kho", "ton_kho")),
    image_url: cleanText(get("image_url", "Ảnh URL", "anh_url")),
  };
}

function cleanText(value) { return String(value ?? "").trim(); }
function cleanNumber(value) { const number = Number(String(value ?? "0").replace(/,/g, "")); return Number.isFinite(number) && number >= 0 ? number : 0; }
function cleanInteger(value) { const number = parseInt(String(value ?? "0").replace(/,/g, ""), 10); return Number.isFinite(number) && number >= 0 ? number : 0; }

export function validateProductImportRows(rows = []) {
  const errors = [];
  rows.forEach((row) => {
    if (!row.product_name) errors.push(`Dòng ${row.row_number}: thiếu product_name.`);
    if (row.sale_price < 0) errors.push(`Dòng ${row.row_number}: sale_price không hợp lệ.`);
    if (row.cost_price < 0) errors.push(`Dòng ${row.row_number}: cost_price không hợp lệ.`);
    if (row.stock_qty < 0) errors.push(`Dòng ${row.row_number}: stock_qty không hợp lệ.`);
  });
  return errors;
}

export async function importProductsFromRows(rawRows = []) {
  const rows = normalizeProductImportRows(rawRows);
  const errors = validateProductImportRows(rows);
  if (!rows.length) throw new Error("File Excel không có dòng hàng hóa hợp lệ.");
  if (errors.length) throw new Error(errors.slice(0, 10).join("\n"));

  await upsertCategoriesByName(rows.map((row) => row.category_name).filter(Boolean));
  const categories = await fetchCategories();
  const categoryMap = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));

  let productCount = 0;
  for (const row of rows) {
    const code = row.product_code || generateImportProductCode(row.product_name, productCount);
    await createProductWithVariants({
      category_id: row.category_name ? categoryMap.get(row.category_name.toLowerCase()) || null : null,
      name: row.product_name,
      product_code: code,
      sku: row.sku,
      barcode: null,
      brand: null,
      unit: null,
      description: row.description,
      image_url: row.image_url,
    }, [{
      variant_name: "Mặc định",
      size: null,
      color: null,
      attributes: {},
      cost_price: row.cost_price,
      sale_price: row.sale_price,
      stock_qty: row.stock_qty,
    }], { log: false });
    productCount += 1;
  }

  await logActivity({
    action: "product_imported",
    entity_type: "product",
    code: "IMPORT_PRODUCTS",
    description: `Import ${productCount} sản phẩm từ Excel`,
    metadata: { product_count: productCount, row_count: rows.length, imported_rows: rows },
  });
  return { productCount, variantCount: productCount, rowCount: rows.length };
}

export function generateProductCode(name, suffix = "") {
  const base = String(name || "SP")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.slice(0, 3))
    .join("");
  const stamp = suffix || Date.now().toString().slice(-4);
  return `${base || "SP"}${stamp}`.slice(0, 18);
}

function generateImportProductCode(name, index = 0) {
  return generateProductCode(name, String(index + 1).padStart(3, "0"));
}

export function normalizeCartForOrder(cartItems) {
  return cartItems.map((item) => {
    const quantity = Number(item.quantity || 0);
    const salePrice = Number(item.sale_price || 0);
    const costPrice = Number(item.cost_price || 0);
    return {
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      category_name: item.category_name || "",
      variant_label: item.variant_label || "",
      quantity,
      sale_price: salePrice,
      cost_price: costPrice,
      line_total: quantity * salePrice,
      line_cost: quantity * costPrice,
    };
  });
}

export function calculateOrderTotals(cartItems, discount = 0) {
  const normalizedItems = normalizeCartForOrder(cartItems);
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);
  const totalCost = normalizedItems.reduce((sum, item) => sum + item.line_cost, 0);
  const safeDiscount = Math.max(0, Number(discount || 0));
  const total = Math.max(0, subtotal - safeDiscount);
  const grossProfit = total - totalCost;
  return { subtotal, discount: safeDiscount, total, total_cost: totalCost, gross_profit: grossProfit, items: normalizedItems };
}

export async function createOrder(orderInput) {
  const supabase = getSupabase();
  const totals = calculateOrderTotals(orderInput.items, orderInput.discount || 0);
  const orderPayload = {
    code: orderInput.code || null,
    customer_name: orderInput.customer_name || "Khách lẻ",
    customer_phone: orderInput.customer_phone || "",
    customer_address: orderInput.customer_address || "",
    created_at: orderInput.created_at || null,
    status: "completed",
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    total_cost: totals.total_cost,
    gross_profit: totals.gross_profit,
    import_source: orderInput.import_source || "pos",
    items: totals.items,
  };
  const { data, error } = await supabase.rpc("create_order_with_stock", { order_payload: orderPayload });
  handleSupabaseError(error, "Không thể tạo đơn hàng và trừ tồn kho.");
  return data;
}

export async function fetchOrders({ status = "", fromDate = "", toDate = "", keyword = "", sort = "newest" } = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from("orders")
    .select(`
      *,
      order_items (
        id,
        product_id,
        variant_id,
        product_name,
        category_name,
        variant_label,
        quantity,
        sale_price,
        cost_price,
        line_total,
        line_cost
      )
    `);
  if (status) query = query.eq("status", status);
  if (fromDate) query = query.gte("created_at", new Date(`${fromDate}T00:00:00`).toISOString());
  if (toDate) query = query.lte("created_at", new Date(`${toDate}T23:59:59`).toISOString());
  if (keyword) {
    const safeKeyword = keyword.replace(/[%_]/g, "");
    query = query.or(`code.ilike.%${safeKeyword}%,customer_name.ilike.%${safeKeyword}%,customer_phone.ilike.%${safeKeyword}%,customer_address.ilike.%${safeKeyword}%`);
  }
  const { data, error } = await query;
  handleSupabaseError(error, "Không thể tải đơn hàng.");
  return sortOrders(data || [], sort);
}

function sortOrders(orders, sort) {
  return [...orders].sort((a, b) => {
    if (sort === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (sort === "total_asc") return Number(a.total || 0) - Number(b.total || 0);
    if (sort === "total_desc") return Number(b.total || 0) - Number(a.total || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

export async function cancelOrder(orderId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("cancel_order_and_restore_stock", { order_id_input: orderId });
  handleSupabaseError(error, "Không thể hủy đơn và hoàn kho.");
  return data;
}

export async function returnOrder(orderId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("return_order_and_restore_stock", { order_id_input: orderId });
  handleSupabaseError(error, "Không thể trả hàng và hoàn kho.");
  return data;
}

export async function updateOrderDetails(orderId, payload = {}) {
  if (!orderId) throw new Error("Thiếu ID đơn hàng.");
  const supabase = getSupabase();
  const { data: before, error: beforeError } = await supabase
    .from("orders")
    .select(`*, order_items (*)`)
    .eq("id", orderId)
    .single();
  handleSupabaseError(beforeError, "Không thể đọc đơn hàng trước khi sửa.");

  if (!before) throw new Error("Không tìm thấy đơn hàng.");
  if (before.status !== "completed") throw new Error("Chỉ cho phép sửa đơn đang hoàn thành.");

  const discount = Math.max(0, Number(payload.discount || 0));
  const subtotal = Number(before.subtotal || 0);
  const totalCost = Number(before.total_cost || 0);
  const total = Math.max(0, subtotal - discount);
  const grossProfit = total - totalCost;

  const updatePayload = {
    customer_name: cleanText(payload.customer_name) || "Khách lẻ",
    customer_phone: cleanText(payload.customer_phone),
    customer_address: cleanText(payload.customer_address),
    discount,
    total,
    gross_profit: grossProfit,
  };

  const { data: after, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .select(`*, order_items (*)`)
    .single();
  handleSupabaseError(error, "Không thể cập nhật đơn hàng.");

  await logActivity({
    action: "order_updated",
    entity_type: "order",
    entity_id: orderId,
    code: after.code,
    description: `Sửa đơn hàng ${after.code}: cập nhật khách hàng, số điện thoại, địa chỉ hoặc giảm giá`,
    amount: after.total,
    metadata: { before, after, changed_fields: updatePayload },
  });
  return after;
}


export function normalizeOrderImportRows(rawRows = []) {
  return rawRows
    .map((row, index) => ({ ...normalizeOrderImportRow(row), row_number: index + 2 }))
    .filter((row) => row.order_code || row.product_code || row.sku || row.product_name);
}

function normalizeOrderImportRow(row) {
  const get = (...keys) => {
    for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
    return "";
  };
  return {
    order_code: cleanText(get("order_code", "Mã đơn", "ma_don")) || `IMPORT_${Date.now()}`,
    created_at: normalizeDateValue(get("created_at", "Ngày bán", "ngay_ban")),
    customer_name: cleanText(get("customer_name", "Khách hàng", "khach_hang")) || "Khách lẻ",
    customer_phone: cleanText(get("customer_phone", "SĐT", "sdt")),
    customer_address: cleanText(get("customer_address", "Địa chỉ", "dia_chi")),
    discount: cleanNumber(get("discount", "Giảm giá", "giam_gia")),
    product_code: cleanText(get("product_code", "Mã sản phẩm", "ma_san_pham")),
    sku: cleanText(get("sku", "SKU", "ma_sku")),
    product_name: cleanText(get("product_name", "Tên sản phẩm", "ten_san_pham")),
    variant_label: cleanText(get("variant_label", "Biến thể", "bien_the")),
    quantity: cleanInteger(get("quantity", "Số lượng", "so_luong")) || 1,
    sale_price: cleanNumber(get("sale_price", "Giá bán", "gia_ban")),
    cost_price: cleanNumber(get("cost_price", "Giá vốn", "gia_von")),
  };
}

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function importOrdersFromRows(rawRows = []) {
  const rows = normalizeOrderImportRows(rawRows);
  if (!rows.length) throw new Error("File Excel không có dòng đơn hàng hợp lệ.");
  const products = await fetchProducts({ sort: "name_asc" });
  const groups = new Map();
  const errors = [];

  for (const row of rows) {
    const matched = findVariantForImport(products, row);
    if (!matched) {
      errors.push(`Dòng ${row.row_number}: không tìm thấy sản phẩm/biến thể cho SKU '${row.sku}' hoặc '${row.product_name}'.`);
      continue;
    }
    if (!groups.has(row.order_code)) {
      groups.set(row.order_code, {
        code: row.order_code,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        customer_address: row.customer_address,
        created_at: row.created_at,
        discount: row.discount,
        items: [],
      });
    }
    groups.get(row.order_code).items.push({
      product_id: matched.product.id,
      variant_id: matched.variant.id,
      product_name: matched.product.name,
      category_name: matched.product.categories?.name || "",
      variant_label: getVariantLabel(matched.variant),
      quantity: row.quantity,
      sale_price: row.sale_price || Number(matched.variant.sale_price || 0),
      cost_price: row.cost_price || Number(matched.variant.cost_price || 0),
      stock_qty: Number(matched.variant.stock_qty || 0),
    });
  }

  if (errors.length) throw new Error(errors.slice(0, 10).join("\n"));

  let orderCount = 0;
  let itemCount = 0;
  for (const group of groups.values()) {
    await createOrder({ ...group, import_source: "excel" });
    orderCount += 1;
    itemCount += group.items.length;
  }

  await logActivity({
    action: "order_imported",
    entity_type: "order",
    code: "IMPORT_ORDERS",
    description: `Import ${orderCount} đơn hàng, ${itemCount} dòng chi tiết từ Excel`,
    metadata: { order_count: orderCount, item_count: itemCount, row_count: rows.length },
  });
  return { orderCount, itemCount, rowCount: rows.length };
}

function findVariantForImport(products, row) {
  const targetCode = String(row.product_code || "").toLowerCase();
  const targetSku = String(row.sku || "").toLowerCase();
  const targetProduct = String(row.product_name || "").toLowerCase();
  const targetVariant = String(row.variant_label || "").toLowerCase();
  for (const product of products) {
    const productMatch = targetCode
      ? String(product.product_code || "").toLowerCase() === targetCode
      : targetSku
        ? String(product.sku || "").toLowerCase() === targetSku
        : String(product.name || "").toLowerCase() === targetProduct;
    if (!productMatch) continue;
    const variants = product.product_variants || [];
    if (!targetVariant && variants.length === 1) return { product, variant: variants[0] };
    const variant = variants.find((item) => getVariantLabel(item).toLowerCase() === targetVariant || String(item.variant_name || "").toLowerCase() === targetVariant);
    if (variant) return { product, variant };
  }
  return null;
}

function toLocalDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOrderLocalDateKey(value) {
  if (!value) return "";
  return toLocalDateInput(new Date(value));
}

export function getDateRange(period = "today", customFrom = "", customTo = "") {
  const now = new Date();
  const today = toLocalDateInput(now);

  if (period === "custom") {
    return {
      fromDate: customFrom || "",
      toDate: customTo || customFrom || today,
    };
  }

  if (period === "today") {
    return { fromDate: today, toDate: today };
  }

  if (period === "month") {
    return {
      fromDate: toLocalDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      toDate: today,
    };
  }

  if (period === "year") {
    return {
      fromDate: toLocalDateInput(new Date(now.getFullYear(), 0, 1)),
      toDate: today,
    };
  }

  return { fromDate: "", toDate: "" };
}

export async function fetchRevenueReport(period = "today", { fromDate: customFrom = "", toDate: customTo = "" } = {}) {
  const { fromDate, toDate } = getDateRange(period, customFrom, customTo);
  const orders = await fetchOrders({ fromDate, toDate, sort: "newest" });
  const completed = orders.filter((order) => order.status === "completed");
  const revenue = completed.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const cost = completed.reduce((sum, order) => sum + Number(order.total_cost || 0), 0);
  const grossProfit = completed.reduce((sum, order) => sum + Number(order.gross_profit || 0), 0);
  const soldQty = completed.flatMap((order) => order.order_items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const cancelledCount = orders.filter((order) => order.status === "cancelled").length;
  const returnedCount = orders.filter((order) => order.status === "returned").length;
  const margin = revenue > 0 ? grossProfit / revenue : 0;
  const aov = completed.length ? revenue / completed.length : 0;
  return { period, revenue, cost, grossProfit, margin, aov, soldQty, orderCount: completed.length, cancelledCount, returnedCount, orders, completed };
}

export async function fetchGrowthChartData(period = "month", custom = {}) {
  const report = await fetchRevenueReport(period, custom);
  const groupMap = new Map();
  for (const order of report.completed) {
    const dateKey = getOrderLocalDateKey(order.created_at);
    if (!dateKey) continue;
    if (!groupMap.has(dateKey)) groupMap.set(dateKey, { date: dateKey, revenue: 0, grossProfit: 0 });
    const current = groupMap.get(dateKey);
    current.revenue += Number(order.total || 0);
    current.grossProfit += Number(order.gross_profit || 0);
  }
  return Array.from(groupMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function logActivity({ action, entity_type, entity_id = null, code = "", description = "", amount = null, metadata = {} }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("activity_logs")
    .insert({ action, entity_type, entity_id, code, description, amount, metadata })
    .select()
    .single();
  if (error) {
    console.warn("Không thể ghi lịch sử hoạt động:", error.message);
    return null;
  }
  return data;
}

export async function fetchActivityLogs({ keyword = "", action = "", sort = "newest", limit = 100 } = {}) {
  const supabase = getSupabase();
  let query = supabase.from("activity_logs").select("*").limit(limit);
  if (action) query = query.eq("action", action);
  if (keyword) {
    const safeKeyword = keyword.replace(/[%_]/g, "");
    query = query.or(`code.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%`);
  }
  query = query.order("created_at", { ascending: sort === "oldest" });
  const { data, error } = await query;
  handleSupabaseError(error, "Không thể tải lịch sử hoạt động.");
  return data || [];
}
