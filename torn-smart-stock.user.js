// ==UserScript==
// @name         Torn - Company Stock Smart Fill
// @namespace    torn.toniballoni.smartstock
// @author       Toni_Balloni [3853029]
// @version      1.0.3
// @description  Intelligent stock fill system that dynamically allocates capacity based on demand, stock levels, and priority weighting.
// @match        https://www.torn.com/companies.php*
// @updateURL    https://github.com/soodohcool/torn-smart-stock/raw/refs/heads/main/torn-smart-stock.user.js
// @downloadURL  https://github.com/soodohcool/torn-smart-stock/raw/refs/heads/main/torn-smart-stock.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function formatNumber(num) {
        return Math.floor(num);
    }

    function getNumber(text) {
        return parseInt(text.replace(/,/g, '').trim()) || 0;
    }

    function getStockColor(daysLeft) {
        if (daysLeft <= 1) return '#ff3b30';      // red
        if (daysLeft < 3)  return '#ff9500';      // orange
        if (daysLeft < 5)  return '#ffcc00';      // yellow
        return '#34c759';                        // green
    }

    function applyStockColors() {
        const items = document.querySelectorAll('.stock-list > li:not(.total)');

        items.forEach(li => {
            const stockEl = li.querySelector('.stock');
            const sold = getNumber(li.querySelector('.sold-daily')?.innerText || '0');
            const stock = getNumber(stockEl?.innerText || '0');

            if (!stockEl || sold === 0) return;

            const daysLeft = stock / sold;

            stockEl.style.color = getStockColor(daysLeft);
            stockEl.style.fontWeight = 'bold';
            stockEl.title = `${Math.floor(daysLeft.toFixed(1))} days stock remaining`;
        });
    }

    function injectStyles() {
        if (document.getElementById('tballs-smart-fill-style')) return;

        const style = document.createElement('style');
        style.id = 'tballs-smart-fill-style';
        style.innerHTML = `
            .tballs-smart-fill-btn {
                font-family: Tahoma, Verdana, sans-serif;
                font-size: 12px;
                padding: 4px 12px;
                background: #c0c0c0;
                color: #000;
                border-top: 1px solid #ffffff;
                border-left: 1px solid #ffffff;
                border-right: 1px solid #404040;
                border-bottom: 1px solid #404040;
                box-shadow: inset 1px 1px 0px #dfdfdf;
                cursor: pointer;
                float: right;
                margin-left: 10px;
            }

            .tballs-smart-fill-btn:active {
                border-top: 1px solid #404040;
                border-left: 1px solid #404040;
                border-right: 1px solid #ffffff;
                border-bottom: 1px solid #ffffff;
                box-shadow: inset 1px 1px 0px #808080;
            }

            .tballs-smart-fill-btn:hover {
                background: #d4d0c8;
            }
        `;
        document.head.appendChild(style);
    }

    function injectButton() {
        const totalPriceRow = document.querySelector('.total-price');
        if (!totalPriceRow || document.getElementById('tballs-smart-fill-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'tballs-smart-fill-btn';
        btn.innerText = 'Smart Fill';
        btn.className = 'tballs-smart-fill-btn';

        btn.onclick = smartFill;

        totalPriceRow.appendChild(btn);
    }

    function setInput(input, value) {
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        if (window.jQuery) { window.jQuery(input).trigger('input').trigger('change'); }
        input.blur();
    }

    function smartFill() {
        const items = document.querySelectorAll('.stock-list > li:not(.total)');
        const TARGET_DAYS = 3; // How many days of stock to aim for per item
        let allItems = [];
        let needyItems = [];

        // Reset all inputs so capacity reads from a clean state
        items.forEach(li => {
            const input = li.querySelector('input[type="text"]');
            if (input) setInput(input, 0);
        });

        const capacityCurrent = getNumber(document.querySelector('.storage-capacity .current').innerText);
        const capacityMax = getNumber(document.querySelector('.storage-capacity .max').innerText);
        let remaining = capacityMax - capacityCurrent;
        if (remaining <= 0) return;

        items.forEach(li => {
            const stock = getNumber(li.querySelector('.stock')?.innerText || '0');
            const stockEl = li.querySelector('.stock');
            const sold  = getNumber(li.querySelector('.sold-daily')?.innerText || '0');
            const input = li.querySelector('input[type="text"]');

            if (!input || sold === 0) return;

            const daysLeft = stock / sold;

            if (stockEl) {
                stockEl.style.color = getStockColor(daysLeft);
                stockEl.style.fontWeight = 'bold';
            }

            const priority = 1 / (daysLeft + 0.1) ** 2;
            const item = { stock, sold, input, priority, allocation: 0 };
            allItems.push(item);

            if (daysLeft < TARGET_DAYS) {
                item.need    = Math.max(0, Math.ceil(sold * TARGET_DAYS - stock));
                item.urgency = TARGET_DAYS - daysLeft;
                needyItems.push(item);
            }
        });

        if (allItems.length === 0) return;

        // Phase 1: Fill items below TARGET_DAYS up to their need, weighted by urgency
        if (needyItems.length > 0) {
            needyItems.sort((a, b) => b.urgency - a.urgency);

            let pool = remaining;
            while (pool > 0) {
                const eligible = needyItems.filter(d => d.allocation < d.need);
                if (eligible.length === 0) break;

                const totalUrgency = eligible.reduce((sum, d) => sum + d.urgency, 0);
                let distributed = 0;

                eligible.forEach(d => {
                    const share = (d.urgency / totalUrgency) * pool;
                    const give = Math.min(share, d.need - d.allocation);
                    d.allocation += give;
                    distributed += give;
                });

                if (distributed < 1) break;
                pool = remaining - needyItems.reduce((sum, d) => sum + d.allocation, 0);
            }
        }

        // Phase 2: Distribute any leftover capacity proportionally by priority (fewer days = more)
        let surplus = remaining - allItems.reduce((sum, d) => sum + d.allocation, 0);
        if (surplus > 0) {
            const totalPriority = allItems.reduce((sum, d) => sum + d.priority, 0);
            allItems.forEach(d => {
                d.allocation += (d.priority / totalPriority) * surplus;
            });
        }

        // Floor and distribute rounding remainders to highest-priority items
        allItems.forEach(d => d.allocation = Math.floor(d.allocation));
        let total = allItems.reduce((sum, d) => sum + d.allocation, 0);
        let leftover = remaining - total;
        allItems.sort((a, b) => b.priority - a.priority);
        for (let i = 0; leftover > 0 && i < allItems.length; i++) {
            allItems[i].allocation++;
            leftover--;
        }

        allItems.forEach(d => {
            if (d.allocation > 0) setInput(d.input, d.allocation);
        });

        applyStockColors();
    }

    const observer = new MutationObserver(() => {
        injectStyles();
        injectButton();
        applyStockColors();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    injectStyles();
    injectButton();
    applyStockColors();
})();
