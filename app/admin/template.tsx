/** Each admin page fades in on navigation (the sidebar and top bar stay put). */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
