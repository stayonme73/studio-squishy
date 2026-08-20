# Service routing — Scenario 2

| Deliverable | Launch Now service | Production path | Tool |
|-------------|-------------------|-----------------|------|
| Campaign direction | Campaign creative | Copy assembled from canonical brief | studio_campaign_creative |
| Coordinated set | Campaign creative | `runCampaignCreativePipeline` | studio_campaign_creative |
| Square social | Social graphics | Same campaign set (`social_square`) | studio_campaign_creative |
| Vertical social | Social graphics | Same campaign set (`social_vertical`) | studio_campaign_creative |
| Counter card PNG/PDF | Print collateral | Same campaign set (`print_counter_card`, 5×7) | studio_campaign_creative |
| Caption | Marketing copy / email | Copy assembled from canonical brief + copy-quality gate | studio_copy_quality_gate |
| Promo email | Marketing copy / email | Copy assembled from canonical brief + copy-quality gate | studio_copy_quality_gate |
| Vertical video | Short-form video | Shotstack work packet + ElevenLabs supporting narration | shotstack |

Shared campaign facts are not retyped into conflicting copies. Visual system: `harbor-roast-coffee-v1`. Production routing calls the generic customer-fact source gate and cannot begin until required launch facts are `OWNER_APPROVED_FOR_CERTIFICATION`. Shop URL, email, and phone are absent from the approved record, so any inferred contact fails the gate.
