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

type Props = {
  activeConversationId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
  onClose: () => void;
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

export function ConversationList({
  activeConversationId,
  onSelect,
  onClose,
}: Props) {
  const conversations = useQuery(api.conversations.list, {});
  const removeConversation = useMutation(api.conversations.remove);

  const handleDelete = async (id: Id<"conversations">) => {
    try {
      await removeConversation({ conversationId: id });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversations</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <FontAwesome name="times" size={18} color={KoinoniaColors.warmGray} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {!conversations ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : conversations.length === 0 ? (
          <Text style={styles.emptyText}>No conversations yet</Text>
        ) : (
          conversations.map((convo) => {
            const isActive = convo._id === activeConversationId;
            return (
              <TouchableOpacity
                key={convo._id}
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => {
                  onSelect(convo._id);
                  onClose();
                }}
              >
                <View style={styles.itemContent}>
                  <Text
                    style={[styles.itemTitle, isActive && styles.itemTitleActive]}
                    numberOfLines={1}
                  >
                    {convo.title}
                  </Text>
                  <Text style={styles.itemTime}>{timeAgo(convo.updatedAt)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleDelete(convo._id);
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
  closeBtn: {
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
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: KoinoniaColors.darkBrown,
  },
  itemTitleActive: {
    fontFamily: Fonts.bodySemiBold,
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
