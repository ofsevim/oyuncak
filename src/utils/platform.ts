/**
 * Platform algılama yardımcıları.
 *
 * Oyunlarda farklı yerlerde tekrarlanan UA regex'lerini buradan kullanın:
 *   import { isMobileDevice, isIOS } from '@/utils/platform';
 *
 * - Build zamanında değerlendirilmez; çağrı anında `navigator.userAgent`'ı okur.
 * - Modül kapsamında bir kez cache'lenir; her oyun frame'inde regex çalıştırmaz.
 */

const ua = typeof navigator !== 'undefined' ? navigator.userAgent ?? '' : '';

const MOBILE_RE = /iPhone|iPad|iPod|Android/i;
const IOS_RE = /iPhone|iPad|iPod/i;

const cachedIsMobile = MOBILE_RE.test(ua);
const cachedIsIOS = IOS_RE.test(ua);

export const isMobileDevice = (): boolean => cachedIsMobile;

export const isIOS = (): boolean => cachedIsIOS;

/** Build zamanı sabit gibi kullanılan kısa adlar (modül yüklenirken hesaplanır). */
export const IS_MOBILE = cachedIsMobile;
export const IS_IOS = cachedIsIOS;
