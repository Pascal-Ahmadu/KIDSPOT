import { ChatBubbleLeftRightIcon, EnvelopeIcon, PhoneIcon, ShareIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/format";
import { getStoreInfo } from "@/lib/settings";
import { telHref } from "@/lib/store-info";
import { FacebookIcon, InstagramIcon, PinterestIcon, TiktokIcon, TwitterIcon, YoutubeIcon } from "./footer";


/** Chat to sales · Call us · Postal mail · Social Network, used on the Contact and 404 pages. */
export async function ContactInfoRow({ className }: { className?: string }) {
  const STORE = await getStoreInfo();
  const SOCIALS = [
    { label: "Facebook", href: STORE.socials.facebook, icon: FacebookIcon },
    { label: "Twitter", href: STORE.socials.twitter, icon: TwitterIcon },
    { label: "Instagram", href: STORE.socials.instagram, icon: InstagramIcon },
    { label: "TikTok", href: STORE.socials.tiktok, icon: TiktokIcon },
    { label: "Pinterest", href: STORE.socials.pinterest, icon: PinterestIcon },
    { label: "Youtube", href: STORE.socials.youtube, icon: YoutubeIcon },
  ].filter((s) => s.href);
  const address = STORE.addressLines;
  const info = [
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Chat to sales",
      body: (
        <>
          <span className="block">Speak to our friendly team.</span>
          <a href={`mailto:${STORE.email}`} className="text-ink hover:text-brand">{STORE.email}</a>
        </>
      ),
    },
    {
      icon: PhoneIcon,
      title: "Call us",
      body: (
        <>
          <span className="block">{STORE.hours}</span>
          {STORE.phones.map((p) => (
            <a key={p} href={telHref(p)} className="block text-ink hover:text-brand">{p}</a>
          ))}
        </>
      ),
    },
    address.length ? { icon: EnvelopeIcon, title: "Postal mail", body: address.map((l) => <span key={l} className="block">{l}</span>) } : null,
    {
      icon: ShareIcon,
      title: "Social Network",
      body: (
        <span className="mt-1 flex gap-3">
          {SOCIALS.map(({ label, href, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="text-muted transition hover:text-brand">
              <Icon size={16} />
            </a>
          ))}
        </span>
      ),
    },
  ].filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <ul className={cn("mx-auto grid max-w-[1190px] gap-6 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {info.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex gap-3">
          <Icon className="mt-0.5 h-6 w-6 shrink-0 text-ink" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold leading-6 text-ink">{title}</h2>
            <div className="text-sm leading-[21px] text-muted">{body}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
