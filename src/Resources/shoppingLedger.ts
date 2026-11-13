import type { InventoryStock, ShoppingAction, ShoppingBook, ShoppingItem, ShoppingProduct, ShoppingQuantity, StockUnit } from "./types";

// One local model shares product names, supermarket prices, checklist membership, and inventory stock.
export const STOCK_UNITS: { label: string; value: StockUnit }[] = [
  { label: "Bottles", value: "bottles" }, { label: "Cans", value: "cans" },
  { label: "Units", value: "units" }, { label: "Grams", value: "grams" },
];
const LIMIT = 1_000_000_000_000;
const normalized = (value: string) => value.trim().toLocaleLowerCase("en");
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const emptyShoppingBook = (): ShoppingBook => ({ products: [], supermarkets: [], offers: [], items: [], locations: [], stock: [] });
// A sale is a reference price, not an automatic replacement for the regular product price.
export const offerPrice = (offer: ShoppingBook["offers"][number]) => offer.priceBani;
const validMoney = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= LIMIT;
const validUnit = (unit: unknown): unit is StockUnit => STOCK_UNITS.some((item) => item.value === unit);
const validQuantity = (amount: unknown, unit: StockUnit, positive = false): amount is number =>
  typeof amount === "number" && Number.isSafeInteger(amount) && amount >= (positive ? 1 : 0) && amount <= LIMIT && (unit === "grams" || amount % 1000 === 0);

// Validate calendar dates without UTC conversion; legacy stock can have no expiry at all.
export function parseStockExpiry(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid expiry date.");
  const date = new Date(`${value}T12:00:00`);
  if (date.getFullYear() !== Number(value.slice(0, 4)) || date.getMonth() + 1 !== Number(value.slice(5, 7)) || date.getDate() !== Number(value.slice(8, 10))) {
    throw new Error("Choose a valid expiry date.");
  }
  return value;
}

// Countable containers stay whole numbers; grams accept up to three decimal places without rounding.
export function parseStockQuantity(value: string, unit: StockUnit, allowZero = false): number {
  const text = value.trim();
  if (!validUnit(unit) || !(unit === "grams" ? /^\d+(?:[.,]\d{1,3})?$/ : /^\d+$/).test(text)) {
    throw new Error(unit === "grams" ? "Enter grams with up to three decimal places." : "Enter a whole number of bottles, cans, or units.");
  }
  const [whole, fraction = ""] = text.split(/[.,]/);
  const amount = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  if (!validQuantity(amount, unit, !allowZero)) throw new Error(`Enter a quantity ${allowZero ? "of zero or more" : "greater than zero"} within the supported range.`);
  return amount;
}
export function formatStockQuantity(amount: number, unit: StockUnit): string {
  const quantity = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 3 }).format(amount / 1000);
  const singular = { bottles: "bottle", cans: "can", units: "unit", grams: "g" };
  return `${quantity} ${unit === "grams" || amount === 1000 ? singular[unit] : unit}`;
}

// Validate the amount to buy independently of product pricing and inventory stock.
export function parseShoppingQuantity(value: unknown): ShoppingQuantity {
  const quantity = value as ShoppingQuantity;
  if (!quantity || (quantity.unit !== "grams" && quantity.unit !== "units") || !validQuantity(quantity.amountMilli, quantity.unit, true)) {
    throw new Error("Enter a shopping quantity greater than zero in Grams or whole Units.");
  }
  return { amountMilli: quantity.amountMilli, unit: quantity.unit };
}
export function shoppingProductLabel(product: ShoppingProduct): string {
  return product.name;
}
// Only the shopping-list row displays a requested amount; all saved-product labels remain name-only.
export function shoppingItemLabel(item: ShoppingItem, product: ShoppingProduct): string {
  return item.quantity ? `${product.name} · ${formatStockQuantity(item.quantity.amountMilli, item.quantity.unit)}` : product.name;
}

