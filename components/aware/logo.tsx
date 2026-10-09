export default function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-logo ${compact ? "compact" : ""}`}><img src="/aware-logo-source.png" alt="AWARE" width="1536" height="1024" /></div>;
}
