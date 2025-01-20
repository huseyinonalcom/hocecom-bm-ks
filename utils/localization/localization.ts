import { enjson } from "./locales/en";
import { frjson } from "./locales/fr";
import { nljson } from "./locales/nl";
import { trjson } from "./locales/tr";

const locales = {
  en: enjson,
  fr: frjson,
  tr: trjson,
  nl: nljson,
};

export const t = (key: string, lang: "en" | "tr" | "fr" | "nl"): string => {
  let res = key;
  console.log(lang);
  let locale = lang.toLowerCase();
  try {
    res = (locales[locale] as any)[key] as string;
  } catch (e) {
    console.error("Translation not found for key:", key, "lang:", lang);
    console.error(e);
  }
  return res;
};
