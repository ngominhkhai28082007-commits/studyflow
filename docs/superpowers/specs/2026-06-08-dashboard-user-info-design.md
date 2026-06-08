# Dashboard User Info — Design Spec
_Date: 2026-06-08_

## Problem
Dashboard header shows mascot + logout button but not the logged-in user's name or coin balance.

## Solution
Pass `userName` prop into Dashboard and show name + coin badge in the header right section.

## Changes

### `src/app/App.tsx`
- Add `userName={user.name}` prop when rendering `<Dashboard>`.

### `src/app/components/Dashboard.tsx`
- Add `userName: string` to props interface.
- In the header right `<div className="flex items-center gap-3">`, prepend before the mascot icon:
  - User name: `<span>` with `text-sm font-semibold` truncated to max ~160px
  - Coin badge: `<div>` with yellow style matching ShopPage (`bg-yellow-400/15 text-yellow-500`), shows `<Coins size={14} /> {shop.coins.toLocaleString()}` — rendered only when `shop !== null`

## Data flow
`user.name` comes from `App.tsx` state (already fetched via `fetchMe`).
`shop.coins` comes from `Dashboard`'s own `shop` state (already fetched via `refreshShop` on mount).
No new API calls needed.

## Out of scope
- Showing email or other user details.
- Refreshing coins in real time (shop already refreshes after Shop/Mascot panel closes).
