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
    image: "/dresses/banner-sale-v2.webp",
    imageAlt: "Three girls' dresses: a yellow pleated dress, a red dress with rose buttons and a gold and white striped party dress",
    dealPercent: 70,
    primary: { label: "View All Deals", href: "/products?sale=1" },
    secondary: { label: "Learn More", href: "/support#delivery" },
  },
  {
    id: "knit-sets",
    enabled: true,
    eyebrow: "New In",
    title: "Dresses",
    subtitle: "Party and everyday dresses",
    image: "/dresses/banner-new-v2.webp",
    imageAlt: "Three girls' dresses: lime green with flower hem, cream with flower hem and olive with embroidered flowers",
    primary: { label: "Shop Clothing", href: "/products?category=clothing" },
    secondary: { label: "New Arrivals", href: "/products" },
  },
  {
    id: "accessories",
    enabled: true,
    eyebrow: "Special occasion",
    title: "Outfits",
    subtitle: "Dress-up looks for every celebration",
    image: "/dresses/banner-occasion-v2.webp",
    imageAlt: "A lilac ruffle top with floral trousers, a lilac floral print dress and a red dress with a navy panel",
    primary: { label: "Shop Accessories", href: "/products?category=accessories" },
    secondary: { label: "See All", href: "/products" },
  },
];
