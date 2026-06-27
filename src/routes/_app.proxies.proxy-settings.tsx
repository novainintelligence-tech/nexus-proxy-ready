import { createFileRoute } from "@tanstack/react-router";
import { ProxySettings } from "@/pages/ProxySettings";
export const Route = createFileRoute("/_app/proxies/proxy-settings")({ component: ProxySettings });