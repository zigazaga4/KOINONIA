import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";
import type { Tier } from "@/hooks/useSubscription";

type TierDef = {
  id: Tier;
  name: string;
  price: string;
  description: string;
  features: string[];
};

const TIERS: TierDef[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Try Koinonia",
    features: [
      "30 messages per month",
      "Standard AI assistant",
      "All Bible translations",
    ],
  },
  {
    id: "student",
    name: "Student",
    price: "$10/mo",
    description: "Daily Bible reading",
    features: [
      "200 messages per month",
      "Standard AI assistant",
      "All Bible translations",
      "Presentations & notes",
    ],
  },
  {
    id: "believer",
    name: "Believer",
    price: "$25/mo",
    description: "Serious Bible study",
    features: [
      "300 messages per month",
      "Advanced AI assistant",
      "Deep theological insights",
      "Web search for context",
    ],
  },
  {
    id: "ministry",
    name: "Ministry",
    price: "$50/mo",
    description: "For pastors & teachers",
    features: [
      "800 messages per month",
      "Advanced AI assistant",
      "Sermon prep tools",
      "Priority support",
    ],
  },
  {
    id: "seminary",
    name: "Seminary",
    price: "$100/mo",
    description: "Full-time scholars",
    features: [
      "2,000 messages per month",
      "Advanced AI assistant",
      "Unlimited study sessions",
      "Priority support",
    ],
  },
];

type Props = {
  currentTier: Tier;
  onSubscribe: (tier: string) => void;
  onManage?: () => void;
  onClose?: () => void;
};

export function PricingCards({ currentTier, onSubscribe, onManage, onClose }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={18} color={KoinoniaColors.warmGray} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {TIERS.map((tier) => {
            const isCurrent = tier.id === currentTier;
            const isHighlighted = tier.id === "believer";

            return (
              <View
                key={tier.id}
                style={[
                  styles.card,
                  isHighlighted && styles.cardHighlighted,
                  isCurrent && styles.cardCurrent,
                ]}
              >
                {isHighlighted && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}

                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierPrice}>{tier.price}</Text>
                <Text style={styles.tierDesc}>{tier.description}</Text>

                <View style={styles.featuresList}>
                  {tier.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <FontAwesome name="check" size={12} color={KoinoniaColors.accent} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {isCurrent ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current Plan</Text>
                  </View>
                ) : tier.id === "free" ? null : (
                  <TouchableOpacity
                    style={[styles.subscribeBtn, isHighlighted && styles.subscribeBtnHighlighted]}
                    onPress={() => onSubscribe(tier.id)}
                  >
                    <Text style={styles.subscribeBtnText}>
                      {currentTier === "free" ? "Subscribe" : "Switch Plan"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        {currentTier !== "free" && onManage && (
          <TouchableOpacity style={styles.manageBtn} onPress={onManage}>
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    backgroundColor: KoinoniaColors.warmWhite,
    borderRadius: 16,
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 20,
    color: KoinoniaColors.darkBrown,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  card: {
    backgroundColor: KoinoniaColors.cream,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: KoinoniaColors.border,
  },
  cardHighlighted: {
    borderColor: KoinoniaColors.primary,
    borderWidth: 2,
  },
  cardCurrent: {
    backgroundColor: KoinoniaColors.sand,
  },
  popularBadge: {
    position: "absolute",
    top: -1,
    right: 12,
    backgroundColor: KoinoniaColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  popularText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: KoinoniaColors.lightText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: KoinoniaColors.darkBrown,
  },
  tierPrice: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 28,
    color: KoinoniaColors.primary,
    marginTop: 4,
  },
  tierDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: KoinoniaColors.warmGray,
    marginTop: 2,
    marginBottom: 12,
  },
  featuresList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: KoinoniaColors.darkBrown,
  },
  currentBadge: {
    marginTop: 12,
    alignSelf: "center",
    backgroundColor: KoinoniaColors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: KoinoniaColors.lightText,
  },
  subscribeBtn: {
    marginTop: 12,
    backgroundColor: KoinoniaColors.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  subscribeBtnHighlighted: {
    backgroundColor: KoinoniaColors.primary,
  },
  subscribeBtnText: {
    fontFamily: Fonts.button,
    fontSize: 14,
    color: KoinoniaColors.lightText,
  },
  manageBtn: {
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
    paddingVertical: 14,
    alignItems: "center",
  },
  manageBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: KoinoniaColors.primary,
  },
});
