import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMyCart } from "@workspace/api-client-react";

export function CartButton() {
  const { data: cart } = useGetMyCart({ query: { refetchInterval: 15_000 } as any });
  const count = cart?.items?.length ?? 0;
  return (
    <Link href="/cart">
      <Button variant="outline" size="sm" className="relative gap-2">
        <ShoppingCart className="w-4 h-4" />
        Cart
        {count > 0 && (
          <Badge className="ml-1 bg-primary text-primary-foreground h-5 min-w-5 px-1 flex items-center justify-center text-[10px]">
            {count}
          </Badge>
        )}
      </Button>
    </Link>
  );
}
