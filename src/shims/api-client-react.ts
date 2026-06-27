// Stub implementation of @workspace/api-client-react.
// The original backend is not deployed; these hooks return empty data so the
// ported UI renders without crashing. Wire up to a real API later.
import { useCallback } from "react";

type AnyData = any;

const emptyQuery = <T = AnyData>(data: T) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: async () => ({ data }),
  status: "success" as const,
});

function noopMutation() {
  const mutate = (_vars?: any, opts?: { onSuccess?: (d: any) => void; onError?: (e: any) => void }) => {
    opts?.onSuccess?.({});
  };
  const mutateAsync = async (_vars?: any) => ({} as any);
  return {
    mutate: useCallback(mutate, []),
    mutateAsync: useCallback(mutateAsync, []),
    isPending: false,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: () => {},
  };
}

// ---------- query key helpers ----------
export const getAdminGetSettingsQueryKey = () => ["admin", "settings"];
export const getAdminGetStatsQueryKey = () => ["admin", "stats"];
export const getAdminListPaymentsQueryKey = () => ["admin", "payments"];
export const getAdminListProxiesQueryKey = () => ["admin", "proxies"];
export const getAdminListSubscriptionsQueryKey = () => ["admin", "subscriptions"];
export const getAdminListUsersQueryKey = () => ["admin", "users"];
export const getListMyPaymentsQueryKey = () => ["payments", "mine"];
export const getListPlansQueryKey = () => ["plans"];

// ---------- user / auth ----------
export const useSyncUser = () => noopMutation();
export const useGetMe = () =>
  emptyQuery({
    id: "demo-user",
    email: "demo@nexusproxy.io",
    role: "admin",
    name: "Demo User",
    balance: 0,
    referralCode: "DEMO123",
  });

// ---------- plans / payments ----------
export const useListPlans = () => emptyQuery<any[]>([]);
export const useCreatePayment = () => noopMutation();
export const useSubmitPaymentHash = () => noopMutation();
export const useListMyPayments = () => emptyQuery<any[]>([]);

// ---------- subscriptions ----------
export const useGetActiveSubscription = () => emptyQuery<any>(null);
export const useListMySubscriptions = () => emptyQuery<any[]>([]);

// ---------- proxies ----------
export const useGetMyProxies = () => emptyQuery<any[]>([]);
export const useListAvailableProxies = () => emptyQuery<any[]>([]);
export const useListProxyCountries = () => emptyQuery<any[]>([]);

// ---------- usage ----------
export const useGetUsageStats = () =>
  emptyQuery({ totalBandwidth: 0, usedBandwidth: 0, requests: 0, perDay: [] });

// ---------- cart ----------
export const useGetMyCart = () => emptyQuery({ items: [], total: 0 });
export const useAddToCart = () => noopMutation();
export const useRemoveFromCart = () => noopMutation();

// ---------- admin ----------
export const useAdminGetStats = () =>
  emptyQuery({ users: 0, payments: 0, proxies: 0, activeSubscriptions: 0 });
export const useAdminListUsers = () => emptyQuery<any[]>([]);
export const useAdminBanUser = () => noopMutation();
export const useAdminListPayments = () => emptyQuery<any[]>([]);
export const useAdminConfirmPayment = () => noopMutation();
export const useAdminListProxies = () => emptyQuery<any[]>([]);
export const useAdminBulkAddProxies = () => noopMutation();
export const useAdminDeleteProxy = () => noopMutation();
export const useAdminUpdateProxy = () => noopMutation();
export const useAdminListSubscriptions = () => emptyQuery<any[]>([]);
export const useAdminUpdateSubscription = () => noopMutation();
export const useAdminGetSettings = () => emptyQuery<Record<string, any>>({});
export const useAdminUpdateSettings = () => noopMutation();
export const useAdminCreatePlan = () => noopMutation();
export const useAdminUpdatePlan = () => noopMutation();
export const useAdminDeletePlan = () => noopMutation();
export const useAdminTriggerProxyIngest = () => noopMutation();
export const useAdminTriggerProxyHealth = () => noopMutation();
export const useAdminGetProxyPoolStats = () =>
  emptyQuery({ total: 0, healthy: 0, regions: [] });