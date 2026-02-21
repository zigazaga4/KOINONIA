import { View, Text, StyleSheet } from "react-native";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";

type Props = {
  messageCount: number;
  messageLimit: number;
};

export function UsageBadge({ messageCount, messageLimit }: Props) {
  const ratio = messageLimit > 0 ? messageCount / messageLimit : 0;
  const isWarning = ratio >= 0.8;
  const isError = ratio >= 1;

  const textColor = isError
    ? KoinoniaColors.error
    : isWarning
      ? KoinoniaColors.warning
      : KoinoniaColors.warmGray;

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: textColor }]}>
        {messageCount} / {messageLimit}
      </Text>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(ratio * 100, 100)}%`,
              backgroundColor: isError
                ? KoinoniaColors.error
                : isWarning
                  ? KoinoniaColors.warning
                  : KoinoniaColors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
  },
  text: {
    fontFamily: Fonts.label,
    fontSize: 10,
  },
  barBg: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: KoinoniaColors.border,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
});
