# Production record — Scenario 2

Machine-readable companion: `PRODUCTION-RECORD.json`

This record is the **motion-safety and multi-scene video correction**. Approved stills remain v7. The moving-text / single-image video is superseded. Earlier choppy, one-bag, limited-CTA, and omitted-fact outputs remain superseded.

| Field | Value |
|-------|--------|
| Generated at | 2026-08-21T01:08:46.609Z |
| Brief SHA-256 | `f64a550f96b3859cf952eeab611461b38df288d005f3adda6ea22f25f542e36d` |
| Visual system | `harbor-roast-coffee-v1` |
| Layout family | `full_bleed_hero` |
| Campaign render | v7 frozen (stills unchanged) |
| Video | vertical MP4 1080×1920 |
| Video duration | 20.52s |
| Video SHA-256 | `58e7e2f967ee0714e5c1874deb02f5f02a93b67de1ca868b16f97fcde7621070` |
| Shotstack render | `eee4f6d1-4ef0-49fe-8745-366cf8e9299c` |
| Audio peak | −6.5 dB |
| Alignment | Preserved ElevenLabs character timestamps (same MP3 as the approved-voice run) |
| Voice SHA-256 | `00f4ec01aada1d36d44d98655c3a079149eb0df51ef16a194f3f0fe2c5411e44` |
| Motion safety | PASS from extracted MP4 frames |
| Print | 5×7 PNG 1500×2100; PDF MediaBox 360×504 pt |
| Owner labor | None |
| Classification | OWNER DECISION PENDING |
| Fact approval | OWNER_APPROVED_FOR_CERTIFICATION |
| Authorized CTA | Shop the autumn box |
| Product representation | unit count 3; sealed 8-ounce bags; visual packaged coffee bags |

Tools: `studio_campaign_creative`, `elevenlabs_tts_adapter`, `shotstack`, `studio_copy_quality_gate`, `studio_product_representation`, `studio_semantic_video_flow`, `studio_rendered_frame_motion_safety`.

Execution script: `scripts/execute-room-4c-scenario-2.mts`
