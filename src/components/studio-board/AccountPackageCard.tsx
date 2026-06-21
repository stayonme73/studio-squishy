import { studioBoard } from "@/config/studio-board";
import type { AccountPackageView } from "@/lib/studio-board-view";

const { accountPackage: copy } = studioBoard;

type Props = {
  account: AccountPackageView;
};

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sb-account__row">
      <dt className="sb-account__label">{label}</dt>
      <dd className="sb-account__value">{value}</dd>
    </div>
  );
}

export default function AccountPackageCard({ account }: Props) {
  return (
    <section className="sb-account sb-account--snapshot" aria-labelledby="sb-account-title">
      <p id="sb-account-title" className="sb-card__tab">
        {copy.heading}
      </p>

      {account.isActive ? (
        <dl className="sb-account__list">
          <AccountRow label={copy.packageLabel} value={account.packagePurchased} />
          <AccountRow label={copy.paymentStatusLabel} value={account.paymentStatus} />
          <AccountRow label={copy.amountPaid} value={account.packagePrice} />
          <AccountRow
            label={copy.paymentDate}
            value={account.paymentDate ?? copy.pendingValue}
          />
          <AccountRow label={copy.billingType} value={account.billingType} />
          <AccountRow label={copy.renewalInformation} value={account.renewalDisplay} />
        </dl>
      ) : (
        <p className="sb-account__empty">{account.emptyHint}</p>
      )}
    </section>
  );
}
