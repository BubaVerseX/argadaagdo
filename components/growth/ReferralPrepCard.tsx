type ReferralPrepCardProps = {
  referralCode: string;
  invitedFriends: number;
  successfulReferrals: number;
};

export function ReferralPrepCard({
  referralCode,
  invitedFriends,
  successfulReferrals,
}: ReferralPrepCardProps) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        Referral program
      </p>
      <h2 className="mt-2 text-2xl font-black text-gray-950">
        Invite friends, rescue more food
      </h2>
      <p className="mt-3 font-semibold leading-7 text-gray-600">
        Referral rewards are prepared for a future growth campaign. Your preview
        code and progress are shown here so the experience is ready when rewards
        are enabled.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-green-50 p-4">
          <p className="text-sm font-black text-green-800">Referral Code</p>
          <p className="mt-2 break-all font-mono text-xl font-black text-gray-950">
            {referralCode}
          </p>
        </div>
        <div className="rounded-2xl bg-[#F7F6EF] p-4">
          <p className="text-sm font-black text-gray-500">Invited Friends</p>
          <p className="mt-2 text-3xl font-black text-gray-950">
            {invitedFriends}
          </p>
        </div>
        <div className="rounded-2xl bg-[#F7F6EF] p-4">
          <p className="text-sm font-black text-gray-500">
            Successful Referrals
          </p>
          <p className="mt-2 text-3xl font-black text-gray-950">
            {successfulReferrals}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-yellow-50 p-4 text-sm font-semibold leading-6 text-yellow-950">
        Referral rewards are not active yet. Future rewards can be connected
        after payment and promo-code rules are finalized.
      </div>
    </section>
  );
}
