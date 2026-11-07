import Link from "next/link";

// Sign-up consent, shown above "Create account":
// - a required checkbox: written consent to the transfer of data to providers
//   outside Georgia (PDP Law Art. 37; stored with the server time by
//   handle_new_user, see lib/consents.ts);
// - the minimum age and the documents the new account agrees to.
export default function SignupConsent({
  isGeorgian,
  checked,
  onChange,
}: {
  isGeorgian: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const link = "font-bold underline underline-offset-2";
  return (
    <div className="grid gap-2">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-well px-3 py-3 text-left text-[13px] leading-5 text-body">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          required
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--action,#0f3a32)]"
        />
        <span>
          {isGeorgian ? (
            <>
              ვეთანხმები, რომ ჩემი მონაცემები სერვისის მუშაობისთვის გადაეცეს საქართველოს გარეთ მყოფ პროვაიდერებს (აშშ, ევროკავშირი, გაერთიანებული სამეფო, ავსტრალია), როგორც ეს{" "}
              <Link href="/privacy#transfers" className={link}>
                კონფიდენციალურობის პოლიტიკაშია
              </Link>{" "}
              აღწერილი.
            </>
          ) : (
            <>
              I agree that my data is transferred to service providers outside Georgia (USA, EU, UK, Australia) to run the service, as described in the{" "}
              <Link href="/privacy#transfers" className={link}>
                Privacy Policy
              </Link>
              .
            </>
          )}
        </span>
      </label>
      <p className="text-center text-xs leading-5 text-body">
        {isGeorgian ? (
          <>
            ანგარიშის შექმნით ადასტურებ, რომ 18 წლის ან მეტის ხარ და ეთანხმები{" "}
            <Link href="/terms" className={link}>
              წესებს
            </Link>{" "}
            და{" "}
            <Link href="/privacy" className={link}>
              კონფიდენციალურობის პოლიტიკას
            </Link>
            .
          </>
        ) : (
          <>
            By creating an account, you confirm you are 18 or older and agree to the{" "}
            <Link href="/terms" className={link}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className={link}>
              Privacy Policy
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
