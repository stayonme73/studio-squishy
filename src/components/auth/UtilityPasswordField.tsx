"use client";

import { useId, useState, type ChangeEventHandler, type InputHTMLAttributes } from "react";

type Props = {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  autoComplete?: InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  name?: string;
  disabled?: boolean;
};

/**
 * Studio Password Visibility Standard — Sign In, Sign Up, Reset Password,
 * and future Change Password. Same eye toggle on every password field.
 */
export default function UtilityPasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required,
  minLength,
  maxLength,
  name,
  disabled,
}: Props) {
  const inputId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <label className="utility-field utility-field--password" htmlFor={inputId}>
      <span>{label}</span>
      <span className="utility-password">
        <input
          id={inputId}
          className="utility-password__input"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          name={name}
          disabled={disabled}
        />
        <button
          type="button"
          className="utility-password__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? (
            <EyeOffIcon />
          ) : (
            <EyeIcon />
          )}
        </button>
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
      <path
        d="M3 3l18 18M10.6 10.7a2.75 2.75 0 0 0 3.7 3.7M6.4 6.6C4.2 8.1 2.5 12 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.4 4.5-1M9.9 5.8C10.6 5.6 11.3 5.5 12 5.5 18 5.5 21.5 12 21.5 12c-.4.8-1 1.7-1.7 2.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
