type BusinessAlert = {
  title: string;
  text: string;
  className: string;
};

type BusinessAlertsSectionProps = {
  alerts: BusinessAlert[];
};

export function BusinessAlertsSection({ alerts }: BusinessAlertsSectionProps) {
  return (
    <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            Business alerts
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            What needs attention?
          </h2>
        </div>

        <p className="max-w-xl text-sm font-semibold text-gray-600 sm:text-right">
          Quick signals for reservations, pickups, sold-out risk and expired
          offers.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className={`rounded-2xl border p-4 shadow-sm ${alert.className}`}
          >
            <p className="font-black">{alert.title}</p>
            <p className="mt-2 text-sm font-semibold leading-6">
              {alert.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
