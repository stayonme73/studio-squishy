/** Chalkboard glass for customer account cards. Homepage and other rooms stay out of this scope. */
export default function ClientAccessGlass() {
  return (
    <style>{`
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access .utility-card:not(.owner-qa):not(.owner-qa *):not(.fdr__feedback .fd-block) {
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access :is(a.utility-btn.utility-btn--primary, button.utility-btn.utility-btn--primary):not(.owner-qa *):not(:active):not(.is-pressed):not([data-pressed="true"]) {
        background: #c8b59b !important;
        background-color: #c8b59b !important;
        color: #111111 !important;
        -webkit-text-fill-color: #111111 !important;
        border: 2px solid #c8b59b !important;
        font-weight: 700 !important;
        min-height: 44px !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access :is(a.utility-btn.utility-btn--secondary, button.utility-btn.utility-btn--secondary, button.utility-password__toggle):not([class*="primary"]):not([class*="danger"]):not([class*="destructive"]):not(.owner-qa *):not(:active):not(.is-pressed):not([data-pressed="true"]):not([data-selected="true"]):not([aria-pressed="true"]):not([data-skip-action]):not([class*="btnSkip"]):not([class*="planMoreDetails"]):not([class*="planExtras"]):not([data-route-includes-cta]):not([class*="routeIncludes"]):not(.fs-preview__section-head):not(.fdr__feedback .utility-btn) {
        background: transparent !important;
        background-color: transparent !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        border: 2px solid #c8b59b !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access [role="alert"] {
        color: #ffb4a8 !important;
        -webkit-text-fill-color: #ffb4a8 !important;
        font-weight: 700 !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access h1.utility-title,
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access h1.utility-topbar__title {
        font-size: clamp(1.75rem, 3vw, 2.15rem) !important;
        line-height: 1.15 !important;
        font-weight: 800 !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access .utility-header__copy:not(.owner-qa):not(.owner-qa *) {
        background: color-mix(in srgb, #344653 92%, transparent) !important;
        background-color: color-mix(in srgb, #344653 92%, transparent) !important;
        border: 2px solid #c8b59b !important;
        border-radius: 1.25rem !important;
        padding: 0.85rem 1rem !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access a.utility-subnav__link:not(.owner-qa *):not([aria-current="page"]):not(.utility-subnav__link--active):not(.sb-nav__item--active):not(.is-active):not(:active):not(.is-pressed):not([data-pressed="true"]):not([class*="routeCard"]):not(.hc-toc__link) {
        background: color-mix(in srgb, #344653 92%, transparent) !important;
        background-color: color-mix(in srgb, #344653 92%, transparent) !important;
        border: 2px solid #c8b59b !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        font-weight: 700 !important;
        min-height: 44px !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access a.utility-subnav__link.utility-subnav__link--active {
        background: #43b7a2 !important;
        background-color: #43b7a2 !important;
        border: 2px solid #43b7a2 !important;
        color: #111111 !important;
        -webkit-text-fill-color: #111111 !important;
      }
      html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access a.utility-subnav__link.utility-subnav__link--active :is(.utility-subnav__label, .utility-subnav__icon, span, svg) {
        background: transparent !important;
        color: #111111 !important;
        -webkit-text-fill-color: #111111 !important;
      }
        @media (prefers-reduced-motion: reduce) {
          html:has(.studio-environment-app) .studio-environment-app .utility-page.utility-page--client-access :is(.utility-card, .utility-header__copy):not(.owner-qa):not(.owner-qa *) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: #344653 !important;
            background-color: #344653 !important;
          }
        }
    `}</style>
  );
}
