import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { translateText, translateMany } from "@/i18n/translator";

/** Translate a single string reactively when language changes. */
export function useAutoTranslate(text: string | null | undefined): string {
  const { i18n } = useTranslation();
  const [out, setOut] = useState<string>(text ?? "");

  useEffect(() => {
    let cancelled = false;
    const src = text ?? "";
    if (!src) { setOut(""); return; }
    if (i18n.language === "en") { setOut(src); return; }
    setOut(src); // optimistic: show English while AI translates
    translateText(src, i18n.language).then((v) => {
      if (!cancelled) setOut(v);
    });
    return () => { cancelled = true; };
  }, [text, i18n.language]);

  return out;
}

/** Translate an array of strings reactively. Returns same-length array. */
export function useAutoTranslateMany(texts: string[]): string[] {
  const { i18n } = useTranslation();
  const [out, setOut] = useState<string[]>(texts);

  useEffect(() => {
    let cancelled = false;
    if (i18n.language === "en") { setOut(texts); return; }
    setOut(texts);
    translateMany(texts, i18n.language).then((v) => {
      if (!cancelled) setOut(v);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(texts), i18n.language]);

  return out;
}
