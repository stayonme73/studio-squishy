type Props = {
  /** `viewport` — full-screen fixed (Secure Checkout). `below-header` — fills content area under header band. */
  placement?: "viewport" | "below-header";
};

/** Studio Lobby backdrop for utility / decision pages. */
export default function StudioUtilityBackdrop({ placement = "viewport" }: Props) {
  const className =
    placement === "below-header"
      ? "studio-utility-backdrop studio-utility-backdrop--below-header"
      : "studio-utility-backdrop";

  return <div className={className} aria-hidden="true" />;
}
