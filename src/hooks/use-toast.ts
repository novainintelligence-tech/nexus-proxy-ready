import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

function toast(input: ToastInput | string) {
  if (typeof input === "string") return sonnerToast(input);
  const msg = input.title ?? input.description ?? "";
  const opts = input.description ? { description: input.description } : undefined;
  if (input.variant === "destructive") return sonnerToast.error(msg, opts);
  return sonnerToast(msg, opts);
}

export function useToast() {
  return { toast };
}

export { toast };