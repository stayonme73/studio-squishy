import {
  kitchenShowClientContact,
  studioKitchen,
  type KitchenCampaign,
} from "@/config/studio-kitchen";

type Props = {
  campaign: KitchenCampaign;
};

export default function StudioKitchenClientContactBlock({ campaign }: Props) {
  const { detail } = studioKitchen;

  if (!kitchenShowClientContact(campaign)) {
    return <span className="sk-client-contact__na">—</span>;
  }

  return (
    <dl className="sk-client-contact">
      {campaign.reviewNoticeSent ? (
        <div className="sk-client-contact__row">
          <dt>{detail.reviewNoticeSentLabel}</dt>
          <dd>
            {campaign.reviewNoticeSent.date}
            <span className="sk-client-contact__time">{campaign.reviewNoticeSent.time}</span>
          </dd>
        </div>
      ) : null}
      {campaign.lastContactDate ? (
        <div className="sk-client-contact__row">
          <dt>{detail.lastContactLabel}</dt>
          <dd>
            {campaign.lastContactDate.date}
            <span className="sk-client-contact__time">{campaign.lastContactDate.time}</span>
          </dd>
        </div>
      ) : null}
      {campaign.reminderCount ? (
        <div className="sk-client-contact__row">
          <dt>{detail.reminderCountLabel}</dt>
          <dd>{campaign.reminderCount}</dd>
        </div>
      ) : null}
    </dl>
  );
}
