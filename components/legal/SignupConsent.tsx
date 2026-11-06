import Link from "next/link";

// Shown under "Create account": the minimum age and the documents the new
// account agrees to (lib/legal/terms.ts, lib/legal/privacy.ts).
export default function SignupConsent({ isGeorgian }: { isGeorgian: boolean }) {
  const link = "font-bold underline underline-offset-2";
  return (
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
  );
}
