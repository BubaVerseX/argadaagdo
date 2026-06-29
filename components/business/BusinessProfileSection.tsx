import { RequiredMark } from "@/components/RequiredMark";

type BusinessProfileSectionProps = {
  profileName: string;
  profileType: string;
  profileAddress: string;
  profilePhone: string;
  savingProfile: boolean;
  onProfileNameChange: (value: string) => void;
  onProfileTypeChange: (value: string) => void;
  onProfileAddressChange: (value: string) => void;
  onProfilePhoneChange: (value: string) => void;
  onSave: (actionTime: number) => void;
};

export function BusinessProfileSection({
  profileName,
  profileType,
  profileAddress,
  profilePhone,
  savingProfile,
  onProfileNameChange,
  onProfileTypeChange,
  onProfileAddressChange,
  onProfilePhoneChange,
  onSave,
}: BusinessProfileSectionProps) {
  return (
    <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Business Profile
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Manage public details
          </h2>
          <p className="mt-2 max-w-2xl font-semibold leading-7 text-gray-600">
            Keep your public business information clear so customers know where
            to collect their surprise bag.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
          <div className="rounded-3xl bg-green-50 p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-black text-green-800 shadow-sm">
              {profileName.trim().slice(0, 2).toUpperCase() || "AG"}
            </div>
            <p className="mt-3 text-sm font-black text-green-800">
              Logo placeholder
            </p>
          </div>
          <div className="rounded-3xl bg-[#F7F6EF] p-5 text-center">
            <div className="mx-auto h-16 rounded-2xl bg-gradient-to-br from-green-100 to-yellow-100 shadow-inner" />
            <p className="mt-3 text-sm font-black text-gray-700">
              Cover image placeholder
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-gray-700">
          <span>
            Business name <RequiredMark />
          </span>
          <input
            value={profileName}
            onChange={(event) => onProfileNameChange(event.target.value)}
            maxLength={80}
            className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            placeholder="GMBH1 Bakery"
          />
          <span className="text-xs font-bold text-gray-500">
            {profileName.length}/80
          </span>
        </label>

        <label className="grid gap-2 text-sm font-black text-gray-700">
          <span>
            Business type <RequiredMark />
          </span>
          <input
            value={profileType}
            onChange={(event) => onProfileTypeChange(event.target.value)}
            maxLength={60}
            className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            placeholder="Bakery"
          />
          <span className="text-xs font-bold text-gray-500">
            {profileType.length}/60
          </span>
        </label>

        <label className="grid gap-2 text-sm font-black text-gray-700">
          <span>
            Address <RequiredMark />
          </span>
          <input
            value={profileAddress}
            onChange={(event) => onProfileAddressChange(event.target.value)}
            maxLength={160}
            className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            placeholder="Rustaveli Avenue, Tbilisi"
          />
          <span className="text-xs font-bold text-gray-500">
            {profileAddress.length}/160
          </span>
        </label>

        <label className="grid gap-2 text-sm font-black text-gray-700">
          Phone
          <input
            value={profilePhone}
            onChange={(event) => onProfilePhoneChange(event.target.value)}
            maxLength={40}
            className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
            placeholder="+995 555 123 456"
          />
          <span className="text-xs font-bold text-gray-500">
            {profilePhone.length}/40
          </span>
        </label>
      </div>

      <div className="mt-5 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold leading-6 text-yellow-900">
        Current database fields support business name, type, address and phone.
        Description, website, social links, logo and cover image are prepared
        below as profile fields to add when storage columns are available.
      </div>

      <div className="mt-5 grid gap-4 rounded-3xl bg-[#F7F6EF] p-4 sm:p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-sm font-black uppercase tracking-wide text-gray-500">
            Future public profile fields
          </p>
          <h3 className="mt-1 text-xl font-black text-gray-950">
            Ready for the next database update
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
            These fields are shown as placeholders so business owners know what
            profile information will be supported next. They are not saved until
            matching database columns exist.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-black text-gray-500">
          Business description
          <textarea
            disabled
            rows={3}
            placeholder="Fresh bakery items, daily surprise bags and easy pickup in Tbilisi."
            className="rounded-2xl border bg-white p-4 font-semibold text-gray-500"
          />
        </label>

        <label className="grid gap-2 text-sm font-black text-gray-500">
          Website
          <input
            disabled
            placeholder="https://example.ge"
            className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-500"
          />
        </label>

        <label className="grid gap-2 text-sm font-black text-gray-500">
          Social link
          <input
            disabled
            placeholder="Instagram or Facebook link"
            className="min-h-12 rounded-2xl border bg-white p-4 font-semibold text-gray-500"
          />
        </label>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-black text-gray-500">
            Logo and cover image
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
            Logo and cover upload need a storage path and database fields. The
            placeholders above keep the profile layout ready.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => onSave(event.timeStamp)}
        disabled={savingProfile}
        className="mt-5 min-h-12 w-full rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {savingProfile ? "Saving profile..." : "Save profile"}
      </button>
    </div>
  );
}
