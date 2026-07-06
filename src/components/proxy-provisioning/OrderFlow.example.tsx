/**
 * Example Frontend Component: Proxy Purchase Flow
 * 
 * Shows how to integrate the provisioning workflow into your Lovable UI
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

// Import the API functions
import {
  listPlans,
  listMyOrders,
  getOrderDetails,
  getProxyAvailability,
  createOrder,
} from '@/lib/api.functions';

/**
 * Component 1: Plan Selection & Purchase
 */
export function PlansPurchase({ onOrderCreated }: { onOrderCreated?: (orderId: string) => void }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('');
  const [proxyType, setProxyType] = useState('residential');

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => listPlans(),
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['proxy-availability', country, proxyType],
    queryFn: () => getProxyAvailability({ country, proxyType }),
    enabled: !!country,
  });

  const { mutate: purchase, isPending: isPurchasing } = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error('No plan selected');
      
      // In a real app, this would:
      // 1. Process payment (redirect to payment provider)
      // 2. After payment confirmation, create the order
      // For now, we'll just create the order directly
      
      return await createOrder({
        paymentId: crypto.randomUUID(), // This would come from payment provider
        planId: selectedPlan,
        country: country || undefined,
        proxyType,
      });
    },
    onSuccess: (order) => {
      onOrderCreated?.(order.orderId);
    },
  });

  if (plansLoading) return <div>Loading plans...</div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Daily Plans</TabsTrigger>
          <TabsTrigger value="credit">Credit Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans
              ?.filter(p => p.duration_days && p.duration_days <= 365)
              .map(plan => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition ${
                    selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.duration_days} days</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold">
                      ${(plan.price_cents / 100).toFixed(2)}
                    </div>
                    <ul className="text-sm space-y-2">
                      <li>✓ {plan.max_proxies} proxy</li>
                      <li>✓ {plan.proxy_type}</li>
                      <li>✓ {plan.bandwidth_gb}GB bandwidth</li>
                    </ul>
                    <Badge variant="outline">{plan.proxy_type}</Badge>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="credit" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans
              ?.filter(p => !p.duration_days)
              .map(plan => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition ${
                    selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>Reusable credit</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold">
                      ${(plan.price_cents / 100).toFixed(2)}
                    </div>
                    <div className="text-sm">
                      {plan.max_proxies} proxies per request
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Proxy Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proxy Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Any country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any country</SelectItem>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                  <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                  <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={proxyType} onValueChange={setProxyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="datacenter">Datacenter</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {country && (
            <div className="text-sm">
              {availabilityLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking availability...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {availability?.available ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{availability.available} proxies available</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span>No proxies available for this filter</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Button */}
      <Button
        onClick={() => purchase()}
        disabled={!selectedPlan || isPurchasing}
        className="w-full"
        size="lg"
      >
        {isPurchasing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          'Buy Proxy'
        )}
      </Button>
    </div>
  );
}

/**
 * Component 2: Order Status Display
 */
export function OrderStatusCard({ orderId }: { orderId: string }) {
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderDetails({ orderId }),
    refetchInterval: 2000, // Refresh every 2 seconds while provisioning
    enabled: ['pending', 'provisioning'].includes(order?.status),
  });

  if (isLoading) return <div>Loading order...</div>;
  if (error) return <Alert><AlertDescription>Error loading order</AlertDescription></Alert>;
  if (!order) return null;

  const statusConfig = {
    pending: { color: 'bg-yellow-100', icon: Clock, label: 'Pending', message: 'Processing your order...' },
    provisioning: { color: 'bg-blue-100', icon: Loader2, label: 'Provisioning', message: 'Fetching your proxy...' },
    provisioned: { color: 'bg-green-100', icon: CheckCircle, label: 'Provisioned', message: 'Your proxy is ready!' },
    failed: { color: 'bg-red-100', icon: AlertCircle, label: 'Failed', message: order.failedReason },
  };

  const status = statusConfig[order.status as keyof typeof statusConfig];
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Order #{orderId.slice(0, 8)}</CardTitle>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Message */}
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${
            order.status === 'provisioning' ? 'animate-spin' : ''
          }`} />
          <div>
            <p className="font-medium">{status.message}</p>
            <p className="text-sm text-gray-600">
              Created: {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Proxy Credentials */}
        {order.proxy && (
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Proxy Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProxyCredentialField label="IP:PORT" value={`${order.proxy.ip}:${order.proxy.port}`} />
              <ProxyCredentialField label="Username" value={order.proxy.username} />
              <ProxyCredentialField label="Password" value={order.proxy.password} />
              <ProxyCredentialField label="Type" value={order.proxy.type} />
              <ProxyCredentialField label="Location" value={`${order.proxy.city}, ${order.proxy.country}`} />
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Plan</p>
            <p className="font-medium">{order.plan?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Proxy Type</p>
            <p className="font-medium">{order.plan?.proxy_type}</p>
          </div>
          <div>
            <p className="text-gray-600">Expires</p>
            <p className="font-medium">{new Date(order.expiresAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Attempts</p>
            <p className="font-medium">{order.provisioningAttempts}/3</p>
          </div>
        </div>

        {/* Error Message */}
        {order.failedReason && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{order.failedReason}</AlertDescription>
          </Alert>
        )}

        {/* Copy/Share Credentials */}
        {order.proxy && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const text = `${order.proxy.ip}:${order.proxy.port}:${order.proxy.username}:${order.proxy.password}`;
                navigator.clipboard.writeText(text);
              }}
            >
              Copy All
            </Button>
            <Button variant="outline" className="flex-1">
              Download
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Component 3: My Orders List
 */
export function MyOrdersList() {
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => listMyOrders(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) return <div>Loading orders...</div>;
  if (error) return <Alert><AlertDescription>Error loading orders</AlertDescription></Alert>;

  if (!orders || orders.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          You haven't purchased any proxies yet. <a href="/plans" className="font-medium underline">Browse plans</a>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Orders</h2>
      
      {orders.map(order => (
        <Card key={order.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{order.planName}</CardTitle>
              <CardDescription>
                {new Date(order.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge>
              {order.status === 'provisioned' && 'Ready'}
              {order.status === 'provisioning' && 'Provisioning...'}
              {order.status === 'pending' && 'Pending'}
              {order.status === 'failed' && 'Failed'}
            </Badge>
          </CardHeader>
          <CardContent>
            {order.proxy && (
              <div className="text-sm space-y-1">
                <p><span className="text-gray-600">IP:</span> <code className="bg-gray-100 px-2 py-1 rounded">{order.proxy.ip}</code></p>
                <p><span className="text-gray-600">Port:</span> <code className="bg-gray-100 px-2 py-1 rounded">{order.proxy.port}</code></p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Expires: {new Date(order.expiresAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Helper Component: Credential Field with Copy Button
 */
function ProxyCredentialField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-mono text-sm">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </Button>
    </div>
  );
}

/**
 * Export everything for use in pages
 */
export { PlansPurchase, OrderStatusCard, MyOrdersList };
