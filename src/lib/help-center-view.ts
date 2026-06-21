import { helpCenter } from "@/config/help-center";
import { studioPolicies, type FaqItem, type PolicyItem } from "@/config/policies";

export type HelpCenterView = {
  about: typeof studioPolicies.aboutTheStudio;
  philosophy: typeof studioPolicies.faq.philosophy;
  faq: readonly FaqItem[];
  faqGroups: typeof helpCenter.faqGroups;
  policies: readonly PolicyItem[];
  toc: typeof helpCenter.toc;
  sections: typeof helpCenter.sections;
};

export function resolveHelpCenterView(): HelpCenterView {
  return {
    about: studioPolicies.aboutTheStudio,
    philosophy: studioPolicies.faq.philosophy,
    faq: studioPolicies.faq.items,
    faqGroups: helpCenter.faqGroups,
    policies: studioPolicies.policies.items,
    toc: helpCenter.toc,
    sections: helpCenter.sections,
  };
}
