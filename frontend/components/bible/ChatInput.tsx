import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { KoinoniaColors } from "@/constants/Colors";
import { Fonts } from "@/constants/Fonts";

type Props = {
  onSend: (text: string) => void;
  isStreaming: boolean;
};

export function ChatInput({ onSend, isStreaming }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Ask about this passage..."
        placeholderTextColor={KoinoniaColors.warmGray}
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        multiline
        maxLength={2000}
      />
      <TouchableOpacity
        style={[styles.sendBtn, (!text.trim() || isStreaming) && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || isStreaming}
      >
        <FontAwesome
          name="send"
          size={16}
          color={
            text.trim() && !isStreaming
              ? KoinoniaColors.lightText
              : KoinoniaColors.warmGray
          }
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: KoinoniaColors.divider,
    backgroundColor: KoinoniaColors.warmWhite,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: KoinoniaColors.darkBrown,
    backgroundColor: KoinoniaColors.cream,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: KoinoniaColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: KoinoniaColors.border,
  },
});
