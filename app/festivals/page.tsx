import { AppLayout } from "@/components/shell/AppLayout";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function FestivalsPage() {
  return (
    <AppLayout title="Festivals">
      <div className="bg-[#232525] border border-[#303232] p-6 space-y-4 rounded-none">
        <h2 className="font-display text-2xl tracking-wide text-[#E6E6E6]">
          Festivals
        </h2>
        <p className="text-sm text-[#A8A8A8] leading-relaxed">
          Film festival submissions and curated showcases are opening soon. Join the early access list to get notified when applications begin.
        </p>

        <div className="pt-2">
          <WaitlistForm feature="festivals" />
        </div>
      </div>
    </AppLayout>
  );
}
