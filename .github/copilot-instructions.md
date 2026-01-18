# Funding Dashboard – AI Coding Agent Instructions

## Quick Start
- **Stack**: Next.js 16, React 19, Supabase, Tailwind v4, Chart.js
- **Dev**: `npm run dev` (port 3000). Environment: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Build/test**: `npm run build`, `npm run lint`

## Architecture

**Three main pages** (App Router):
1. `/funding` → `FundingTableClient` → fetches `funding_dashboard_mv`, displays rates per exchange/token
2. `/arbitrage` → `ArbitrageTable` → fetches `arb_opportunities_enriched`, shows long/short pairs + APR
3. `/backtester` → `BacktesterForm` → allows historical P&L simulation for strategy pairs

**Data flow:**
- Pages use `dynamic="force-dynamic"`, `revalidate=0` (no caching)
- Data fetched server-side with pagination (1000-row chunks) → passed to client components
- Charts loaded client-side only (`dynamic(..., { ssr: false })`)

## Critical Patterns

### Pagination Loop (Server-side)
Used in `FundingTableClient.tsx`, `ArbitrageTable.tsx`, and backtester token/exchange fetching:
```tsx
let allRows: T[] = [];
let from = 0;
while (true) {
  const { data, error } = await supabase.from("table_name")
    .select("*")
    .order("column", { ascending: false, nullsFirst: false })
    .range(from, from + 999);
  if (error) throw error;
  if (!data?.length) break;
  allRows.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
```

### Table Component State Structure
**FundingTable** and **ArbitrageTable** share pattern:
- State: `rows`, `loading`, `error`
- Filters: `search` (normalized token), `selectedExchanges` (multi-select), `minOI`/`minVolume` (numeric)
- Sort: `sortKey` (union type of column names), `sortDir` ("asc"|"desc")
- Pagination: `limit` (20/50/100/-1), `page` (0-based)
- Derived: `filtered` computed in `useMemo` with all three dependencies (search, filters, sort)
- **Critical**: Reset page to 0 when search/filters change

### Token Normalization
`normalizeToken()` in `lib/formatters.ts` strips numeric prefixes/suffixes:
```tsx
// "1000PEPE" → "pepe", "BTC1000" → "btc", "BTC" → "btc"
// Used for fuzzy matching in search and combobox filtering
```
Used in: search filter, backtester token combobox, any user-input token matching.

### Safe URL Handling
`lib/validation.ts` provides `isValidUrl()`:
```tsx
// Must pass before rendering <a href={url}> or creating external links
// Rejects javascript: and data: protocols, validates http/https only
if (isValidUrl(refUrl)) return <a href={refUrl} target="_blank">{label}</a>;
```

## Component Organization

**Tables** (`FundingTable`, `ArbitrageTable`):
- Organized with section comments: `/* ---------- state ---------- */`, `/* ---------- filters ---------- */`
- Split rendering: header in main component, body in `FundingTable/Body.tsx` or `ArbitrageTable/Body.tsx`
- Shared controls in `Table/` folder: `ExchangeFilter.tsx`, `MinimumFilter.tsx`, `Pagination.tsx`, `TableControls.tsx`

**Charts**:
- Dynamically imported (client-only): `const Chart = dynamic(() => import(...), { ssr: false })`
- Modal pattern: state lives in parent table, pass `selectedRow`, `onClose` as props
- Data format: array of `{ x: timestamp, y: value }` (Chart.js time series)

**Types**: Each major component exports its row type:
- `lib/types.ts` defines `FundingRow`, `ArbRow`
- `lib/types/backtester.ts` defines backtester structs

## Formatting & Theming

**Number formatting** (`lib/formatters.ts`):
- `formatCompactUSD(1500000)` → `"$1.5M"` (compact notation for large numbers)
- `formatUSD(1234567)` → `"$1,234,567"` (full with commas)
- `formatAPR(5.2567)` → `"5.26%"` (percentage, 2 decimals)
- All return `"–"` for null/NaN

**Colors** (Tailwind v4, dark theme):
- Page bg: `bg-[#1c202f]` (see `app/layout.tsx`)
- Table bg: `bg-gray-800`, hover: `bg-gray-700`
- Text: `text-gray-200` (primary), `text-gray-400` (secondary)
- Borders: `border-gray-700`
- Exchange buttons: `bg-green-500/20` (long), `bg-red-500/20` (short)

**Typography**:
- Amounts/symbols: `font-mono tabular-nums` (for alignment)
- Use monospace only for numerical data, not all text

## Configuration & Constants

`lib/constants.ts`:
- `EXCHANGE_LABEL` – human labels for exchange keys ("bybit" → "Bybit")
- `MULTIPLIERS` – token prefixes/suffixes to strip ("1000000", "1000", etc.)
- `RPC_FUNCTIONS` – Supabase function names for chart data
- `SUPABASE_TABLES` – materialized view and enriched table names
- `PAGINATION_LIMITS` – [20, 50, 100, -1]
- `DEFAULT_PAGE_SIZE` – 1000 (chunk size for pagination)

## Testing & Quality

- Unit test files exist but are light: `formatters.test.ts`, `validation.test.ts`
- Test with: `npm test -- lib/formatters.test.ts`
- Run ESLint before commit: `npm run lint`

## Common Tasks

**Add table column:**
1. Update type (`FundingRow` or `ArbRow` in `lib/types.ts`)
2. Add `<th>` in component, optionally with `onClick={() => toggleSort(key)}`
3. Update `SortKey` type union
4. Add `<td>` in Body component with appropriate formatter
5. Add to `useMemo` filter/sort logic if needed

**Fix filtering bug:**
- Check `normalizeToken()` is applied consistently
- Verify `useMemo` dependencies include all filter states
- Confirm page resets on filter change (see pattern above)
- Test with edge cases: null values, empty strings, numeric prefixes

**Add new external link:**
- Validate with `isValidUrl()` first
- Use `target="_blank" rel="noopener noreferrer"` for security
- Example: `isValidUrl(row.ref_url) ? <a href={row.ref_url}>{label}</a> : <span>{label}</span>`

**Style new component:**
- Reference `app/layout.tsx` for base theme
- Follow dark palette: grays 900 (bg), 800 (card), 700 (hover)
- Use `font-mono` only for numerical data
- Test contrast for accessibility
