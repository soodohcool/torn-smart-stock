# Torn - Company Stock Smart Fill

A Tampermonkey userscript that adds a **Smart Fill** button to your Torn company's stock page. Instead of guessing how much to order, it looks at what's actually selling and fills your order intelligently.

## What It Does

When you click **Smart Fill**, the script reads your current stock levels and daily sales figures for every item, then works out how much of each item to order before you hit **Place Order** as normal. It fills in the quantities for you — you just confirm.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Open Tampermonkey → **Create a new script**
3. Paste in the userscript code and save

## Usage

1. Navigate to your company's stock page in Torn
2. Click **Smart Fill** (appears in the top-right of the order form)
3. Review the filled quantities
4. Click **Place Order** as usual

## How the Algorithm Works

The script aims to bring every item up to **3 days of stock** (you can change this by editing `TARGET_DAYS` at the top of `smartFill()`).

### The Process

**1. Figures out how urgent each item is**
For each item with sales data, it calculates how many days of stock you have left (`current stock ÷ daily sales`). Items with less than 3 days of supply are flagged as needing a top-up. Items already at 3 days or more are skipped entirely — no point wasting storage on them.

**2. Sores each item by urgency**
The closer an item is to running out, the higher its urgency score. Something with 0.5 days left is far more urgent than something with 2.5 days left. This score is used to decide who gets priority when storage is tight.

**3. Splits your available storage proportionally**
Rather than giving everyone an equal share, it hands out storage space in proportion to urgency. The most at-risk items get the biggest slice. No item is ever given more than it actually needs to reach the 3-day target though — excess goes back into the pool.

**4. Redistributes any leftover space**
Because some items hit their target before using their full share, there's usually capacity left over. The script runs a second pass and distributes that remainder to whichever items are still short, again weighted by urgency.

**5. Makes sure nothing overflows**
A final pass clamps everything to your actual remaining storage so the total never exceeds capacity, regardless of rounding.

Resulting in your highest risk items being prioritized, nothing getting overstocked, and your available storage is used efficiently rather than wasted on items that aren't moving.

## Configuration

One value you might want to adjust is `TARGET_DAYS` inside the script:

```js
const TARGET_DAYS = 3; // How many days of stock to aim for per item
```

Set it higher (e.g. `5` or `7`) if you want a bigger buffer, or lower (e.g. `1`) for a leaner, more reactive fill.

## License

Free to use and modify.
