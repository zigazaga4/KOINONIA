const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";

export function useApiAuth() {
  return { token: API_KEY };
}
