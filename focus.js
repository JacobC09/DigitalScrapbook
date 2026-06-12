const objectDetails = {
    "leaf.png": {
        title: "Burning Maple Leaf",
        description: "The burning maple leaf represents Canada's national view of exceptionalism being challenged by its own treatment of First Nations children. Instead of symbolizing pride, the leaf becomes a warning about the gap between Canadian values and Canadian actions. The flame suggests urgency, showing that injustice cannot be ignored without damaging the country from within."
    },
    "megaphone.png": {
        title: "Megaphone",
        description: "The megaphone represents Cindy Blackstock's refusal to let First Nations children be silenced. She speaks for those who cannot speak for themselves. It is not just a protest symbol, but a symbol of voice, resistance, and survivance."
    },
    "bear.png": {
        title: "Spirit Bear",
        description: "Spirit Bear is the mascot of the First Nations Child and Family Caring Society. The bear represents the 165,000 First Nations children affected by the Canadian Human Rights Tribunal child welfare case. Since this case, Cindy has brought this bear to everyHuman Rights Tribunal Hearing."
    },
    "jordanbear.png": {
        title: "Jordan's Bear",
        description: "Jordan's Bear represents Jordan River Anderson, a young boy from Norway House Cree Nation. Jordan died in hospital while governments argued over who should foot his health care bill. His story led to Jordan's Principle, which says First Nations children should receive the services they need first, while the governments pay later."
    },
    "shoes.png": {
        title: "Empty Shoes",
        description: "The empty shoes represent the children who were denied care, safety, or a full childhood because of the failure of government policies. The shoes are a reminder that policy decisions have human consequences."
    },
    "hand.png": {
        title: "Hand Marking",
        description: "The handprint represents presence, identity, and the right to be seen. Since the dawn of human existence, hand prints and petroglyphs have marked the presence of those who have lived long before us.  For First Nations children, that presence has too often been ignored by systems that underfunded their care and separated them from their families. Cindy Blackstock's work helps give a voice to these children."
    },
    "watch.png": {
        title: "Watch",
        description: "The watch represents the long wait for justice. Cindy Blackstock's fight did not happen in a single moment; it stretched across years of hearings, rulings, appeals, and government delays. The watch also represents the long, shared history in which these conflicts are built upon."
    },
    "portrait.png": {
        title: "Portrait of Cindy Blackstock",
        description: "Cindy Blackstock was born in Burns Lake, a rural community in British Colombia. Her father is Gitxsan First Nation, her mother is non-Indigenous. She is a prominent advocate, professor, and Executive Director of the First Nations Child and Family Caring Society. She is best known for fighting against Canada's unequal treatment of First Nations children, especially through the Canadian Human Rights Tribunal case on child welfare funding."
    },
    "mcgill.png": {
        title: "McGill University",
        description: "Cindy Blackstock is a highly educated and currently works as a professor in the McGill School of Social Work. Although she is a respected academic, her work is not limited to research. She has valuable experiences working directly with First nations communities and fighting on the front lines for social reform."
    },
    "redacted.png": {
        title: "Redacted Government Documents",
        description: "The redacted documents represent resistance Cindy Blackstock faced while challenging the federal government. During the human rights case, the government had put her under surveillance, spying on her personal social media accounts. These documents symbolize how governments try to take control when accountability becomes uncomfortable."
    }
};


document.addEventListener('DOMContentLoaded', () => {
    const scrapbook = document.getElementById('scrapbook');
    const objectPanel = document.getElementById('objectPanel');
    const qrToggle = document.getElementById('qrToggle');
    const qrBackdrop = document.getElementById('qrBackdrop');
    const qrClose = document.getElementById('qrClose');
    const body = document.body;
    const items = Array.from(scrapbook.querySelectorAll('img'));

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
            <p class="subtitle">SYMBOL</p>
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
    }

    function openQrPanel() {
        clearSelection();
        qrBackdrop.classList.add('is-visible');
        qrBackdrop.setAttribute('aria-hidden', 'false');
        qrToggle.setAttribute('aria-expanded', 'true');
        qrClose.focus();
    }

    function closeQrPanel() {
        qrBackdrop.classList.remove('is-visible');
        qrBackdrop.setAttribute('aria-hidden', 'true');
        qrToggle.setAttribute('aria-expanded', 'false');
        qrToggle.focus();
    }

    function selectItem(item) {
        if (!item || item === scrapbook.querySelector('img.selected')) {
            return;
        }

        if (!(item.getAttribute("data-name") in objectDetails)) {
            return;
        }

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

    qrToggle.addEventListener('click', openQrPanel);

    qrClose.addEventListener('click', closeQrPanel);

    qrBackdrop.addEventListener('click', event => {
        if (event.target === qrBackdrop) {
            closeQrPanel();
        }
    });


    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (qrBackdrop.classList.contains('is-visible')) {
                closeQrPanel();
                return;
            }

            clearSelection();
        }
    });
});