// Validate every foreign key and composite identity before any local write or backup import.
export function parseShoppingBook(value: unknown): ShoppingBook {
  if (value === undefined) return emptyShoppingBook();
  const fail = (): never => { throw new Error("The shopping data contains invalid products, prices, list items, or inventory."); };
  if (!value || typeof value !== "object") return fail();
  const book = value as ShoppingBook;
  const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
  const array = <T extends { id: string }>(input: T[], parse: (item: T) => T): T[] => {
    if (!Array.isArray(input)) return fail();
    const seen = new Set<string>();
    return input.map((item) => {
      if (!item || !text(item.id) || seen.has(item.id)) return fail();
      seen.add(item.id); return parse(item);
    });
  };
  const named = <T extends { id: string; name: string; archived?: true }>(input: T[]) => {
    const names = new Set<string>();
    return array(input, (item) => {
      if (!text(item.name) || (item.archived !== undefined && item.archived !== true) || (!item.archived && names.has(normalized(item.name)))) return fail();
      // Deleted names may be reused while their original records keep stable IDs.
      if (!item.archived) names.add(normalized(item.name));
      return { id: item.id, name: item.name.trim(), ...(item.archived ? { archived: true as const } : {}) } as T;
    });
  };
  const products = named(book.products).map((item, index) => ({ ...item,
    ...(book.products[index].quantity !== undefined ? { quantity: parseShoppingQuantity(book.products[index].quantity) } : {}) }));
  const supermarkets = named(book.supermarkets), locations = named(book.locations);
  const productIds = new Set(products.map((item) => item.id)), supermarketIds = new Set(supermarkets.map((item) => item.id)), locationIds = new Set(locations.map((item) => item.id));
  const pairs = new Set<string>();
  const offers = array(book.offers, (item) => {
    const pair = JSON.stringify([item.productId, item.supermarketId]);
    if (!productIds.has(item.productId) || !supermarketIds.has(item.supermarketId) || pairs.has(pair) || !validMoney(item.priceBani) ||
        (item.salePriceBani !== null && (!validMoney(item.salePriceBani) || item.salePriceBani >= item.priceBani)) ||
        (item.brand !== undefined && (typeof item.brand !== "string" || !item.brand.trim()))) return fail();
    // Keep the optional brand on this store's offer without changing the generic product.
    pairs.add(pair); return { id: item.id, productId: item.productId, supermarketId: item.supermarketId, priceBani: item.priceBani, salePriceBani: item.salePriceBani,
      ...(item.brand ? { brand: item.brand.trim() } : {}) };
  });
  pairs.clear();
  const stock = array(book.stock, (item) => {
    const pair = JSON.stringify([item.productId, item.locationId, item.unit]);
    if (!productIds.has(item.productId) || !locationIds.has(item.locationId) || !validUnit(item.unit) || !validQuantity(item.quantityMilli, item.unit) || pairs.has(pair)) return fail();
    // The date never changes uniqueness: one row still represents each product/location/unit.
    pairs.add(pair); return { id: item.id, productId: item.productId, locationId: item.locationId, unit: item.unit, quantityMilli: item.quantityMilli,
      expiryDate: parseStockExpiry(item.expiryDate) };
  });
  const stockMap = new Map(stock.map((item) => [item.id, item])), offerMap = new Map(offers.map((item) => [item.id, item]));
  const listed = new Set<string>();
  const items = array(book.items, (item) => {
    // Derive product IDs for older store-bound rows without dropping bought states or stock undo links.
    const offer = item.offerId === undefined ? undefined : offerMap.get(item.offerId);
    const productId = item.productId === undefined ? offer?.productId : item.productId;
    const key = JSON.stringify(item.offerId === undefined ? ["product", productId] : ["legacy", item.offerId]);
    if (!productId || !productIds.has(productId) || (item.offerId !== undefined && (!offer || offer.productId !== productId)) ||
        (!item.bought && listed.has(key)) || typeof item.bought !== "boolean" ||
        (item.bought ? item.paidPriceBani !== undefined && !validMoney(item.paidPriceBani) : item.paidPriceBani !== undefined || item.inventoryAddition !== undefined)) return fail();
    // Repeated purchases can share a product; only pending list membership must be unique.
    if (!item.bought) listed.add(key);
    if (item.boughtAt !== undefined && (!item.bought || typeof item.boughtAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.boughtAt) || !Number.isFinite(Date.parse(item.boughtAt)))) return fail();
    const addition = item.inventoryAddition;
    if (addition !== undefined) {
      const destination = addition && stockMap.get(addition.stockId);
      if (!destination || destination.productId !== productId || !validQuantity(addition.quantityMilli, destination.unit, true)) return fail();
    }
    // Null marks an intentionally blank list amount, preventing legacy product defaults from reappearing.
    const legacyQuantity = products.find((product) => product.id === productId)?.quantity;
    const quantity = item.quantity === undefined ? legacyQuantity ?? null : item.quantity === null ? null : parseShoppingQuantity(item.quantity);
    return { id: item.id, productId, quantity, bought: item.bought,
      ...(item.boughtAt !== undefined ? { boughtAt: item.boughtAt } : {}),
      ...(item.offerId !== undefined ? { offerId: item.offerId } : {}),
      ...(item.paidPriceBani !== undefined ? { paidPriceBani: item.paidPriceBani } : {}),
      ...(addition ? { inventoryAddition: { stockId: addition.stockId, quantityMilli: addition.quantityMilli } } : {}) };
  });
  if (!Number.isSafeInteger(offers.reduce((sum, item) => sum + item.priceBani, 0)) ||
      !Number.isSafeInteger(items.reduce((sum, item) => sum + (item.paidPriceBani ?? 0), 0))) return fail();
  return { products, supermarkets, offers, items, locations, stock };
}

