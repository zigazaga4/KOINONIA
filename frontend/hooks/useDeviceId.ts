import { useState, useEffect } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "koinonia_device_id";

function generateId(): string {
  // Simple UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (deviceId) return;

    if (Platform.OS === "web") {
      const id = generateId();
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {}
      setDeviceId(id);
    } else {
      // Native: load from SecureStore
      SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
        if (stored) {
          setDeviceId(stored);
        } else {
          const id = generateId();
          SecureStore.setItemAsync(STORAGE_KEY, id).then(() => setDeviceId(id));
        }
      });
    }
  }, [deviceId]);

  return deviceId;
}
