import Link from "next/link";
import { AppLayout } from "@/components/shell/AppLayout";

export default function NotFound() {
  return (
    <AppLayout title="Not Found">
      <div className="bg-[#232525] border border-[#303232] p-8 text-center space-y-4">
        <h2 className="font-display text-3xl tracking-wide text-[#E6E6E6]">
          404
        </h2>
        <p className="text-sm text-[#A8A8A8]">
          The page you requested could not be found.
        </p>
        <div>
          <Link
            href="/"
            className="inline-block bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] px-5 py-2 text-sm font-semibold transition-colors rounded-none"
          >
            Home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
