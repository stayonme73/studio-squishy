# Service routing — Scenario 1

| Deliverable | Launch Now service | Production path | Tool |
|-------------|-------------------|-----------------|------|
| Coordinated set | Campaign creative | `runCampaignCreativePipeline` | studio_campaign_creative |
| Square social | Social graphics | Same campaign set (`social_square`) | studio_campaign_creative |
| Handout PNG/PDF | Print collateral | Same campaign set (`print_handout`, US Letter) | studio_campaign_creative |
| Caption | Marketing copy / email | Copy assembled from canonical brief + copy-quality gate | studio_copy_quality_gate |
| Vertical video | Short-form video | Shotstack work packet + ElevenLabs supporting narration | shotstack |

Shared campaign facts are not retyped into conflicting copies. Visual system: `cedar-lane-home-organizing-v1`. Production routing calls the generic customer-fact source gate and cannot begin until required certification facts are `OWNER_APPROVED_FOR_CERTIFICATION`.