// Pure updates keep buying and its optional stock addition atomic under the root snapshot write guard.
export function applyShoppingAction(current: ShoppingBook, action: ShoppingAction): ShoppingBook {
  let book = parseShoppingBook(current);
  const product = (productId: string | undefined, name: string) => {
    if (productId) {
      const saved = book.products.find((item) => item.id === productId);
      if (!saved || saved.archived) throw new Error("This saved product is no longer available.");
      return saved;
    }
    if (!name.trim()) throw new Error("Enter a product name.");
    const saved = book.products.find((item) => !item.archived && normalized(item.name) === normalized(name));
    if (saved) return saved;
    const created = { id: id(), name: name.trim() };
    book = { ...book, products: [...book.products, created] }; return created;
  };
  const offer = (offerId: string) => {
    const saved = book.offers.find((item) => item.id === offerId);
    if (!saved || book.products.some((item) => item.id === saved.productId && item.archived) ||
        book.supermarkets.some((item) => item.id === saved.supermarketId && item.archived)) throw new Error("Choose a saved product and supermarket.");
    return saved;
  };
  const listItem = (itemId: string) => {
    const saved = book.items.find((item) => item.id === itemId);
    if (!saved) throw new Error("This item is no longer on the shopping list.");
    return saved;
  };
  const prices = (price: number, sale: number | null) => {
    if (!validMoney(price) || (sale !== null && (!validMoney(sale) || sale >= price))) throw new Error("Enter a regular price and an optional sale price below it.");
  };
  const addStock = (productId: string, locationId: string, unit: StockUnit, quantityMilli: number, expiryDate?: string | null): InventoryStock => {
    if (!book.locations.some((item) => item.id === locationId && !item.archived)) throw new Error("Choose an inventory location.");
    if (!validUnit(unit) || !validQuantity(quantityMilli, unit, true)) throw new Error("Enter a valid quantity and unit.");
    const saved = book.stock.find((item) => item.productId === productId && item.locationId === locationId && item.unit === unit);
    // An undated top-up preserves the saved date; selecting a new date updates this same entry.
    const next = { id: saved?.id ?? id(), productId, locationId, unit, quantityMilli: (saved?.quantityMilli ?? 0) + quantityMilli,
      expiryDate: expiryDate === undefined ? saved?.expiryDate ?? null : parseStockExpiry(expiryDate) };
    if (!validQuantity(next.quantityMilli, unit)) throw new Error("The inventory quantity is too large.");
    book = { ...book, stock: saved ? book.stock.map((item) => item.id === saved.id ? next : item) : [...book.stock, next] };
    return next;
  };
  if (action.type === "supermarket" || action.type === "location") {
    const key = action.type === "supermarket" ? "supermarkets" : "locations";
    if (!action.name.trim()) throw new Error(`Enter a ${action.type === "location" ? "storage location" : "supermarket"} name.`);
    if (book[key].some((item) => !item.archived && normalized(item.name) === normalized(action.name))) throw new Error("This name is already saved.");
    book = { ...book, [key]: [...book[key], { id: id(), name: action.name.trim() }] };
  } else if (action.type === "product") {
    if ("quantity" in action && action.quantity !== undefined) throw new Error("Set the quantity when adding the product to the shopping list.");
    // Saving a name is independent of assigning a supermarket and its prices.
    if (action.supermarketId === undefined) {
      if (action.priceBani !== undefined || action.salePriceBani !== undefined || action.brand !== undefined) throw new Error("Choose a supermarket when saving a supermarket price.");
      if (!action.productId && book.products.some((item) => !item.archived && normalized(item.name) === normalized(action.name))) throw new Error("This product is already saved. Add it to the shopping list instead.");
      product(action.productId, action.name);
    } else {
      prices(action.priceBani!, action.salePriceBani!);
      if (!book.supermarkets.some((item) => item.id === action.supermarketId && !item.archived)) throw new Error("Choose a supermarket first.");
      const saved = product(action.productId, action.name);
      if (book.offers.some((item) => item.productId === saved.id && item.supermarketId === action.supermarketId)) throw new Error("This product already has a price at this supermarket. Use its price settings to change it.");
      // Blank brand clears only the store-specific label, never the product's saved name.
      const brand = action.brand?.trim();
      book = { ...book, offers: [...book.offers, { id: id(), productId: saved.id, supermarketId: action.supermarketId, priceBani: action.priceBani!, salePriceBani: action.salePriceBani!,
        ...(brand ? { brand } : {}) }] };
    }
  } else if (action.type === "price") {
    offer(action.offerId); prices(action.priceBani, action.salePriceBani);
    // Updating price can also replace or clear this offer's optional brand.
    const brand = action.brand?.trim();
    book = { ...book, offers: book.offers.map((item) => item.id === action.offerId ? { ...item, priceBani: action.priceBani, salePriceBani: action.salePriceBani,
      ...(action.brand === undefined ? {} : brand ? { brand } : { brand: undefined }) } : item) };
  } else if (action.type === "addToList") {
    const saved = product(action.productId, "");
    if (book.items.some((item) => !item.bought && item.productId === saved.id)) throw new Error("This product is already on the shopping list.");
    const quantity = action.quantity === undefined ? null : parseShoppingQuantity(action.quantity);
    book = { ...book, items: [...book.items, { id: id(), productId: saved.id, quantity, bought: false }] };
  } else if (action.type === "removeFromList") {
    if (listItem(action.itemId).bought) throw new Error("This purchase is in Bought history. Use Undo to return it to the shopping list.");
    // Removing checklist membership keeps saved prices and already recorded inventory intact.
    book = { ...book, items: book.items.filter((item) => item.id !== action.itemId) };
  } else if (action.type === "buy") {
    const item = listItem(action.itemId);
    if (item.bought) throw new Error("This item is already marked as bought.");
    const stock = action.inventory ? addStock(item.productId, action.inventory.locationId, action.inventory.unit, action.inventory.quantityMilli, action.inventory.expiryDate) : undefined;
    book = { ...book, items: book.items.map((saved) => saved.id === item.id ? { ...saved, bought: true, boughtAt: new Date().toISOString(),
      ...(item.offerId ? { paidPriceBani: offerPrice(offer(item.offerId)) } : {}),
      ...(stock && action.inventory ? { inventoryAddition: { stockId: stock.id, quantityMilli: action.inventory.quantityMilli } } : {}) } : saved) };
  } else if (action.type === "unbuy") {
    const item = listItem(action.itemId);
    if (!item.bought) throw new Error("This item is not marked as bought.");
    if (book.products.some((product) => product.id === item.productId && product.archived)) throw new Error("This product was deleted; its purchase stays in history.");
    // Undo restores the original entry and amount without merging different shopping trips.
    if (book.items.some((saved) => saved.id !== item.id && !saved.bought && saved.productId === item.productId)) {
      throw new Error("This product is already on the active list. Remove that entry before undoing this purchase.");
    }
    // Stock reversal is explicit and cannot subtract quantities that have already been used.
    if (action.reverseInventory && item.inventoryAddition) {
      const addition = item.inventoryAddition, stock = book.stock.find((saved) => saved.id === addition.stockId);
      if (!stock || stock.quantityMilli < addition.quantityMilli) throw new Error("There is not enough stock to reverse this addition. Keep the inventory unchanged to uncheck the item.");
      book = { ...book, stock: book.stock.map((saved) => saved.id === stock.id ? { ...saved, quantityMilli: saved.quantityMilli - addition.quantityMilli } : saved) };
    }
    book = { ...book, items: book.items.map((saved) => saved.id === item.id ? { id: saved.id, productId: saved.productId, quantity: saved.quantity,
      ...(saved.offerId !== undefined ? { offerId: saved.offerId } : {}), bought: false } : saved) };
  } else if (action.type === "addStock") {
    const saved = product(action.productId, action.name);
    addStock(saved.id, action.locationId, action.unit, action.quantityMilli, action.expiryDate);
  } else if (action.type === "setStock") {
    const stock = book.stock.find((item) => item.id === action.stockId);
    if (!stock || !validQuantity(action.quantityMilli, stock.unit) || book.products.some((item) => item.id === stock.productId && item.archived) ||
        book.locations.some((item) => item.id === stock.locationId && item.archived)) throw new Error("Enter a valid stock quantity of zero or more.");
    // Quantity edits preserve expiry unless the form explicitly supplies a date or clears it.
    book = { ...book, stock: book.stock.map((item) => item.id === stock.id ? { ...item, quantityMilli: action.quantityMilli,
      expiryDate: action.expiryDate === undefined ? item.expiryDate : parseStockExpiry(action.expiryDate) } : item) };
  } else throw new Error("Unknown shopping action.");
  return parseShoppingBook(book);
}

