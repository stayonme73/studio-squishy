"use client";

import { useEffect, useState } from "react";

type Props = {
  url: string;
  title: string;
};

/** In-page reading of a text proof. A raw file frame uses the browser's dark type on the lounge. */
export default function ReviewCopyReading({ url, title }: Props) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void fetch(url, { credentials: "include" })
      .then((response) => (response.ok ? response.text() : ""))
      .then((body) => {
        if (!cancel) setText(body.trim() ? body : "This file could not be read.");
      })
      .catch(() => {
        if (!cancel) setText("This file could not be read.");
      });
    return () => {
      cancel = true;
    };
  }, [url]);

  return (
    <pre className="fs-review-proof__reading" aria-label={title}>
      {text ?? "Loading the file…"}
    </pre>
  );
}
