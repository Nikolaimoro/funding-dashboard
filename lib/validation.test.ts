/**
 * Unit tests for validation utilities
 * Run with: npm test -- lib/validation.test.ts
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function expect(value: any): { toBe(expected: any): void };
}

import {
  isValidUrl,
  isValidExchange,
  isValidToken,
  isValidQuote,
  isValidMarketId,
} from "./validation";

describe("validation utilities", () => {
  describe("isValidUrl", () => {
    it("should accept valid http URLs", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
      expect(isValidUrl("http://exchange.com/chart?id=123")).toBe(true);
    });

    it("should accept valid https URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("https://api.exchange.com:8080/data")).toBe(true);
    });

    it("should reject invalid protocols", () => {
      expect(isValidUrl("javascript:alert('xss')")).toBe(false);
      expect(isValidUrl("data:text/html,<script>alert('xss')</script>")).toBe(false);
      expect(isValidUrl("ftp://example.com")).toBe(false);
    });

    it("should reject malformed URLs", () => {
      expect(isValidUrl("not a url")).toBe(false);
      expect(isValidUrl("example.com")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
    });
  });

  describe("isValidExchange", () => {
    it("should accept valid exchange names", () => {
      expect(isValidExchange("binance")).toBe(true);
      expect(isValidExchange("bybit")).toBe(true);
      expect(isValidExchange("okx")).toBe(true);
      expect(isValidExchange("exchange_1")).toBe(true);
    });

    it("should reject invalid exchange names", () => {
      expect(isValidExchange("")).toBe(false);
      expect(isValidExchange("Binance")).toBe(false); // uppercase
      expect(isValidExchange("binance!")).toBe(false); // special char
      expect(isValidExchange("binance-spot")).toBe(false); // hyphen
      expect(isValidExchange(null)).toBe(false);
    });
  });

  describe("isValidToken", () => {
    it("should accept valid token symbols", () => {
      expect(isValidToken("BTC")).toBe(true);
      expect(isValidToken("ETH")).toBe(true);
      expect(isValidToken("PEPE")).toBe(true);
      expect(isValidToken("1000SHIB")).toBe(true);
    });

    it("should reject invalid token symbols", () => {
      expect(isValidToken("")).toBe(false);
      expect(isValidToken("BTC-USD")).toBe(false); // hyphen
      expect(isValidToken("BTC_USD")).toBe(false); // underscore
      expect(isValidToken("BTC ")).toBe(false); // space
      expect(isValidToken(null)).toBe(false);
    });
  });

  describe("isValidQuote", () => {
    it("should accept valid quote assets", () => {
      expect(isValidQuote("USDT")).toBe(true);
      expect(isValidQuote("USDC")).toBe(true);
      expect(isValidQuote("BTC")).toBe(true);
      expect(isValidQuote("ETH")).toBe(true);
    });

    it("should reject invalid quote assets", () => {
      expect(isValidQuote("")).toBe(false);
      expect(isValidQuote("U")).toBe(false); // too short
      expect(isValidQuote("USDTBTC")).toBe(false); // too long
      expect(isValidQuote("usdt")).toBe(false); // lowercase
      expect(isValidQuote("USD-T")).toBe(false); // special char
      expect(isValidQuote(null)).toBe(false);
    });
  });

  describe("isValidMarketId", () => {
    it("should accept valid market IDs", () => {
      expect(isValidMarketId(1)).toBe(true);
      expect(isValidMarketId(12345)).toBe(true);
      expect(isValidMarketId(999999)).toBe(true);
    });

    it("should reject invalid market IDs", () => {
      expect(isValidMarketId(0)).toBe(false); // zero
      expect(isValidMarketId(-123)).toBe(false); // negative
      expect(isValidMarketId(123.45)).toBe(false); // decimal
      expect(isValidMarketId(null)).toBe(false);
      expect(isValidMarketId(undefined)).toBe(false);
    });
  });
});
