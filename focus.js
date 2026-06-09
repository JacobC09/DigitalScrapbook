document.addEventListener('DOMContentLoaded', () => {
    const scrapbook = document.getElementById('scrapbook');
    const objectPanel = document.getElementById('objectPanel');
    const body = document.body;
    const items = Array.from(scrapbook.querySelectorAll('img'));

    const objectDetails = {
        'hand.png': {
            title: 'Hands',
            description: 'A reaching hand that adds movement and a human presence to the collage.'
        }
    };

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function parseTransform(transform) {
        const rotateMatch = transform.match(/rotate\((-?[\d.]+)deg\)/);
        const scaleMatch = transform.match(/scale\((-?[\d.]+)\)/);
        return {
            rotate: rotateMatch ? rotateMatch[1] : '0',
            scale: scaleMatch ? scaleMatch[1] : '1'
        };
    }

    function getObjectDetails(item) {
        const fileName = item.dataset.name || item.getAttribute('alt') || 'Object';
        const fallbackName = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        return {
            title: objectDetails[fileName]?.title,
            description: objectDetails[fileName]?.description
        };
    }

    function getPanelMarkup(item) {
        const details = getObjectDetails(item);
        const positionX = (parseFloat(item.style.left) || 0).toFixed(1);
        const positionY = (parseFloat(item.style.top) || 0).toFixed(1);
        const size = item.style.width || 'unknown';
        const transform = parseTransform(item.style.transform || '');
        const shadowState = item.dataset.shadowFilter && item.dataset.shadowFilter !== 'none' ? 'Enabled' : 'Off';

        return `
            <p class="subtitle">Object Profile</p>
            <h2>${escapeHtml(details.title)}</h2>
            <p class="object-description">${escapeHtml(details.description)}</p>
        `;
    }

    function clearSelection() {
        const current = scrapbook.querySelector('img.selected');
        if (current) {
            current.classList.remove('selected');
        }
        body.classList.remove('has-selection');
        objectPanel.classList.remove('is-visible');
        objectPanel.setAttribute('aria-hidden', 'true');
        objectPanel.innerHTML = '';
    }

    function selectItem(item) {
        if (!item || item === scrapbook.querySelector('img.selected')) {
            return;
        }

        if (!(item.getAttribute("data-name") in objectDetails)) {
            return;
        }

        console.log("hi", item.getAttribute("data-name") in objectDetails)

        const current = scrapbook.querySelector('img.selected');
        if (current) {
            current.classList.remove('selected');
        }

        item.classList.add('selected');
        body.classList.add('has-selection');
        objectPanel.innerHTML = getPanelMarkup(item);
        objectPanel.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            objectPanel.classList.add('is-visible');
        });
    }

    items.forEach(item => {
        const shadowFilter = item.style.filter.trim();
        if (shadowFilter) {
            item.dataset.shadowFilter = shadowFilter;
            item.style.setProperty('--item-shadow', shadowFilter);
            item.style.removeProperty('filter');
        } else {
            item.dataset.shadowFilter = 'none';
        }
    });

    scrapbook.addEventListener('click', event => {
        const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
        const matchedItem = elementsAtPoint.find(element => {
            if (!scrapbook.contains(element) || element === scrapbook) return false;
            if (element instanceof HTMLElement) {
                const dataName = element.getAttribute('data-name');
                return dataName && dataName in objectDetails;
            }
            return false;
        });

        if (!matchedItem) {
            clearSelection();
            return;
        }

        selectItem(matchedItem);
    });



    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            clearSelection();
        }
    });
});
