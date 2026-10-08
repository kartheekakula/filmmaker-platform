import { AppLayout } from "@/components/shell/AppLayout";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function CollaboratePage() {
  return (
    <AppLayout title="Collaborate">
      <div className="bg-[#232525] border border-[#303232] p-6 space-y-4 rounded-none">
        <h2 className="font-display text-2xl tracking-wide text-[#E6E6E6]">
          Collaborate
        </h2>
        <p className="text-sm text-[#A8A8A8] leading-relaxed">
          Find writers, cinematographers, editors, and actors for your next project. Join the list to get invited to the pilot group.
        </p>

        <div className="pt-2">
          <WaitlistForm feature="collaborate" />
        </div>
      </div>
    </AppLayout>
  );
}
