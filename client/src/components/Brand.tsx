type BrandProps = {
  className?: string;
};

export default function Brand({ className = "h-12 w-auto" }: BrandProps) {
  return <img className={className} src="/logo-transparent.png" alt="Sshh... Koi Hai?" />;
}
