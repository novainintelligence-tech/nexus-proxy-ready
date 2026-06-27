import { createFileRoute } from "@tanstack/react-router";
// @ts-ignore - ported page accepts initial props
import { ProxyList } from "@/pages/ProxyList";
export const Route = createFileRoute("/_app/proxy-server")({
  component: () => (
    <ProxyList
      // @ts-ignore
      initialType="datacenter"
      title="Proxy Server"
      subtitle="Datacenter proxies."
    />
  ),
});