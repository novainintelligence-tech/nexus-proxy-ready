// Real implementation of @workspace/api-client-react — backed by TanStack
// Query + createServerFn. Hooks that are not yet wired to a backend endpoint
// return empty data/no-op mutations so the UI continues to render.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api.functions";

const emptyQuery = <T,>(data: T) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: async () => ({ data }),
  status: "success" as const,
});

function noopMutation() {
  return {
    mutate: (_v?: any, opts?: { onSuccess?: (d: any) => void }) => opts?.onSuccess?.({}),
    mutateAsync: async (_v?: any) => ({} as any),
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
  useQuery({ queryKey: ["me"], queryFn: () => api.getMe() });

// ---------- plans / payments ----------
export const useListPlans = () =>
  useQuery({ queryKey: getListPlansQueryKey(), queryFn: () => api.listPlans() });
export const useCreatePayment = () => noopMutation();
export const useSubmitPaymentHash = () => noopMutation();
export const useListMyPayments = () =>
  useQuery({ queryKey: getListMyPaymentsQueryKey(), queryFn: () => api.listMyPayments() });

// ---------- subscriptions ----------
export const useGetActiveSubscription = () => emptyQuery<any>(null);
export const useListMySubscriptions = () =>
  useQuery({ queryKey: ["subs", "mine"], queryFn: () => api.listMySubscriptions() });

// ---------- proxies ----------
export const useGetMyProxies = () =>
  useQuery({ queryKey: ["proxies", "mine"], queryFn: () => api.listMyProxies() });
export const useListAvailableProxies = (params?: any) =>
  useQuery({
    queryKey: ["proxies", "available", params],
    queryFn: () => api.listAvailableProxies({ data: params ?? { limit: 50 } }),
  });
export const useListProxyCountries = () => emptyQuery<any[]>([]);

// ---------- usage ----------
export const useGetUsageStats = () =>
  useQuery({ queryKey: ["usage"], queryFn: () => api.getUsageStats() });

// ---------- cart ----------
export const useGetMyCart = (_opts?: any) =>
  useQuery({ queryKey: ["cart"], queryFn: () => api.getMyCart(), refetchInterval: 5000 });

export const useAddToCart = () => {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (vars: { data: { proxyId: string; priceCents: number } }) =>
      api.addToCart({ data: vars.data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
  return { ...m, isLoading: m.isPending };
};

export const useRemoveFromCart = () => {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (vars: { id: string }) => api.removeFromCart({ data: { id: vars.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
  return { ...m, isLoading: m.isPending };
};

export const usePurchaseCart = () => noopMutation(); // wired in Phase 3 (NOWPayments)

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