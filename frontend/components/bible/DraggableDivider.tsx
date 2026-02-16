import { View, Platform, StyleSheet } from "react-native";
import { useRef, useCallback } from "react";
import { KoinoniaColors } from "@/constants/Colors";

type Props = {
  /** Called continuously during drag with the mouse pageX */
  onDrag: (pageX: number) => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
};

export function DraggableDivider({ onDrag, onDragEnd }: Props) {
  const dragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: any) => {
      if (Platform.OS !== "web") return;
      e.preventDefault();
      dragging.current = true;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        onDrag(ev.pageX);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onDragEnd?.();
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onDrag, onDragEnd]
  );

  if (Platform.OS !== "web") {
    return <View style={styles.dividerStatic} />;
  }

  return (
    <View
      style={styles.divider}
      // @ts-ignore — web-only event
      onMouseDown={handleMouseDown}
    >
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    width: 6,
    backgroundColor: KoinoniaColors.divider,
    cursor: "col-resize" as any,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  handle: {
    width: 3,
    height: 40,
    borderRadius: 2,
    backgroundColor: KoinoniaColors.border,
  },
  dividerStatic: {
    width: 1,
    backgroundColor: KoinoniaColors.divider,
  },
});
