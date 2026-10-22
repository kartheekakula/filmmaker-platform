import { AppLayout } from "@/components/shell/AppLayout";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function CollaboratePage() {
  return (
    <AppLayout title="Collaborate">
      <div className="bg-[#232525] border border-[#303232] p-7 space-y-4 rounded-2xl shadow-lg">
        <h2 className="font-heading text-2xl sm:text-3xl tracking-tight text-[#E6E6E6]">
          Collaborate
        </h2>
        <p className="text-sm text-[#A8A8A8] leading-relaxed">
          Connect with artists, directors, writers, and performers. Join the pilot creator group.
        </p>

        <div className="pt-2">
          <WaitlistForm feature="collaborate" />
        </div>
      </div>
    </AppLayout>
  );
}
