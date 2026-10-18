import { AppLayout } from "@/components/shell/AppLayout";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function FestivalsPage() {
  return (
    <AppLayout title="Festivals">
      <div className="bg-[#232525] border border-[#303232] p-7 space-y-4 rounded-2xl shadow-lg">
        <h2 className="font-heading text-2xl sm:text-3xl tracking-tight text-[#E6E6E6]">
          Creative Showcases & Festivals
        </h2>
        <p className="text-sm text-[#A8A8A8] leading-relaxed">
          Festival submissions, curated screenings, and artistic awards are opening soon. Join the early access list to receive prompt notifications when entries open.
        </p>

        <div className="pt-2">
          <WaitlistForm feature="festivals" />
        </div>
      </div>
    </AppLayout>
  );
}
