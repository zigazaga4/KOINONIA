import { useQuery } from "convex/react";
import { useCallback } from "react";
import * as Linking from "expo-linking";
import { api } from "../../server/convex/_generated/api";
import { useApiAuth } from "./useApiAuth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3141";

export type Tier = "free" | "student" | "believer" | "ministry" | "seminary";

export type SubscriptionInfo = {
  tier: Tier;
  status: string;
  messageCount: number;
  messageLimit: number;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
};

const FREE_DEFAULTS: SubscriptionInfo = {
  tier: "free",
  status: "none",
  messageCount: 0,
  messageLimit: 30,
  periodEnd: null,
  cancelAtPeriodEnd: false,
};

export function useSubscription() {
  const { token } = useApiAuth();
  const raw = useQuery(api.subscriptions.getMySubscription);

  const subscription: SubscriptionInfo = raw
    ? {
        tier: raw.tier as Tier,
        status: raw.status,
        messageCount: raw.messageCount,
        messageLimit: raw.messageLimit,
        periodEnd: raw.periodEnd,
        cancelAtPeriodEnd: raw.cancelAtPeriodEnd,
      }
    : FREE_DEFAULTS;

  const subscribe = useCallback(
    async (tier: string) => {
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_URL}/api/stripe/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to create checkout session: ${err}`);
      }

      const { url } = await response.json();
      if (url) {
        await Linking.openURL(url);
      }
    },
    [token]
  );

  const manageSubscription = useCallback(async () => {
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/stripe/portal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to create portal session");
    }

    const { url } = await response.json();
    if (url) {
      await Linking.openURL(url);
    }
  }, [token]);

  return {
    subscription,
    subscribe,
    manageSubscription,
    isLoading: raw === undefined,
  };
}
