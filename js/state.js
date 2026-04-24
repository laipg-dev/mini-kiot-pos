export const state = {
  currentView: "Dashboard",
  products: [],
  categories: [],
  orders: [],
  activityLogs: [],
  cart: [],
  productKeyword: "",
  productCategoryFilter: "",
  productStockFilter: "",
  productSort: "newest",
  posKeyword: "",
  posCategoryFilter: "",
  posSort: "name_asc",
  orderKeyword: "",
  orderStatusFilter: "",
  orderDateFrom: "",
  orderDateTo: "",
  orderSort: "newest",
  historyKeyword: "",
  historyActionFilter: "",
  historySort: "newest",
  reportPeriod: "today",
  reportDateFrom: "",
  reportDateTo: "",
  report: null,
  chartData: [],
};

export function setState(patch) {
  Object.assign(state, patch);
}

export function findProductVariant(variantId) {
  for (const product of state.products) {
    const variant = product.product_variants?.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

export function parseAttributes(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return String(value)
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [rawKey, ...rest] = part.split("=");
      const key = String(rawKey || "").trim();
      const val = rest.join("=").trim();
      if (key && val) acc[key] = val;
      return acc;
    }, {});
}

export function attributesToText(attributes = {}) {
  if (!attributes || typeof attributes !== "object") return "";
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}

export function getVariantLabel(variant = {}) {
  if (variant.variant_name) return variant.variant_name;
  const baseLabels = [variant.size, variant.color].filter(Boolean);
  const attributeText = attributesToText(variant.attributes);
  const labels = [...baseLabels, attributeText].filter(Boolean);
  return labels.length ? labels.join(" / ") : "Mặc định";
}

export function getProductTotalStock(product) {
  return (product.product_variants || []).reduce((sum, variant) => sum + Number(variant.stock_qty || 0), 0);
}

export function getProductMinPrice(product) {
  const prices = (product.product_variants || []).map((variant) => Number(variant.sale_price || 0));
  return prices.length ? Math.min(...prices) : 0;
}

export function addToCart(variantId) {
  const found = findProductVariant(variantId);
  if (!found) throw new Error("Không tìm thấy sản phẩm.");
  const { product, variant } = found;
  const stock = Number(variant.stock_qty || 0);
  if (stock <= 0) throw new Error("Sản phẩm đã hết hàng.");
  const existing = state.cart.find((item) => item.variant_id === variantId);
  if (existing) {
    if (existing.quantity + 1 > stock) throw new Error("Số lượng vượt quá tồn kho.");
    existing.quantity += 1;
    return existing;
  }
  const cartItem = {
    product_id: product.id,
    variant_id: variant.id,
    product_name: product.name,
    category_name: product.categories?.name || "Chưa phân loại",
    variant_label: getVariantLabel(variant),
    quantity: 1,
    cost_price: Number(variant.cost_price || 0),
    sale_price: Number(variant.sale_price || 0),
    stock_qty: stock,
    image_url: product.image_url,
  };
  state.cart.push(cartItem);
  return cartItem;
}

export function updateCartQuantity(variantId, quantity) {
  const item = state.cart.find((cartItem) => cartItem.variant_id === variantId);
  if (!item) return;
  const nextQuantity = Number(quantity || 0);
  if (nextQuantity <= 0) {
    removeFromCart(variantId);
    return;
  }
  if (nextQuantity > item.stock_qty) throw new Error("Số lượng vượt quá tồn kho.");
  item.quantity = nextQuantity;
}

export function removeFromCart(variantId) {
  state.cart = state.cart.filter((item) => item.variant_id !== variantId);
}

export function clearCart() {
  state.cart = [];
}

export function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + Number(item.sale_price || 0) * Number(item.quantity || 0), 0);
}

export function getCartTotal(discount = 0) {
  return Math.max(0, getCartSubtotal() - Number(discount || 0));
}
