import { useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { TrackerDialog } from "./AddEntryModal";
import { Button } from "./Button";
import { Dropdown } from "./Dropdown";
import { DatePicker } from "./DatePicker";
import { TextBox } from "./TextBox";
import { parseLei } from "../Resources/expenseLedger";
import { formatStockQuantity, parseStockQuantity, shoppingProductLabel, STOCK_UNITS } from "../Resources/shoppingLedger";
import { COLORS } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import { getLocalDateKey } from "../Resources/trackerStorage";
import type { ShoppingAction, ShoppingBook, StockUnit } from "../Resources/types";

// All shopping workflows use shared controls and the same bounded, closeable dialog surface.
// Product names are created separately from supermarket-specific price assignments.
export type ShoppingEditor = { mode: "supermarket" | "product" | "offer" | "price" | "addToList" | "removeFromList" | "location" | "addStock" | "setStock" | "buy" | "unbuy";
  supermarketId?: string; productId?: string; offerId?: string; locationId?: string; stockId?: string; itemId?: string };
type Props = { editor: ShoppingEditor; book: ShoppingBook; onSave: (action: ShoppingAction) => Promise<void>; onClose: () => void };

export function ShoppingEditorModal({ editor, book, onSave, onClose }: Props) {
  const { mode } = editor;
  const initialOffer = book.offers.find((item) => item.id === editor.offerId);
  const initialStock = book.stock.find((item) => item.id === editor.stockId);
  const listItem = book.items.find((item) => item.id === editor.itemId);
  const [name, setName] = useState("");
  const [supermarketId, setSupermarketId] = useState(editor.supermarketId ?? initialOffer?.supermarketId);
  // Saved IDs cannot be empty, so the new-product choice never collides with an imported product.
  const [productId, setProductId] = useState(editor.productId ?? "");
  // The optional amount is chosen for this shopping trip, separately from inventory additions.
  const [listAmount, setListAmount] = useState("");
  const [listUnit, setListUnit] = useState<"grams" | "units">("units");
  const [itemId, setItemId] = useState(editor.itemId);
  const [locationId, setLocationId] = useState(editor.locationId);
  const [unit, setUnit] = useState<StockUnit>(initialStock?.unit ?? "units");
  const [quantity, setQuantity] = useState(initialStock ? String(initialStock.quantityMilli / 1000) : "1");
  // Leaving this off never assigns a date to new stock; editing an item can explicitly clear it.
  const [hasExpiry, setHasExpiry] = useState(!!initialStock?.expiryDate);
  const [expiryDate, setExpiryDate] = useState(() => initialStock?.expiryDate ? new Date(`${initialStock.expiryDate}T12:00:00`) : new Date());
  const [price, setPrice] = useState(initialOffer ? (initialOffer.priceBani / 100).toFixed(2) : "");
  // Brand belongs to the supermarket offer and can differ across stores.
  const [brand, setBrand] = useState(initialOffer?.brand ?? "");
  const [onSale, setOnSale] = useState(initialOffer?.salePriceBani != null);
  const [salePrice, setSalePrice] = useState(initialOffer?.salePriceBani != null ? (initialOffer.salePriceBani / 100).toFixed(2) : "");
  const [addInventory, setAddInventory] = useState(false);
  const [reverseInventory, setReverseInventory] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const productName = (id?: string) => { const product = book.products.find((item) => item.id === id); return product ? shoppingProductLabel(product) : ""; };
  const supermarketName = (id?: string) => book.supermarkets.find((item) => item.id === id)?.name ?? "";
  const chosenProduct = productId === "" ? !!name.trim() : book.products.some((item) => item.id === productId && !item.archived);
  const supermarketChosen = book.supermarkets.some((item) => item.id === supermarketId && !item.archived);
  const locationChosen = book.locations.some((item) => item.id === locationId && !item.archived);
  // Any saved product can join the list, even before it has a supermarket or a price.
  const addable = book.products.filter((item) => !item.archived && !book.items.some((listed) => !listed.bought && listed.productId === item.id));
  const addition = listItem?.inventoryAddition;
  const addedStock = book.stock.find((item) => item.id === addition?.stockId);
  const canReverse = !!addition && !!addedStock && addedStock.quantityMilli >= addition.quantityMilli;
  const titles: Record<ShoppingEditor["mode"], string> = { supermarket: "Add a supermarket", product: "Add a product", offer: "Add a supermarket product", price: "Update product price",
    addToList: "Add a product to the list", removeFromList: "Remove a product from the list", location: "Add an inventory location",
    addStock: "Add inventory stock", setStock: "Update inventory item", buy: "Mark as bought", unbuy: "Uncheck bought item" };
  const selectingProduct = mode === "offer" || mode === "addStock";
  const pricing = mode === "offer" || mode === "price";
  const stockForm = mode === "addStock" || mode === "setStock" || (mode === "buy" && addInventory);
  const canSave = mode === "supermarket" || mode === "location" ? !!name.trim()
    : mode === "product" ? !!name.trim()
    : mode === "offer" ? supermarketChosen && chosenProduct && !!price.trim() && (!onSale || !!salePrice.trim())
    : mode === "price" ? !!initialOffer && !!price.trim() && (!onSale || !!salePrice.trim())
    : mode === "addToList" ? addable.some((item) => item.id === productId)
    : mode === "removeFromList" ? book.items.some((item) => !item.bought && item.id === itemId)
    : mode === "addStock" ? locationChosen && chosenProduct && !!quantity.trim()
    : mode === "setStock" ? !!initialStock && !!quantity.trim()
    : mode === "buy" ? !!listItem && !listItem.bought && (!addInventory || (locationChosen && !!quantity.trim()))
    : !!listItem?.bought && (!reverseInventory || canReverse);
  const close = () => { if (!pending.current) onClose(); };

  // Inventory choices are explicit, and a purchase/stock pair is submitted as one atomic action.
  const save = async () => {
    if (pending.current || !canSave) return;
    pending.current = true; setSaving(true); setError(""); setSuccess("");
    try {
      let action: ShoppingAction;
      const selectedExpiry = hasExpiry ? getLocalDateKey(expiryDate) : null;
      const listQuantity = mode === "addToList" && listAmount.trim() ? {
        amountMilli: parseStockQuantity(listAmount, listUnit), unit: listUnit,
      } : undefined;
      if (mode === "supermarket" || mode === "location") action = { type: mode, name };
      else if (mode === "product") action = { type: "product", name };
      else if (mode === "offer") action = { type: "product", productId: productId === "" ? undefined : productId, name, supermarketId: supermarketId!,
        priceBani: parseLei(price), salePriceBani: onSale ? parseLei(salePrice) : null, brand };
      else if (mode === "price") action = { type: "price", offerId: editor.offerId!, priceBani: parseLei(price), salePriceBani: onSale ? parseLei(salePrice) : null, brand };
      else if (mode === "addToList") action = { type: "addToList", productId, ...(listQuantity ? { quantity: listQuantity } : {}) };
      else if (mode === "removeFromList") action = { type: "removeFromList", itemId: itemId! };
      else if (mode === "addStock") action = { type: "addStock", productId: productId === "" ? undefined : productId, name,
        locationId: locationId!, unit, quantityMilli: parseStockQuantity(quantity, unit), ...(hasExpiry ? { expiryDate: selectedExpiry } : {}) };
      else if (mode === "setStock") action = { type: "setStock", stockId: editor.stockId!, quantityMilli: parseStockQuantity(quantity, initialStock!.unit, true), expiryDate: selectedExpiry };
      else if (mode === "buy") action = { type: "buy", itemId: editor.itemId!, ...(addInventory ? { inventory: {
        locationId: locationId!, unit, quantityMilli: parseStockQuantity(quantity, unit), ...(hasExpiry ? { expiryDate: selectedExpiry } : {}),
      } } : {}) };
      else action = { type: "unbuy", itemId: editor.itemId!, reverseInventory };
      await onSave(action);
      if (["addToList", "removeFromList", "buy", "unbuy"].includes(mode)) { onClose(); return; }
      setSuccess(mode === "supermarket" ? `Supermarket added: ${name.trim()}.` : mode === "location" ? `Inventory location added: ${name.trim()}.`
        : mode === "product" ? "Product saved." : mode === "offer" ? "Supermarket price saved." : mode === "price" ? "Product price updated." : mode === "addStock" ? "Quantity added to inventory." : "Inventory item updated.");
      if (["supermarket", "location", "product", "offer", "addStock"].includes(mode)) setName("");
      if (mode === "offer") { setPrice(""); setSalePrice(""); setBrand(""); }
      // Reset the optional date between additions so the next product does not inherit it.
      if (mode === "addStock") { setQuantity(""); setHasExpiry(false); setExpiryDate(new Date()); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again."); }
    finally { pending.current = false; setSaving(false); }
  };

  return <TrackerDialog title={titles[mode]} onClose={close} closeLabel="Close shopping dialog"
    description={mode === "product" ? "Save a product for shopping and inventory." : mode === "offer" ? "Save regular and sale prices for this supermarket." : mode === "buy" ? "Mark the item as bought, with an optional inventory update."
      : mode === "removeFromList" ? "Saved products, supermarket prices, and inventory are kept." : mode === "unbuy" ? "Uncheck the item and choose whether to reverse its inventory addition." : undefined}
    footer={<View style={[styles.actions, Platform.OS === "android" && mode === "buy" && styles.buyActions]}>
      <Button disabled={saving} icon="close" label="Close" onPress={close} variant="secondary" />
      <Button disabled={saving || !canSave} icon={mode === "removeFromList" ? "removeHabit" : mode === "buy" ? "check" : "save"}
        label={saving ? "Saving…" : mode === "buy" ? "Mark as bought" : mode === "unbuy" ? "Uncheck" : mode === "addToList" ? "Add to list" : mode === "removeFromList" ? "Remove" : "Save"}
        onPress={() => { void save(); }} />
    </View>}>
    {mode === "supermarket" || mode === "location" || mode === "product" ? <TextBox disabled={saving} label={mode === "supermarket" ? "Supermarket name" : mode === "product" ? "Product name" : "Location name"}
      value={name} onChangeText={(value) => { setName(value); setSuccess(""); }} placeholder={mode === "supermarket" ? "Lidl" : mode === "product" ? "Milk" : "Fridge, Cellar, Pantry…"} /> : null}
    {mode === "offer" ? <>
      <Dropdown disabled={saving} label="Supermarket" placeholder="Choose a supermarket" options={book.supermarkets.filter((item) => !item.archived).map((item) => ({ label: item.name, value: item.id }))}
        value={supermarketId} onChange={setSupermarketId} />
      {!book.supermarkets.some((item) => !item.archived) ? <Text style={styles.note}>Add a supermarket using Options first.</Text> : null}
    </> : null}
    {selectingProduct ? <>
      <Dropdown disabled={saving} label="Product" value={productId} onChange={(value) => { setProductId(value); setSuccess(""); }}
        options={[{ label: "Create a new product", value: "" }, ...book.products.filter((item) => !item.archived).map((item) => ({ label: shoppingProductLabel(item), value: item.id }))]} />
      {productId === "" ? <TextBox disabled={saving} label="Product name" value={name} onChangeText={(value) => { setName(value); setSuccess(""); }} placeholder="Milk" /> : null}
    </> : null}
    {mode === "price" && initialOffer ? <Text style={styles.note}>{productName(initialOffer.productId)} · {supermarketName(initialOffer.supermarketId)}</Text> : null}
    {pricing ? <>
      {/* Use the shared field for an optional store-specific brand beside the existing price controls. */}
      <TextBox disabled={saving} label="Brand (optional)" value={brand} onChangeText={(value) => { setBrand(value); setSuccess(""); }} placeholder="e.g. Zuzu" />
      <TextBox disabled={saving} label="Regular price (lei)" value={price} onChangeText={(value) => { setPrice(value); setSuccess(""); }} placeholder="0,00" />
      <View style={styles.checkboxRow}><Button checked={onSale} disabled={saving} label="Include sale price" onPress={() => setOnSale((value) => !value)} /><Text style={styles.note}>Include sale price</Text></View>
      {onSale ? <TextBox disabled={saving} label="Sale price (lei)" value={salePrice} onChangeText={(value) => { setSalePrice(value); setSuccess(""); }} placeholder="0,00" /> : null}
    </> : null}
    {mode === "addToList" ? <>
      <Dropdown disabled={saving} label="Product" placeholder="Choose a product" value={productId} onChange={setProductId}
        options={addable.map((item) => ({ label: shoppingProductLabel(item), value: item.id }))} />
      {/* Requested amounts belong only to the shopping-list entry, never the saved product. */}
      <TextBox disabled={saving} label="Quantity (optional)" value={listAmount} onChangeText={(value) => { setListAmount(value); setSuccess(""); }}
        placeholder={listUnit === "grams" ? "500" : "6"} helperText="Leave blank to add without a quantity." />
      <Dropdown disabled={saving} label="Quantity unit" value={listUnit} options={[{ label: "Grams", value: "grams" }, { label: "Units", value: "units" }]}
        onChange={(value) => { setListUnit(value as "grams" | "units"); setSuccess(""); }} />
      {!addable.length ? <Text style={styles.note}>No saved products available to add. Create a product first or remove an existing list item.</Text> : null}
    </> : null}
    {mode === "removeFromList" ? <Dropdown disabled={saving} label="List item" placeholder="Choose an item" value={itemId} onChange={setItemId} options={book.items.filter((item) => !item.bought).map((item) => {
      const offer = book.offers.find((saved) => saved.id === item.offerId);
      return { label: `${productName(item.productId)}${offer ? ` · ${supermarketName(offer.supermarketId)}` : ""}`, value: item.id };
    })} /> : null}
    {mode === "buy" || mode === "unbuy" ? <>
      <Text style={styles.note}>{productName(listItem?.productId)}</Text>
      {mode === "buy" ? <View style={styles.checkboxRow}>
        <Button checked={addInventory} disabled={saving} label="Add to inventory" onPress={() => setAddInventory((value) => !value)} /><Text style={styles.note}>Add to inventory</Text>
      </View> : addition ? <>
        <Text style={styles.note}>Added: {formatStockQuantity(addition.quantityMilli, addedStock!.unit)} · {book.locations.find((item) => item.id === addedStock?.locationId)?.name}</Text>
        <View style={styles.checkboxRow}><Button checked={reverseInventory} disabled={saving || !canReverse} label="Reverse inventory addition" onPress={() => setReverseInventory((value) => !value)} /><Text style={styles.note}>Reverse inventory addition</Text></View>
        {!canReverse ? <Text style={styles.note}>That quantity is no longer available. You can uncheck the item and keep the current stock.</Text> : null}
      </> : null}
    </> : null}
    {stockForm ? <>
      {mode === "setStock" ? <Text style={styles.note}>{productName(initialStock?.productId)} · {book.locations.find((item) => item.id === initialStock?.locationId)?.name}</Text> : <>
        <Dropdown disabled={saving} label="Inventory location" placeholder="Choose a location" value={locationId} onChange={setLocationId}
          options={book.locations.filter((item) => !item.archived).map((item) => ({ label: item.name, value: item.id }))} />
        {!book.locations.some((item) => !item.archived) ? <Text style={styles.note}>Add a storage location in Inventory first.</Text> : null}
        <Dropdown disabled={saving} label="Unit" value={unit} options={STOCK_UNITS} onChange={(value) => setUnit(value as StockUnit)} />
      </>}
      <TextBox disabled={saving} label={mode === "setStock" ? `Current quantity (${initialStock?.unit})` : `Quantity to add (${unit})`}
        value={quantity} onChangeText={(value) => { setQuantity(value); setSuccess(""); }} placeholder="1"
        helperText={unit === "grams" ? "Grams accept up to three decimal places." : "Enter a whole number."} />
      {/* Reuse the shared calendar; the checkbox makes setting or clearing expiry explicit. */}
      <View style={styles.checkboxRow}>
        <Button checked={hasExpiry} disabled={saving} label="Set expiry date (optional)" onPress={() => { setHasExpiry((value) => !value); setSuccess(""); }} />
        <Text style={styles.note}>Set expiry date (optional)</Text>
      </View>
      {hasExpiry ? <>
        <DatePicker disabled={saving} inlineCalendar label="Expiry date" value={expiryDate} onChange={(date) => { setExpiryDate(date); setSuccess(""); }} />
        <Text style={styles.note}>Applies to this inventory item's entire quantity.</Text>
      </> : <Text style={styles.note}>{mode === "setStock" ? "Save with this option off to remove the expiry date." : "Adding more stock keeps any saved expiry date unless you select a new one."}</Text>}
    </> : null}
    {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </TrackerDialog>;
}

const styles = StyleSheet.create({
  // Match existing tracker forms, including compact left-hand checkboxes and wrap-safe labels.
  // The full purchase label needs its own row on narrow Android dialogs.
  actions: { flexDirection: "row", gap: 10, marginTop: 4 }, buyActions: { flexDirection: "column" }, checkboxRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 14, flexShrink: 1 },
  success: { color: COLORS.gradientGreen, fontFamily: FONT_FAMILY.medium, fontSize: 14 }, error: { color: COLORS.gradientPlum, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
});
