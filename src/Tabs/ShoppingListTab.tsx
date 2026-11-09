import { useRef, useState, type ComponentRef } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ActionMenu } from "../Components/ActionMenu";
import { Button } from "../Components/Button";
import { TrackerDialog } from "../Components/AddEntryModal";
import { ShoppingEditorModal, type ShoppingEditor } from "../Components/ShoppingEditorModal";
import { formatLei } from "../Resources/expenseLedger";
import { formatStockQuantity, offerPrice, shoppingItemLabel, shoppingProductLabel } from "../Resources/shoppingLedger";
import { COLORS, SOFT_SHADOW } from "../Resources/theme";
import { FONT_FAMILY } from "../Resources/typography";
import type { ProductOffer, ShoppingAction, ShoppingBook, ShoppingItem } from "../Resources/types";

// Saved products, list membership, and stock share one local book on both platforms.
export function ShoppingListTab({ book, onUpdate }: { book: ShoppingBook; onUpdate: (action: ShoppingAction) => Promise<void> }) {
  const { width, height } = useWindowDimensions();
  const android = Platform.OS === "android", columns = !android && width >= 1100;
  const [section, setSection] = useState<"list" | "supermarkets" | "inventory">("list");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [editor, setEditor] = useState<ShoppingEditor>();
  const [showHistory, setShowHistory] = useState(false);
  // Bought entries leave the active checklist and stay available for Undo in a bounded history dialog.
  const activeItems = book.items.filter((item) => !item.bought);
  const history = book.items.filter((item) => item.bought).reverse().sort((a, b) => (b.boughtAt ?? "").localeCompare(a.boughtAt ?? ""));
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Saved-product labels stay plain; requested amounts are displayed only in My shopping list.
  const productName = (id: string) => shoppingProductLabel(book.products.find((item) => item.id === id)!);
  const itemLabel = (item: ShoppingItem) => shoppingItemLabel(item, book.products.find((product) => product.id === item.productId)!);
  const open = (value: ShoppingEditor) => { setMenu(false); setNotice(""); setEditor(value); };
  const openMenu = () => anchor.current?.measureInWindow((x, y, _width, buttonHeight) => { setPosition({ left: x, top: y + buttonHeight + 8 }); setMenu(true); });
  // Direct actions wait for persistence and block duplicate taps, just like modal submissions.
  const update = async (action: ShoppingAction, message: string) => {
    if (pending.current) return;
    pending.current = true; setSaving(true); setError(""); setNotice("");
    try { await onUpdate(action); setNotice(message); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this change. Please try again."); }
    finally { pending.current = false; setSaving(false); }
  };
  const toggle = (item: ShoppingItem) => {
    if (item.bought && !item.inventoryAddition) void update({ type: "unbuy", itemId: item.id, reverseInventory: false }, "Item unchecked.");
    else open({ mode: item.bought ? "unbuy" : "buy", itemId: item.id });
  };
  const toggleExpanded = (key: string) => setExpanded((current) => ({ ...current, [key]: !current[key] }));
  // Regular prices stay prominent; sale prices are separate reference values beside them.
  const price = (offer: ProductOffer) => <View style={styles.priceRow}>
    <Text style={styles.price}>{formatLei(offerPrice(offer))}</Text>
    {offer.salePriceBani !== null ? <Text style={styles.salePrice}>Sale: {formatLei(offer.salePriceBani)}</Text> : null}
  </View>;
  const list = <View style={[styles.section, columns && styles.listColumn]}>
    <View style={styles.heading}><Text style={styles.title}>My shopping list</Text><Button disabled={saving} icon="add" iconOnly label="Add a product to the list" onPress={() => open({ mode: "addToList" })} variant="secondary" /></View>
    <Text style={styles.note}>{activeItems.length} {activeItems.length === 1 ? "item" : "items"} to buy</Text>
    <View style={[styles.panel, SOFT_SHADOW]}>
      {!activeItems.length ? <Text style={styles.note}>No items to buy. Add a saved product to your list.</Text> : null}
      {/* Checklist rows represent products; store-specific pricing belongs in the supermarket cards. */}
      {activeItems.map((item) => <View key={item.id} style={styles.row}>
        <Button checked={item.bought} disabled={saving} label={`${itemLabel(item)}, bought`} onPress={() => toggle(item)} />
        <View style={styles.details}><Text style={styles.name}>{itemLabel(item)}</Text><Text style={styles.note}>{item.bought ? "Bought" : "To buy"}</Text></View>
      </View>)}
    </View>
    <View style={styles.historySummary}><Text style={styles.note}>{history.length} bought</Text>
      <View style={styles.historyAction}><Button label="Bought history" variant="secondary" onPress={() => { setError(""); setNotice(""); setShowHistory(true); }} /></View>
    </View>
  </View>;
  // Supermarkets and storage locations reuse the same independently expandable card layout.
  const groups = (kind: "supermarket" | "location") => <View style={[styles.section, kind === "supermarket" && columns && styles.catalogColumn]}>
    <View style={styles.heading}><Text style={styles.title}>{kind === "supermarket" ? "Supermarkets" : "Inventory"}</Text>
      <Button disabled={saving} icon="add" iconOnly label={kind === "supermarket" ? "Add a supermarket" : "Add an inventory location"} onPress={() => open({ mode: kind })} variant="secondary" />
    </View>
    {/* Matching metadata rows align the first supermarket card with the shopping-list panel. */}
    <Text style={styles.note}>{kind === "supermarket" ? `${book.supermarkets.length} ${book.supermarkets.length === 1 ? "supermarket" : "supermarkets"}`
      : `${book.locations.length} ${book.locations.length === 1 ? "location" : "locations"}`}</Text>
    <View style={[styles.board, android && styles.nativeBoard]}>
      {!(kind === "supermarket" ? book.supermarkets : book.locations).length ? <View style={[styles.panel, SOFT_SHADOW]}><Text style={styles.note}>{kind === "supermarket" ? "Add a supermarket, then save products and prices for it." : "Create a storage location such as Fridge, Cellar, or Pantry."}</Text></View> : null}
      {(kind === "supermarket" ? book.supermarkets : book.locations).map((group) => {
        const key = `${kind}:${group.id}`, isOpen = !android || !!expanded[key];
        const offers = book.offers.filter((item) => item.supermarketId === group.id), stock = book.stock.filter((item) => item.locationId === group.id);
        return <View key={group.id} style={[styles.category, SOFT_SHADOW, android && styles.nativeCategory]}>
          <View style={styles.categoryHeader}>
            {android ? <Button label={group.name} expanded={isOpen} icon={isOpen ? "chevronUp" : "chevronDown"} onPress={() => toggleExpanded(key)} /> : <Text style={styles.categoryName}>{group.name}</Text>}
            <Button disabled={saving} icon="add" iconOnly label={kind === "supermarket" ? `Add a product at ${group.name}` : `Add stock to ${group.name}`}
              onPress={() => open(kind === "supermarket" ? { mode: "offer", supermarketId: group.id } : { mode: "addStock", locationId: group.id })} variant="secondary" />
          </View>
          {isOpen ? <View style={styles.categoryContents}>
            {kind === "supermarket" ? offers.length ? offers.map((offer) => <View key={offer.id} style={styles.row}>
              <View style={styles.details}><Text style={styles.name}>{productName(offer.productId)}</Text>{price(offer)}</View>
              <Button disabled={saving} icon="options" iconOnly label={`Update price for ${productName(offer.productId)} at ${group.name}`} onPress={() => open({ mode: "price", offerId: offer.id })} variant="secondary" />
              <Button disabled={saving || activeItems.some((item) => item.productId === offer.productId)} icon="add" iconOnly label={`Add ${productName(offer.productId)} to list`}
                onPress={() => open({ mode: "addToList", productId: offer.productId })} variant="secondary" />
            </View>) : <Text style={styles.note}>No products saved at this supermarket.</Text>
              : stock.length ? stock.map((item) => <View key={item.id} style={styles.row}>
                <View style={styles.details}><Text style={styles.name}>{productName(item.productId)}</Text><Text style={styles.note}>{formatStockQuantity(item.quantityMilli, item.unit)}</Text></View>
                <Button disabled={saving} icon="options" iconOnly label={`Update stock for ${productName(item.productId)} in ${group.name}`} onPress={() => open({ mode: "setStock", stockId: item.id })} variant="secondary" />
              </View>) : <Text style={styles.note}>No inventory entries yet.</Text>}
          </View> : null}
        </View>;
      })}
    </View>
  </View>;
  return <View style={styles.page}>
    <Modal animationType="none" transparent visible={menu} onRequestClose={() => setMenu(false)}><View style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close shopping options" onPress={() => setMenu(false)} style={StyleSheet.absoluteFill} />
      <ActionMenu visible={menu} menuStyle={{ left: Math.max(12, Math.min(position.left, width - Math.min(340, width - 24) - 12)), top: Math.max(12, Math.min(position.top, height - 290)), width: Math.min(340, width - 24), minWidth: 0 }} actions={[
        { id: "product", label: "Add a new product", icon: "shopping", onPress: () => open({ mode: "product" }) },
        { id: "add", label: "Add a product to the list", icon: "add", onPress: () => open({ mode: "addToList" }) },
        { id: "remove", label: "Remove a product from the list", icon: "removeHabit", onPress: () => open({ mode: "removeFromList" }) },
        { id: "supermarket", label: "Add a supermarket", icon: "add", onPress: () => open({ mode: "supermarket" }) },
      ]} />
    </View></Modal>
    {editor ? <ShoppingEditorModal editor={editor} book={book} onSave={onUpdate} onClose={() => setEditor(undefined)} /> : null}
    {/* Suspend history while its optional stock-reversal dialog is open, then return to the updated list. */}
    {showHistory && !editor ? <TrackerDialog title="Bought history" description={`${history.length} bought ${history.length === 1 ? "item" : "items"}`}
      closeLabel="Close bought history" onClose={() => { if (!pending.current) setShowHistory(false); }}>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      {!history.length ? <Text style={styles.note}>No bought items yet.</Text> : history.map((item) => <View key={item.id} style={styles.row}>
        <View style={styles.details}><Text style={styles.name}>{itemLabel(item)}</Text>
          <Text style={styles.note}>{item.boughtAt ? new Date(item.boughtAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "Earlier purchase"}</Text>
        </View>
        <View style={styles.undoAction}><Button disabled={saving} label="Undo" icon="chevronLeft" variant="secondary" onPress={() => {
          if (item.inventoryAddition) open({ mode: "unbuy", itemId: item.id });
          else void update({ type: "unbuy", itemId: item.id, reverseInventory: false }, "Item restored to the shopping list.");
        }} /></View>
      </View>)}
    </TrackerDialog> : null}
    <View style={styles.heading}><Text style={styles.title}>Shopping</Text><View ref={anchor} collapsable={false} style={styles.optionsAnchor}><Button disabled={saving} icon="options" iconOnly label="Shopping options" onPress={openMenu} variant="secondary" /></View></View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    {/* Native tabs keep supermarkets and inventory cards full-width without stretching their neighbors. */}
    {android ? <><View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Shopping sections">
      {(["list", "supermarkets", "inventory"] as const).map((value) => <Button key={value} label={value === "list" ? "List" : value === "supermarkets" ? "Supermarkets" : "Inventory"}
        variant="segment" selected={section === value} onPress={() => setSection(value)} />)}
    </View>{section === "list" ? list : groups(section === "supermarkets" ? "supermarket" : "location")}</>
      : <><View style={[styles.layout, columns && styles.columns]}>{list}{groups("supermarket")}</View>{groups("location")}</>}
  </View>;
}

const styles = StyleSheet.create({
  // Shared clay surfaces, Nunito text, and wrap-safe controls match the other tracker pages.
  page: { gap: 20 }, layout: { gap: 22 }, columns: { alignItems: "flex-start", flexDirection: "row" }, section: { gap: 12, minWidth: 0 }, listColumn: { flex: 1 }, catalogColumn: { flex: 1.7 },
  heading: { alignItems: "center", flexDirection: "row", gap: 12, flexWrap: "wrap", minHeight: 36 }, optionsAnchor: { width: 36, flexDirection: "row" },
  title: { color: COLORS.primary, fontFamily: FONT_FAMILY.extraBold, fontSize: 21 },
  panel: { backgroundColor: COLORS.surface, borderRadius: 24, gap: 12, padding: 18 }, row: { alignItems: "center", backgroundColor: COLORS.background, borderRadius: 16, flexDirection: "row", gap: 8, padding: 9 },
  bought: { backgroundColor: COLORS.mutedSurface }, details: { flex: 1, minWidth: 0, gap: 3 }, name: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 15, flexShrink: 1 },
  note: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 13, flexShrink: 1 }, priceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 }, price: { color: COLORS.secondary, fontFamily: FONT_FAMILY.bold, fontSize: 14 },
  salePrice: { color: COLORS.mutedText, fontFamily: FONT_FAMILY.regular, fontSize: 13 }, board: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 14 },
  category: { backgroundColor: COLORS.surface, borderRadius: 22, padding: 12, gap: 8, flexGrow: 1, flexBasis: 240, minWidth: 0 }, categoryHeader: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 44 },
  categoryName: { color: COLORS.primary, fontFamily: FONT_FAMILY.bold, fontSize: 17, flex: 1, minWidth: 0 }, categoryContents: { gap: 8 }, nativeBoard: { flexDirection: "column", alignItems: "stretch" }, nativeCategory: { flexBasis: "auto", flexGrow: 0 },
  tabs: { backgroundColor: COLORS.mutedSurface, borderRadius: 18, flexDirection: "row", gap: 4, padding: 5 }, overlay: { flex: 1 }, error: { color: COLORS.gradientPlum, fontFamily: FONT_FAMILY.medium, fontSize: 14 }, notice: { color: COLORS.gradientGreen, fontFamily: FONT_FAMILY.medium, fontSize: 14 },
  // Keep history compact on the page and restore controls reachable on narrow phones.
  historySummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  historyAction: { flexDirection: "row", width: 170, maxWidth: "100%" }, undoAction: { flexDirection: "row", width: 100 },
});
