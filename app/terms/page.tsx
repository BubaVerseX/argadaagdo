import TermsClient from "./TermsClient";

// The operator's street address is kept out of the public code: it comes from
// the OPERATOR_ADDRESS setting on Vercel (OPERATOR_ADDRESS_EN for English,
// optional) and is shown only in the Terms' operator section.
export default function TermsPage() {
  const ka = process.env.OPERATOR_ADDRESS?.trim() || null;
  const en = process.env.OPERATOR_ADDRESS_EN?.trim() || ka;
  return <TermsClient address={ka && en ? { ka, en } : null} />;
}
