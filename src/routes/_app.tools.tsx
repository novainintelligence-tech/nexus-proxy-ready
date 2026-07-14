import { createFileRoute } from "@tanstack/react-router";
import { Tools } from "@/pages/Tools";
export const Route = createFileRoute("/_app/tools")({
  component: Tools,
});