import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../server/convex/_generated/api";
import type { Id } from "../../../server/convex/_generated/dataModel";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";

type SlideData = { title: string; html: string };

type PresentationRecord = {
  _id: Id<"presentations">;
  title: string;
  mode?: string;
  html?: string;
  themeCss?: string;
  slides?: SlideData[];
  updatedAt: number;
};

type Props = {
  activePresentationId: string | null;
  onSelect: (id: Id<"presentations">, data: { mode?: string; html?: string; title: string; themeCss?: string; slides?: SlideData[] }) => void;
  onClose: () => void;
  onNew: () => void;
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function PresentationList({
  activePresentationId,
  onSelect,
  onClose,
  onNew,
}: Props) {
  const presentations = useQuery(api.presentations.list, {});
  const removePresentation = useMutation(api.presentations.remove);

  const handleDelete = async (id: Id<"presentations">) => {
    try {
      await removePresentation({ presentationId: id });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Presentations</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onNew} style={styles.headerBtn}>
            <FontAwesome name="plus" size={14} color={KoinoniaColors.warmGray} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <FontAwesome name="times" size={18} color={KoinoniaColors.warmGray} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {!presentations ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : presentations.length === 0 ? (
          <Text style={styles.emptyText}>No saved presentations yet</Text>
        ) : (
          (presentations as PresentationRecord[]).map((p) => {
            const isActive = p._id === activePresentationId;
            const mode = p.mode || "document";
            return (
              <TouchableOpacity
                key={p._id}
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => {
                  onSelect(p._id, {
                    mode: p.mode,
                    html: p.html,
                    title: p.title,
                    themeCss: p.themeCss,
                    slides: p.slides,
                  });
                  onClose();
                }}
              >
                <View style={styles.itemIcon}>
                  <FontAwesome
                    name={mode === "slides" ? "television" : "file-text-o"}
                    size={14}
                    color={KoinoniaColors.warmGray}
                  />
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemTitleRow}>
                    <Text
                      style={[styles.itemTitle, isActive && styles.itemTitleActive]}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                    <View style={[styles.modeBadge, mode === "slides" && styles.modeBadgeSlides]}>
                      <Text style={[styles.modeBadgeText, mode === "slides" && styles.modeBadgeTextSlides]}>
                        {mode === "slides" ? "Slides" : "Doc"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemTime}>{timeAgo(p.updatedAt)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleDelete(p._id);
                  }}
                >
                  <FontAwesome name="trash-o" size={14} color={KoinoniaColors.warmGray} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: KoinoniaColors.warmWhite,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: KoinoniaColors.divider,
    backgroundColor: KoinoniaColors.cream,
  },
  headerTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: KoinoniaColors.darkBrown,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    padding: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: KoinoniaColors.warmGray,
    textAlign: "center",
    paddingVertical: 32,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: KoinoniaColors.sand,
  },
  itemIcon: {
    width: 28,
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemTitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: KoinoniaColors.darkBrown,
    flex: 1,
  },
  itemTitleActive: {
    fontFamily: Fonts.bodySemiBold,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: KoinoniaColors.border,
  },
  modeBadgeSlides: {
    backgroundColor: KoinoniaColors.primary + "20",
  },
  modeBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: KoinoniaColors.warmGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modeBadgeTextSlides: {
    color: KoinoniaColors.primary,
  },
  itemTime: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: KoinoniaColors.warmGray,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
});
