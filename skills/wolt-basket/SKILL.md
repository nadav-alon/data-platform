---
name: wolt-basket
description: Fill a Wolt Market basket from the Household's out and running-low Items, stopping before checkout, and mark them bought once the developer says paid. Use when the developer asks to order groceries on Wolt or to fill their Wolt basket.
---

# Wolt basket

Wolt Market is an exception to the Household's usual Stores, so every Item that needs buying goes
in the basket, whatever its Shop. The agent fills the basket; the developer reviews it and pays.

Tools: the `household` MCP server (`list_items`, `set_item_state`) and the built-in browser.

## 1. Read the basket list

Call `list_items`. The basket list is every Item whose State is `out` or `running low`.

## 2. Open Wolt Market

Open Wolt Market in the built-in browser. The browser is already signed in to the developer's
account; treat that session as theirs. When Wolt asks for a sign-in, a code or a captcha, stop and
ask the developer to complete it in the browser pane, then continue.

## 3. Add one of each Item

For each Item on the basket list, add one unit of its best match:

- **Barcode or brand note**: the brand to buy. Any pack size of that brand matches (Coke Zero: a
  1.5L bottle and a 6-pack of cans are equally good).
- **Name only**: the closest product at an ordinary size.
- **Nothing close**: leave it out.

Wolt Market's catalogue is in Hebrew; search in Hebrew as well as English before calling an Item
missing. Done when every Item on the basket list is matched, guessed or missing.

## 4. Stop at the basket

The basket is the finish line: the developer opens checkout, picks delivery, and pays. Keep to the
basket page; credentials, payment details and addresses stay the developer's to enter.

## 5. Report

One row per Item on the basket list:

| Item | Outcome | Product added | Why |
| ---- | ------- | ------------- | --- |

Outcome is `matched` (barcode or brand found), `guessed` (picked by name or a different brand), or
`missing`. List guesses first, so the developer checks them in the basket.

## 6. On "paid"

When the developer says they paid, open the order they just placed on Wolt and read its items. Call
`set_item_state` with `enough` for each Item on the basket list that the order contains. Items the
developer removed from the basket keep their State. Report which Items you set to enough.
