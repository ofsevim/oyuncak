import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Liderlik tablosunda gösterilecek takma adın azami uzunluğu. */
export const MAX_NICKNAME_LENGTH = 20;

/**
 * Kullanıcı takma adını liderlik tablosuna yazmadan önce temizler:
 * HTML açılı parantezlerini ve kontrol karakterlerini (kod < 32 ve DEL)
 * ayıklar, fazla boşluğu sadeleştirir ve uzunluğu sınırlar. Derinlemesine
 * savunma — React zaten kaçışlar, ancak depolanan veride hiç ham HTML/kontrol
 * karakteri tutmayız. Boş kalırsa 'Anonim Oyuncu' döner.
 */
export function sanitizeNickname(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) continue; // kontrol karakterleri
    if (ch === "<" || ch === ">") continue;  // HTML açılı parantez
    out += ch;
  }
  const cleaned = out.replace(/\s+/g, " ").trim().slice(0, MAX_NICKNAME_LENGTH);
  return cleaned || "Anonim Oyuncu";
}