// Importing the same backup is idempotent; stock amounts are replaced by ID rather than added twice.
export function mergeShoppingBook(current: ShoppingBook, incoming: ShoppingBook | undefined, preserveListQuantity = false, preserveStockExpiry = false, preserveOfferBrand = false): ShoppingBook {
  const local = parseShoppingBook(current);
  if (!incoming) return local;
  const imported = parseShoppingBook(incoming);
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [...new Map([...a, ...b].map((item) => [item.id, item])).values()];
  // Keep hidden legacy amounts, while older formats cannot overwrite quantities now chosen per list entry.
  const products = imported.products.map((item) => {
    const existing = local.products.find((saved) => saved.id === item.id);
    if (existing?.archived) return existing;
    return { ...item, ...(item.quantity === undefined && existing?.quantity ? { quantity: existing.quantity } : {}),
    };
  });
  const items = imported.items.map((item) => {
    const existing = local.items.find((saved) => saved.id === item.id);
    return preserveListQuantity && existing ? { ...item, quantity: existing.quantity } : item;
  });
  // Importing a backup from before expiry support cannot erase a matching stock entry's date.
  const stock = imported.stock.map((item) => {
    const existing = local.stock.find((saved) => saved.id === item.id);
    return preserveStockExpiry && existing ? { ...item, expiryDate: existing.expiryDate } : item;
  });
  // A backup from before brands existed cannot erase a local brand on the same store offer.
  const offers = imported.offers.map((item) => {
    const existing = local.offers.find((saved) => saved.id === item.id);
    return preserveOfferBrand && existing?.brand ? { ...item, brand: existing.brand } : item;
  });
  const stickyArchive = <T extends { id: string; archived?: true }>(saved: T[], importedItems: T[]) => merge(saved, importedItems).map((item) =>
    saved.find((localItem) => localItem.id === item.id && localItem.archived) ?? item);
  const mergedProducts = merge(local.products, products);
  return parseShoppingBook({ products: mergedProducts, supermarkets: stickyArchive(local.supermarkets, imported.supermarkets),
    offers: merge(local.offers, offers), items: merge(local.items, items).filter((item) => item.bought || !mergedProducts.some((product) => product.id === item.productId && product.archived)),
    locations: stickyArchive(local.locations, imported.locations), stock: merge(local.stock, stock) });
}
