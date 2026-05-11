import Link from "next/link";
import { FynlLockup } from "@/app/components/FynlLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-10 transition-opacity hover:opacity-80">
        <FynlLockup size={40} />
      </Link>
      {children}
    </div>
  );
}
