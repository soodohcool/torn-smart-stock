// ==UserScript==
// @name         Torn - Company Stock Smart Fill
// @namespace    torn.toniballoni.smartstock
// @author       Toni_Balloni [3853029]
// @version      1.0.2
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

    function smartFill() {
        const items = document.querySelectorAll('.stock-list > li:not(.total)');
        const capacityCurrent = getNumber(document.querySelector('.storage-capacity .current').innerText);
        const capacityMax = getNumber(document.querySelector('.storage-capacity .max').innerText);

        let remainingCapacity = capacityMax - capacityCurrent;
        if (remainingCapacity <= 0) return;

        const TARGET_DAYS = 3; // How many days of stock to aim for per item

        let data = [];

        items.forEach(li => {
            const stock = getNumber(li.querySelector('.stock')?.innerText || '0');
            const sold  = getNumber(li.querySelector('.sold-daily')?.innerText || '0');
            const input = li.querySelector('input[type="text"]');

            if (!input || sold === 0) return;

            const daysLeft = stock / sold;

            // Skip items that already meet or exceed the target
            if (daysLeft >= TARGET_DAYS) return;

            const need    = Math.max(0, Math.ceil(sold * TARGET_DAYS - stock)); // Units to reach target
            const urgency = TARGET_DAYS - daysLeft; // 0..TARGET_DAYS, higher = more urgent

            data.push({ stock, sold, input, need, urgency, daysLeft });
        });

        if (data.length === 0) return;

        // Give each item what it needs, scaled by urgency weight
        data.sort((a, b) => b.urgency - a.urgency);

        const totalUrgency = data.reduce((sum, d) => sum + d.urgency, 0);

        // Weighted ideal allocation, capped at actual need
        data.forEach(d => {
            const idealShare = (d.urgency / totalUrgency) * remainingCapacity;
            d.allocation = Math.min(idealShare, d.need); // Never give more than needed
        });

        // Redistribute leftover from capped items to still-needy ones
        let allocated = data.reduce((sum, d) => sum + d.allocation, 0);
        let leftover  = remainingCapacity - allocated;

        if (leftover > 1) {
            // Only items that still have unmet need are eligible for redistribution
            const needy = data.filter(d => d.allocation < d.need);
            if (needy.length > 0) {
                const needyUrgency = needy.reduce((sum, d) => sum + d.urgency, 0);
                needy.forEach(d => {
                    const bonus = (d.urgency / needyUrgency) * leftover;
                    d.allocation = Math.min(d.allocation + bonus, d.need);
                });
            }
        }

        // Hard clamp to remaining capacity in sorted order
        let used = 0;
        data.forEach(d => {
            const room = remainingCapacity - used;
            d.allocation = Math.min(formatNumber(d.allocation), room);
            used += d.allocation;
        });
        data.forEach(d => {
            if (d.allocation <= 0) return;

            d.input.focus();
            d.input.value = d.allocation;
            d.input.dispatchEvent(new Event('input', { bubbles: true }));
            d.input.dispatchEvent(new Event('change', { bubbles: true }));
            d.input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            if (window.jQuery) { window.jQuery(d.input).trigger('input').trigger('change'); }
            d.input.blur();
        });
    }

    const observer = new MutationObserver(() => {
        injectStyles();
        injectButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    injectStyles();
    injectButton();
})();
