// ==UserScript==
// @name         Torn - Company Stock Smart Fill
// @namespace    torn.toniballoni.smartstock
// @author       Toni_Balloni [3853029]
// @version      1.0.1
// @description  Intelligent stock fill system that dynamically allocates capacity based on demand, stock levels, and priority weighting.
// @match        https://www.torn.com/companies.php*
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

        let data = [];

        items.forEach(li => {
            const stock = getNumber(li.querySelector('.stock')?.innerText || '0');
            const sold = getNumber(li.querySelector('.sold-daily')?.innerText || '0');
            const input = li.querySelector('input[type="text"]');

            if (!input || sold === 0) return;

            const daysLeft = stock / sold;
            const priority = 1 / (daysLeft + 0.1);

            data.push({
                stock,
                sold,
                input,
                priority
            });
        });

        data.sort((a, b) => b.priority - a.priority);

        const totalPriority = data.reduce((sum, d) => sum + d.priority, 0);

        data.forEach(d => {
            if (remainingCapacity <= 0) return;

            let allocation = (d.priority / totalPriority) * remainingCapacity;

            const neededForOneDay = Math.max(0, d.sold - d.stock);
            allocation = Math.max(allocation, neededForOneDay);

            allocation = Math.min(allocation, remainingCapacity);

            const finalAmount = formatNumber(allocation);

            if (finalAmount > 0) {
                d.input.focus();
                d.input.value = finalAmount;
                d.input.dispatchEvent(new Event('input', { bubbles: true }));
                d.input.dispatchEvent(new Event('change', { bubbles: true }));
                d.input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                if (window.jQuery) { window.jQuery(d.input).trigger('input').trigger('change'); }
                d.input.blur();
                remainingCapacity -= finalAmount;
            }
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
