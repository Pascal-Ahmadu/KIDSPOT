/** Each shop page fades in on navigation (the header and footer stay put). */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
