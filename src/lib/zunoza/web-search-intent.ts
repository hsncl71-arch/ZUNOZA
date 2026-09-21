import { isBrandIdentityQuestion } from "./brand.ts";

/** Live + written chat: search only for current facts, never require “internetten araştır”. */

export function wantsWebSearch(text: string, previous = "") {
  const n = text.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  if (n.length < 2) return false;
  if (isLocalOnly(n)) return false;
  if (
    wantsWeather(n) ||
    wantsNews(n) ||
    wantsMarkets(n) ||
    wantsSports(n) ||
    wantsPrices(n) ||
    wantsCurrent(n) ||
    wantsPhoneLookup(n) ||
    wantsVerify(n) ||
    wantsExplicitSearch(n)
  ) {
    return true;
  }
  if (previous && isSearchFollowUp(n) && wantsWebSearch(previous)) return true;
  return false;
}

export function skipWebForAttachedImage(text: string, hasImages: boolean) {
  if (!hasImages) return false;
  const n = text.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  if (
    wantsExplicitSearch(n) ||
    wantsNews(n) ||
    wantsPrices(n) ||
    wantsMarkets(n) ||
    wantsWeather(n) ||
    wantsSports(n) ||
    wantsPhoneLookup(n) ||
    wantsVerify(n)
  ) {
    return false;
  }
  return true;
}

export function isSearchFollowUp(text: string) {
  const n = text.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  if (n.length < 2 || n.length > 72) return false;
  if (isLocalOnly(n) || isCasualNewsGreeting(n)) return false;
  return (
    /^(peki|ya|peki ya|ya o|ya bu|daha fazla|kaynak|kaynaklar|emin misin|oradaki|başka|baska|detay|daha detay|o zaman)\b/.test(n) ||
    /^(ya|peki)\s+\S+/.test(n) ||
    /^(ya yarın|ya yarin|peki yarın|peki yarin|ya sonra)\b/.test(n)
  );
}

export function isClockQuestion(text: string) {
  if (wantsWebSearch(text)) return false;
  const n = text.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
  if (n.length < 4) return false;
  if (has(n, ["video", "saniye", "kredi"])) return false;
  if (
    has(n, [
      "saat kaç",
      "saat kac",
      "ayın kaçı",
      "ayin kaci",
      "hangi gün",
      "hangi gun",
      "bugünün tarihi",
      "bugunun tarihi",
      "tarih ne",
      "tarih kaç",
      "tarih kac",
      "what time",
      "what date",
      "what day",
    ])
  ) {
    return true;
  }
  const rest = n.replace(/bugün|bugun/g, " ").replace(/\s+/g, " ");
  if ((n.includes("bugün") || n.includes("bugun")) && (rest.includes("tarih") || rest.includes("saat"))) {
    return true;
  }
  if (/\bsaat\b/.test(n) && has(n, ["kaç", "kac", "ne"])) return true;
  return false;
}

function has(n: string, parts: string[]) {
  return parts.some((p) => n.includes(p));
}

function isLocalOnly(n: string) {
  if (has(n, ["saat kaç", "saat kac", "ayın kaçı", "ayin kaci", "hangi gün", "hangi gun", "bugünün tarihi", "bugunun tarihi", "tarih ne", "tarih kaç", "what time", "what date"])) {
    return true;
  }
  if (has(n, ["bugün", "bugun"]) && has(n, ["tarih"]) && !wantsNews(n) && !wantsWeather(n) && !wantsSports(n)) {
    return true;
  }
  if (isBrandIdentityQuestion(n) || n.includes("hasan öcal") || n.includes("hasan ocal")) return true;
  if (has(n, ["video", "görsel", "gorsel", "storyboard", "montaj", "seslendir", "şarkı", "sarki", "kapak"]) && has(n, ["yap", "üret", "uret", "oluştur", "olustur", "çek", "cek", "hazırla", "hazirla"])) {
    return true;
  }
  if (has(n, ["not al", "hatırla bunu", "unut bunu", "hafızadan", "hafizadan", "ben kimim", "adım ne", "adim ne"])) return true;
  return false;
}

function wantsWeather(n: string) {
  if (has(n, ["hava durumu", "weather", "forecast", "sıcaklık", "sicaklik", "yağmur", "yagmur", "kar yağ", "kar yag"])) return true;
  return (
    n.includes("hava") &&
    has(n, ["nasıl", "nasil", "kaç", "kac", "derece", "yarın", "yarin", "bugün", "bugun", "istanbul", "ankara", "izmir", "antalya", "bursa", "soğuk", "soguk", "sıcak", "sicak", "rüzgar", "ruzgar"])
  );
}

function wantsNews(n: string) {
  if (isCasualNewsGreeting(n)) return false;
  if (n.includes("haber ver") && !has(n, ["haberler", "son dakika", "gündem", "gundem"])) return false;
  return has(n, [
    "son dakika",
    "
... 