# Phone access method

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Chosen method:** local HTTPS on the Studio computer’s LAN  
**Public tunnel:** not used  
**Vercel preview:** not used for this pass

This is Scout/operator documentation. Tagia only opens the link in `OWNER-PHONE-RUN-GUIDE.md`.

---

## Why this method

The phone must use the **real interface** on this branch, including sandbox pay that cannot create a live charge.

On this machine:

- Stripe secret and publishable keys are **not** configured.  
- `NEXT_PUBLIC_PAYMENT_SANDBOX=1` is set.  
- `NEXT_PUBLIC_DEV_TOOLS` is unset, so the sandbox pay control appears only with `?studioPaymentSandbox=1`.

A Vercel preview is not the safest path here: previews often have Stripe keys, which **disable** sandbox confirm, and this pass must not create an unapproved public tunnel or expose secrets.

`npm run dev:https` already binds `0.0.0.0:3000` with Next’s experimental HTTPS. The phone must open the **LAN IP**, never `0.0.0.0`. `browserSafeRedirectUrl` already rewrites `0.0.0.0` to localhost for computer browsers and keeps a real LAN Host for the phone.

Recorded LAN address on 2026-08-22: **10.1.10.208** (Wi-Fi). If DHCP changes overnight, Scout must update the owner guide before Tagia starts. Do not ask Tagia to discover the IP.

---

## Owner link (exact)

`https://10.1.10.208:3000/?studioPaymentSandbox=1`

Test pictures (same host, not a second product):

`https://10.1.10.208:3000/mobile-customer-journey-cert-1/`

---

## Scout start sequence (tomorrow, before Tagia opens the link)

From the repo, on branch `operating/mobile-customer-journey-certification-1`:

```
npm run dev:https
```

Do not print or commit `.env.local`. Do not start ngrok, Cloudflare Tunnel, or any unapproved public tunnel.

Confirm on the Studio computer that `https://127.0.0.1:3000/?studioPaymentSandbox=1` loads. Then tell Tagia the Studio is awake.

If the phone cannot connect:

1. Confirm the phone is on the same Wi-Fi.  
2. Confirm Windows Firewall allows TCP 3000 inbound on the private network.  
3. Confirm the IPv4 address is still `10.1.10.208`.  
4. Do not invent a public URL.

The Next HTTPS certificate is self-signed. Tagia may need to continue past a browser warning. That is expected. It is not a request that she install developer tools.

---

## Sandbox cannot create a real charge

- Sandbox sessions use `cs_sandbox_*` and `POST /api/payments/sandbox-confirm`.  
- `confirmSandboxCheckoutSession` refuses to run when Stripe keys are configured. Keys are missing here, so the fixture can run.  
- Hosted Stripe Checkout is not the cert path. Tagia must use **Test pay with sandbox confirm**.  
- Production plus the query flag alone still hides the fixture (`hosted-checkout-ui` tests).

---

## What this does not prove

Starting HTTPS is not the real-phone certification. Preflight tests are not the real-phone certification.
