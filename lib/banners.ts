/**
 * Home page hero banners. Edited in Admin → Settings → Banners and stored in the settings table;
 * the three slides below are the starting set. No server code here so the client slider can import the type.
 */
export type HeroSlide = {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  /** Shows the dashed "Special Deals · UP TO n% OFF" tag when set. */
  dealPercent?: number;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

export type Banner = HeroSlide & { id: string; enabled: boolean };

export const DEFAULT_BANNERS: Banner[] = [
  {
    id: "winter",
    enabled: true,
    eyebrow: "Winter",
    title: "Sale Off",
    subtitle: "Anything for your baby",
    image: "/hero/winter-knits.webp",
    imageAlt: "Cream knit cardigans with gingham bibs, bear hats, socks and soft shoes in pink, green and blue",
    dealPercent: 70,
    primary: { label: "View All Deals", href: "/products?sale=1" },
    secondary: { label: "Learn More", href: "/support#delivery" },
  },
  {
    id: "knit-sets",
    enabled: true,
    eyebrow: "New In",
    title: "Knit Sets",
    subtitle: "Cosy outfits, ready to gift",
    image: "/hero/knit-sets.webp",
    imageAlt: "Knitted baby outfits: a green dungaree set, a pink dress and a blue cardigan with trousers, with matching hats and booties",
    primary: { label: "Shop Clothing", href: "/products?category=clothing" },
    secondary: { label: "New Arrivals", href: "/products" },
  },
  {
    id: "accessories",
    enabled: true,
    eyebrow: "Must-haves",
    title: "Accessories",
    subtitle: "Hats, bibs, booties & more",
    image: "/hero/accessories.webp",
    imageAlt: "Baby accessories laid flat: knit hats, scarf, bibs, booties, socks, a teddy bear, blanket and wooden toys",
    primary: { label: "Shop Accessories", href: "/products?category=accessories" },
    secondary: { label: "See All", href: "/products" },
  },
];
