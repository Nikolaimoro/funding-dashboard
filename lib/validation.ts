/**
 * URL and data validation utilities
 */

/**
 * Validates if a URL is safe and properly formatted
 * 
 * Checks:
 * - Must be a valid URL (no malformed strings)
 * - Must be http or https protocol
 * - Must not contain javascript: or data: protocols (XSS prevention)
 * 
 * @param url - URL string to validate
 * @returns true if valid, false otherwise
 * @example
 * isValidUrl("https://example.com")        // true
 * isValidUrl("http://exchange.com/chart")  // true
 * isValidUrl("javascript:alert('xss')")    // false
 * isValidUrl("invalid-url-string")         // false
 * isValidUrl("")                           // false
 */
export function isValidUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid exchange name
 * Checks: non-empty, alphanumeric + underscore only
 * 
 * @param exchange - Exchange identifier to validate
 * @returns true if valid, false otherwise
 * @example
 * isValidExchange("binance")      // true
 * isValidExchange("bybit_usd")    // true
 * isValidExchange("")             // false
 * isValidExchange("binance!!")    // false
 */
export function isValidExchange(exchange: string | null | undefined): exchange is string {
  if (!exchange || typeof exchange !== "string") return false;
  return /^[a-z0-9_]+$/.test(exchange.toLowerCase()) && exchange.length > 0;
}

/**
 * Validates if a string is a valid token symbol
 * Checks: non-empty, alphanumeric only
 * 
 * @param token - Token symbol to validate
 * @returns true if valid, false otherwise
 * @example
 * isValidToken("BTC")          // true
 * isValidToken("ETH")          // true
 * isValidToken("")             // false
 * isValidToken("BTC-USD")      // false
 */
export function isValidToken(token: string | null | undefined): token is string {
  if (!token || typeof token !== "string") return false;
  return /^[a-z0-9]+$/i.test(token) && token.length > 0;
}

/**
 * Validates if a string is a valid quote asset (USDT, USDC, etc.)
 * Checks: non-empty, 2-4 uppercase letters
 * 
 * @param quote - Quote asset to validate
 * @returns true if valid, false otherwise
 * @example
 * isValidQuote("USDT")    // true
 * isValidQuote("USDC")    // true
 * isValidQuote("BTC")     // true
 * isValidQuote("")        // false
 * isValidQuote("U")       // false (too short)
 */
export function isValidQuote(quote: string | null | undefined): quote is string {
  if (!quote || typeof quote !== "string") return false;
  return /^[A-Z]{2,4}$/.test(quote);
}

/**
 * Validates if a number is a valid market ID
 * Checks: positive integer
 * 
 * @param marketId - Market ID to validate
 * @returns true if valid, false otherwise
 * @example
 * isValidMarketId(12345)  // true
 * isValidMarketId(0)      // false
 * isValidMarketId(-123)   // false
 * isValidMarketId(123.45) // false
 */
export function isValidMarketId(marketId: number | null | undefined): marketId is number {
  return typeof marketId === "number" && marketId > 0 && Number.isInteger(marketId);
}
