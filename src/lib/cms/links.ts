import { services, type BookingCategory } from "@/content/services";
import type { Category } from "./schema";

/** Where a portfolio category links to: its service page when one exists, else its gallery. */
export function categoryHref(c: Pick<Category, "id" | "slug">) {
  const svc = services.find((s) => s.category === c.id);
  return svc ? `/services/${svc.slug}` : `/portfolio/${c.slug}`;
}

export function bookingCategoryFor(categoryId: string | null | undefined): BookingCategory {
  return services.find((s) => s.category === categoryId)?.bookingCategory ?? "other";
}

export function serviceFor(categoryId: string | null | undefined) {
  return services.find((s) => s.category === categoryId) ?? null;
}
