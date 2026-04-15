# Torn Smart Stock

A simple Tampermonkey userscript that adds a **Smart Fill** button to a Torn Company's stock page.

It automatically allocates storage space based on **demand, stock levels, and priority weighting**, helping prevent stockouts and optimize inventory flow.

## Features

- Adds a **Smart Fill** button to the stock page
- Automatically balances stock using a weighted demand algorithm
- Prioritizes:
  - Low-stock items
  - High daily sales items
- Respects total storage capacity
- Works instantly on page load (no configuration needed)

## How It Works

The script calculates:

- Days of supply per item (`stock / sold daily`)
- Priority weighting (lower supply = higher priority)
- Available storage capacity

Then distributes stock intelligently instead of blindly filling everything evenly.

## Installation

1. Install **Tampermonkey** (browser extension)
2. Create a new script
3. Paste in the userscript code
4. Save

## Usage

1. Go to/refresh your company stock page in Torn
2. Click **Smart Fill**
3. The script automatically fills order quantities
4. Click **Place Order** as usual

## Strategy

The algorithm aims to:

- Prevent stockouts on high-demand items
- Avoid overstocking slow-moving items
- Maintain balanced inventory based on real sales data
## License

Free to use and modify.
