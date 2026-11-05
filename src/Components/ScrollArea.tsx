import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { Button } from "./Button";
import { COLORS } from "../Resources/theme";

type ScrollAreaProps = Omit<ScrollViewProps, "horizontal" | "showsVerticalScrollIndicator" | "showsHorizontalScrollIndicator"> & {
  scrollLabel?: string;
};

const STEP = 48;
const WEB_DRAG_STYLE: ViewStyle & { touchAction: "none" } = { cursor: "pointer", touchAction: "none" };

// Share transparent custom scrolling across page content, dialogs, and dropdown lists.
export function ScrollArea({
  children, style, onLayout, onContentSizeChange, onScroll, scrollEnabled = true,
  scrollEventThrottle = 16, scrollLabel = "content", ...props
}: ScrollAreaProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(0);
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  const visible = scrollEnabled && viewportHeight >= 64 && maxScroll > 1;
  const thumbHeight = contentHeight > 0
    ? Math.min(trackHeight, Math.max(28, trackHeight * viewportHeight / contentHeight)) : 0;
  const travel = Math.max(0, trackHeight - thumbHeight);
  const position = Math.max(0, Math.min(offset, maxScroll));
  const thumbTop = maxScroll > 0 ? position / maxScroll * travel : 0;
  const scrollState = useRef({ offset: 0, maxScroll: 0, travel: 0, viewportHeight: 0 });
  scrollState.current = { offset: position, maxScroll, travel, viewportHeight };

  // Refs keep rapid arrow presses and dragging aligned with the latest measured scroll range.
  const scrollTo = useCallback((requested: number) => {
    const current = scrollState.current;
    const y = Math.max(0, Math.min(requested, current.maxScroll));
    current.offset = y;
    setOffset(y);
    scrollRef.current?.scrollTo({ y, animated: false });
  }, []);

  useEffect(() => {
    if (offset > maxScroll) scrollTo(maxScroll);
  }, [maxScroll, offset, scrollTo]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      event.preventDefault();
      dragStart.current = scrollState.current.offset;
      setDragging(true);
    },
    onPanResponderMove: (_event, gesture) => {
      const current = scrollState.current;
      if (current.travel > 0) scrollTo(dragStart.current + gesture.dy * current.maxScroll / current.travel);
    },
    onPanResponderRelease: () => setDragging(false),
    onPanResponderTerminate: () => setDragging(false),
    onPanResponderTerminationRequest: () => false,
  }), [scrollTo]);

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        {...props}
        onContentSizeChange={(width, height) => {
          setContentHeight(height);
          onContentSizeChange?.(width, height);
        }}
        onLayout={(event) => {
          setViewportHeight(event.nativeEvent.layout.height);
          onLayout?.(event);
        }}
        onScroll={(event) => {
          const y = Math.max(0, Math.min(event.nativeEvent.contentOffset.y, scrollState.current.maxScroll));
          scrollState.current.offset = y;
          setOffset(y);
          onScroll?.(event);
        }}
        ref={scrollRef}
        scrollEnabled={scrollEnabled}
        scrollEventThrottle={scrollEventThrottle}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={[styles.viewport, visible && styles.withScrollbar]}
      >
        {children}
      </ScrollView>
      {visible ? (
        <View pointerEvents="box-none" style={styles.scrollbar}>
          <Button
            disabled={position <= 0}
            icon="chevronUp"
            iconOnly
            label={`Scroll up in ${scrollLabel}`}
            onPress={() => scrollTo(scrollState.current.offset - STEP)}
            variant="scroll"
          />
          <Pressable
            accessible={false}
            focusable={false}
            onLayout={(event) => setTrackHeight(event.nativeEvent.layout.height)}
            onPress={(event) => {
              const y = event.nativeEvent.locationY;
              if (Number.isFinite(y) && travel > 0) scrollTo((y - thumbHeight / 2) / travel * maxScroll);
            }}
            style={styles.track}
          >
            <View
              {...pan.panHandlers}
              accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
              accessibilityLabel={`Scroll ${scrollLabel}`}
              accessibilityRole="adjustable"
              accessibilityValue={{ min: 0, max: Math.round(maxScroll), now: Math.round(position) }}
              accessible
              focusable
              onAccessibilityAction={(event) => {
                const direction = event.nativeEvent.actionName === "increment" ? 1 : -1;
                scrollTo(scrollState.current.offset + direction * STEP);
              }}
              onKeyDown={(event) => {
                const current = scrollState.current;
                const targets: Record<string, number> = {
                  ArrowUp: current.offset - STEP, ArrowDown: current.offset + STEP,
                  PageUp: current.offset - current.viewportHeight,
                  PageDown: current.offset + current.viewportHeight,
                  Home: 0, End: current.maxScroll,
                };
                const target = targets[event.nativeEvent.key];
                if (target !== undefined) { event.preventDefault(); scrollTo(target); }
              }}
              style={[styles.thumbTarget, { height: thumbHeight, top: thumbTop }, Platform.OS === "web" && WEB_DRAG_STYLE]}
            >
              <View style={[styles.thumb, dragging && styles.thumbDragging]} />
            </View>
          </Pressable>
          <Button
            disabled={position >= maxScroll}
            icon="chevronDown"
            iconOnly
            label={`Scroll down in ${scrollLabel}`}
            onPress={() => scrollTo(scrollState.current.offset + STEP)}
            variant="scroll"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Preserve caller sizing while reserving a clear gutter only when a scrollbar is needed.
  container: { flexGrow: 1, flexShrink: 1, minHeight: 0, minWidth: 0, overflow: "hidden", position: "relative" },
  viewport: { flexGrow: 1, flexShrink: 1, minHeight: 0, minWidth: 0 },
  withScrollbar: { marginRight: 28 },
  scrollbar: { alignItems: "center", backgroundColor: "transparent", bottom: 0, gap: 4, position: "absolute", right: 0, top: 0, width: 24 },
  track: { backgroundColor: "transparent", flex: 1, position: "relative", width: 24 },
  thumbTarget: { alignItems: "center", left: 0, position: "absolute", width: 24 },
  thumb: { backgroundColor: COLORS.secondary, borderRadius: 999, flex: 1, width: 8 },
  thumbDragging: { backgroundColor: COLORS.gradientGreen },
});
