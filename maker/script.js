
const STORAGE_KEY = 'scrapbookLayout';
const scrapbook = document.getElementById('scrapbook');
const selectedName = document.getElementById('selectedName');
const controlLeft = document.getElementById('controlLeft');
const controlTop = document.getElementById('controlTop');
const controlRotate = document.getElementById('controlRotate');
const controlScale = document.getElementById('controlScale');
const controlShadowEnabled = document.getElementById('controlShadowEnabled');
const controlShadowPreset = document.getElementById('controlShadowPreset');
const controlShadowIntensity = document.getElementById('controlShadowIntensity');
const controlShadowBlur = document.getElementById('controlShadowBlur');
const controlShadowSpread = document.getElementById('controlShadowSpread');
const saveButton = document.getElementById('saveButton');
const exportButton = document.getElementById('exportButton');
const exportHtmlButton = document.getElementById('exportHtmlButton');
const importButton = document.getElementById('importButton');
const importFile = document.getElementById('importFile');
const editableToolbarControls = [
    controlLeft,
    controlTop,
    controlRotate,
    controlScale,
    controlShadowEnabled,
    controlShadowPreset,
    controlShadowIntensity,
    controlShadowBlur,
    controlShadowSpread
];
const editableToolbarGroups = Array.from(document.querySelectorAll('.toolbar > .toolbar-group')).slice(0, 3);

let selectedItem = null;
let dragging = false;
let dragMode = 'move';
let dragStart = { x: 0, y: 0, left: 0, top: 0, rotate: 0, scale: 1, centerX: 0, centerY: 0, pointerAngle: 0, widthRatio: 0, heightRatio: 0 };

const defaultState = {
    items: [
        {
            name: 'portrait.png',
            left: 40,
            top: 40,
            rotate: 0,
            scale: 1,
            shadowEnabled: true,
            shadowPreset: 'soft',
            shadowIntensity: 1,
            shadowBlur: 12,
            shadowSpread: 0
        }
    ]
};

function getState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    try {
        const parsed = JSON.parse(stored);
        if (!parsed || !Array.isArray(parsed.items)) return defaultState;
        return parsed;
    } catch (err) {
        console.warn('Invalid scrapbook state, using defaults.', err);
        return defaultState;
    }
}

function getScrapbookRect() {
    const rect = scrapbook.getBoundingClientRect();
    return {
        width: rect.width || 1,
        height: rect.height || 1
    };
}

function normalizeRatio(value, size) {
    if (!Number.isFinite(value)) return 0;
    return value > 1 ? value / size : value;
}

function getItemSizeRatio(img) {
    const storedSizeRatio = Number(img.dataset.sizeRatio || img.dataset.widthRatio);
    if (Number.isFinite(storedSizeRatio) && storedSizeRatio > 0) {
        return storedSizeRatio;
    }
    const scrapbookRect = getScrapbookRect();
    const minDimension = Math.min(scrapbookRect.width, scrapbookRect.height);
    return clamp(img.offsetWidth / minDimension, 0.08, 0.35);
}

function getImageAspectRatio(img) {
    const width = img.naturalWidth || img.offsetWidth || 1;
    const height = img.naturalHeight || img.offsetHeight || 1;
    return height / width;
}

function getLegacyPositionState(itemState, img, scrapbookRect) {
    const widthRatio = Number(itemState.widthRatio ?? itemState.sizeRatio ?? img.dataset.widthRatio ?? img.dataset.sizeRatio);
    const safeWidthRatio = Number.isFinite(widthRatio) && widthRatio > 0 ? widthRatio : getItemSizeRatio(img) * (Math.min(scrapbookRect.width, scrapbookRect.height) / scrapbookRect.width);
    const aspectRatio = getImageAspectRatio(img);
    return {
        centerX: normalizeRatio(Number(itemState.left), scrapbookRect.width) + safeWidthRatio / 2,
        centerY: normalizeRatio(Number(itemState.top), scrapbookRect.height) + (safeWidthRatio * aspectRatio) / 2,
        sizeRatio: Number.isFinite(Number(itemState.sizeRatio)) && Number(itemState.sizeRatio) > 0
            ? Number(itemState.sizeRatio)
            : safeWidthRatio * (scrapbookRect.width / Math.min(scrapbookRect.width, scrapbookRect.height))
    };
}

const shadowPresets = {
    soft: { offsetX: 2, offsetY: 4, blur: 10, spread: 0, alpha: 0.16 },
    medium: { offsetX: 4, offsetY: 8, blur: 18, spread: 0, alpha: 0.22 },
    strong: { offsetX: 6, offsetY: 12, blur: 28, spread: 2, alpha: 0.3 }
};

function getShadowStyle(state) {
    const preset = shadowPresets[state.shadowPreset] || shadowPresets.soft;
    const intensity = Number(state.shadowIntensity || 1);
    const blur = Number(state.shadowBlur ?? preset.blur);
    const spread = Number(state.shadowSpread ?? preset.spread);
    const effectiveBlur = Math.max(0, blur + spread * 0.5);
    const alpha = Math.min(1, preset.alpha * intensity);
    if (!state.shadowEnabled) {
        return 'none';
    }
    return `drop-shadow(${preset.offsetX}px ${preset.offsetY}px ${effectiveBlur}px rgba(0,0,0,${alpha}))`;
}

function setItemState(img, { left, top, rotate, scale, sizeRatio, shadowEnabled, shadowPreset, shadowIntensity, shadowBlur, shadowSpread }) {
    const scrapbookRect = getScrapbookRect();
    const currentShadowEnabled = shadowEnabled === undefined ? img.dataset.shadowEnabled !== 'false' : shadowEnabled;
    const currentShadowPreset = shadowPreset || img.dataset.shadowPreset || 'soft';
    const currentShadowIntensity = shadowIntensity === undefined ? Number(img.dataset.shadowIntensity || 1) : shadowIntensity;
    const currentShadowBlur = shadowBlur === undefined ? Number(img.dataset.shadowBlur ?? shadowPresets[currentShadowPreset].blur) : shadowBlur;
    const currentShadowSpread = shadowSpread === undefined ? Number(img.dataset.shadowSpread ?? shadowPresets[currentShadowPreset].spread) : shadowSpread;
    const currentCenterX = Number.isFinite(left) ? left : normalizeRatio(Number((img.dataset.centerX ?? img.dataset.left) || 0), scrapbookRect.width);
    const currentCenterY = Number.isFinite(top) ? top : normalizeRatio(Number((img.dataset.centerY ?? img.dataset.top) || 0), scrapbookRect.height);
    const currentSizeRatio = sizeRatio === undefined ? getItemSizeRatio(img) : clamp(sizeRatio, 0.08, 0.95);
    img.style.left = currentCenterX * 100 + '%';
    img.style.top = currentCenterY * 100 + '%';
    img.style.width = Math.max(0.01, currentSizeRatio) * 100 + 'vmin';
    img.style.transform = `translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`;
    img.dataset.left = currentCenterX;
    img.dataset.top = currentCenterY;
    img.dataset.centerX = currentCenterX;
    img.dataset.centerY = currentCenterY;
    img.dataset.sizeRatio = Math.max(0.01, currentSizeRatio);
    img.dataset.widthRatio = Math.max(0.01, currentSizeRatio);
    img.dataset.rotate = rotate;
    img.dataset.scale = scale;
    img.dataset.shadowEnabled = currentShadowEnabled ? 'true' : 'false';
    img.dataset.shadowPreset = currentShadowPreset;
    img.dataset.shadowIntensity = currentShadowIntensity;
    img.dataset.shadowBlur = currentShadowBlur;
    img.dataset.shadowSpread = currentShadowSpread;
    img.style.filter = getShadowStyle({
        shadowEnabled: currentShadowEnabled,
        shadowPreset: currentShadowPreset,
        shadowIntensity: currentShadowIntensity,
        shadowBlur: currentShadowBlur,
        shadowSpread: currentShadowSpread
    });
}

function syncToolbar() {
    const hasSelection = Boolean(selectedItem);
    editableToolbarControls.forEach(control => {
        control.disabled = !hasSelection;
    });
    editableToolbarGroups.forEach(group => {
        group.classList.toggle('disabled', !hasSelection);
    });

    if (!selectedItem) {
        selectedName.textContent = 'None';
        controlLeft.value = '';
        controlTop.value = '';
        controlRotate.value = '';
        controlScale.value = 1;
        controlShadowEnabled.checked = false;
        controlShadowPreset.value = 'soft';
        controlShadowIntensity.value = 1;
        controlShadowBlur.value = 12;
        controlShadowSpread.value = 0;
        return;
    }

    selectedName.textContent = selectedItem.dataset.name || 'Image';
    controlLeft.value = (Number((selectedItem.dataset.centerX ?? selectedItem.dataset.left) || 0) * 100).toFixed(1);
    controlTop.value = (Number((selectedItem.dataset.centerY ?? selectedItem.dataset.top) || 0) * 100).toFixed(1);
    controlRotate.value = Number(selectedItem.dataset.rotate || 0);
    controlScale.value = Number(selectedItem.dataset.scale || 1).toFixed(2);
    controlShadowEnabled.checked = selectedItem.dataset.shadowEnabled !== 'false';
    controlShadowPreset.value = selectedItem.dataset.shadowPreset || 'soft';
    controlShadowIntensity.value = Number(selectedItem.dataset.shadowIntensity || 1);
    controlShadowBlur.value = Number(selectedItem.dataset.shadowBlur ?? shadowPresets[controlShadowPreset.value].blur);
    controlShadowSpread.value = Number(selectedItem.dataset.shadowSpread ?? shadowPresets[controlShadowPreset.value].spread);
}

function saveState(silent = false) {
    const scrapbookRect = getScrapbookRect();
    const items = Array.from(scrapbook.querySelectorAll('img.scrapbook-item')).map(img => ({
        name: img.dataset.name,
        centerX: Number((img.dataset.centerX ?? img.dataset.left) || 0),
        centerY: Number((img.dataset.centerY ?? img.dataset.top) || 0),
        left: Number((img.dataset.centerX ?? img.dataset.left) || 0),
        top: Number((img.dataset.centerY ?? img.dataset.top) || 0),
        rotate: Number(img.dataset.rotate || 0),
        scale: Number(img.dataset.scale || 1),
        sizeRatio: Number(img.dataset.sizeRatio || img.dataset.widthRatio || (img.offsetWidth / Math.min(scrapbookRect.width, scrapbookRect.height))),
        shadowEnabled: img.dataset.shadowEnabled !== 'false',
        shadowPreset: img.dataset.shadowPreset || 'soft',
        shadowIntensity: Number(img.dataset.shadowIntensity || 1),
        shadowBlur: Number(img.dataset.shadowBlur || shadowPresets[img.dataset.shadowPreset || 'soft'].blur),
        shadowSpread: Number(img.dataset.shadowSpread || shadowPresets[img.dataset.shadowPreset || 'soft'].spread)
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
    if (!silent) {
        alert('Scrapbook layout saved locally. You can also export the JSON to your Desktop.');
    }
}

function applyState(state) {
    const scrapbookRect = getScrapbookRect();
    const itemStateByName = new Map(state.items.map(itemState => [itemState.name, itemState]));
    Array.from(scrapbook.querySelectorAll('img.scrapbook-item')).forEach((img, index) => {
        const itemState = itemStateByName.get(img.dataset.name);
        if (itemState) {
            const legacyPosition = getLegacyPositionState(itemState, img, scrapbookRect);
            const centerX = itemState.centerX !== undefined ? normalizeRatio(Number(itemState.centerX), scrapbookRect.width) : legacyPosition.centerX;
            const centerY = itemState.centerY !== undefined ? normalizeRatio(Number(itemState.centerY), scrapbookRect.height) : legacyPosition.centerY;
            setItemState(img, {
                left: centerX,
                top: centerY,
                rotate: itemState.rotate,
                scale: itemState.scale,
                sizeRatio: itemState.sizeRatio !== undefined ? normalizeRatio(Number(itemState.sizeRatio), Math.min(scrapbookRect.width, scrapbookRect.height)) : legacyPosition.sizeRatio,
                shadowEnabled: itemState.shadowEnabled !== false,
                shadowPreset: itemState.shadowPreset || 'soft',
                shadowIntensity: itemState.shadowIntensity ?? 1,
                shadowBlur: itemState.shadowBlur ?? shadowPresets[itemState.shadowPreset || 'soft'].blur,
                shadowSpread: itemState.shadowSpread ?? shadowPresets[itemState.shadowPreset || 'soft'].spread
            });
            return;
        }

        const columns = 4;
        const column = index % columns;
        const row = Math.floor(index / columns);
        const fallbackSizeRatio = clamp(img.offsetWidth / Math.min(scrapbookRect.width, scrapbookRect.height), 0.08, 0.35);
        setItemState(img, {
            left: (40 + column * 170) / scrapbookRect.width,
            top: (40 + row * 170) / scrapbookRect.height,
            rotate: (index % 5 - 2) * 4,
            scale: 1,
            sizeRatio: fallbackSizeRatio,
            shadowEnabled: true,
            shadowPreset: 'soft',
            shadowIntensity: 1,
            shadowBlur: shadowPresets.soft.blur,
            shadowSpread: shadowPresets.soft.spread
        });
    });
}

function selectItem(item) {
    if (selectedItem) {
        selectedItem.classList.remove('selected');
    }
    selectedItem = item;
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    syncToolbar();
}

function updateSelectedFromControls() {
    if (!selectedItem) return;
    const left = Number(controlLeft.value) / 100;
    const top = Number(controlTop.value) / 100;
    const rotate = Number(controlRotate.value);
    const scale = Number(controlScale.value);
    const shadowEnabled = controlShadowEnabled.checked;
    const shadowPreset = controlShadowPreset.value;
    const shadowIntensity = Number(controlShadowIntensity.value);
    const shadowBlurValue = Number(controlShadowBlur.value);
    const shadowSpreadValue = Number(controlShadowSpread.value);
    const shadowBlur = Number.isNaN(shadowBlurValue) ? shadowPresets[shadowPreset].blur : shadowBlurValue;
    const shadowSpread = Number.isNaN(shadowSpreadValue) ? shadowPresets[shadowPreset].spread : shadowSpreadValue;
    setItemState(selectedItem, {
        left: Number.isNaN(left) ? 0 : left,
        top: Number.isNaN(top) ? 0 : top,
        rotate: Number.isNaN(rotate) ? 0 : rotate,
        scale: Number.isNaN(scale) ? 1 : scale,
        shadowEnabled,
        shadowPreset,
        shadowIntensity: Number.isNaN(shadowIntensity) ? 1 : shadowIntensity,
        shadowBlur,
        shadowSpread
    });
    saveState(true);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

scrapbook.addEventListener('click', event => {
    const item = event.target.closest('img.scrapbook-item');
    if (!item) {
        selectItem(null);
        return;
    }
    selectItem(item);
});

scrapbook.addEventListener('mousedown', event => {
    const item = event.target.closest('img.scrapbook-item');
    if (!item) return;
    event.preventDefault();
    selectItem(item);
    dragging = true;
    dragMode = event.altKey ? 'rotate' : event.shiftKey ? 'scale' : 'move';
    const rect = item.getBoundingClientRect();
    const scrapbookRect = getScrapbookRect();
    dragStart = {
        x: event.clientX,
        y: event.clientY,
        left: Number((item.dataset.centerX ?? item.dataset.left) || 0),
        top: Number((item.dataset.centerY ?? item.dataset.top) || 0),
        rotate: Number(item.dataset.rotate || 0),
        scale: Number(item.dataset.scale || 1),
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        pointerAngle: Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)),
        sizeRatio: rect.width / Math.min(scrapbookRect.width, scrapbookRect.height)
    };
});

document.addEventListener('mousemove', event => {
    if (!dragging || !selectedItem) return;
    event.preventDefault();
    const rect = scrapbook.getBoundingClientRect();
    const left = dragStart.left;
    const top = dragStart.top;
    if (dragMode === 'move') {
        const newLeft = dragStart.left + (event.clientX - dragStart.x) / rect.width;
        const newTop = dragStart.top + (event.clientY - dragStart.y) / rect.height;
        setItemState(selectedItem, {
            left: newLeft,
            top: newTop,
            rotate: dragStart.rotate,
            scale: dragStart.scale,
            shadowEnabled: selectedItem.dataset.shadowEnabled !== 'false',
            shadowPreset: selectedItem.dataset.shadowPreset || 'soft',
            shadowIntensity: Number(selectedItem.dataset.shadowIntensity || 1),
            shadowBlur: Number(selectedItem.dataset.shadowBlur ?? shadowPresets[selectedItem.dataset.shadowPreset || 'soft'].blur),
            shadowSpread: Number(selectedItem.dataset.shadowSpread ?? shadowPresets[selectedItem.dataset.shadowPreset || 'soft'].spread)
        });
        syncToolbar();
    } else if (dragMode === 'rotate') {
        const angle = Math.atan2(event.clientY - dragStart.centerY, event.clientX - dragStart.centerX);
        const degrees = dragStart.rotate + ((angle - dragStart.pointerAngle) * 180) / Math.PI;
        setItemState(selectedItem, {
            left,
            top,
            rotate: Math.round(degrees),
            scale: Number(selectedItem.dataset.scale || 1),
            shadowEnabled: selectedItem.dataset.shadowEnabled !== 'false',
            shadowPreset: selectedItem.dataset.shadowPreset || 'soft',
            shadowIntensity: Number(selectedItem.dataset.shadowIntensity || 1),
            shadowBlur: Number(selectedItem.dataset.shadowBlur ?? shadowPresets[selectedItem.dataset.shadowPreset || 'soft'].blur),
            shadowSpread: Number(selectedItem.dataset.shadowSpread ?? shadowPresets[selectedItem.dataset.shadowPreset || 'soft'].spread)
        });
        syncToolbar();
    } else if (dragMode === 'scale') {
        const delta = dragStart.y - event.clientY;
        const scale = clamp(dragStart.scale + delta * 0.005, 0.1, 3);
        setItemState(selectedItem, {
            left,
            top,
            rotate: Number(selectedItem.dataset.rotate || 0),
            scale,
            shadowEnabled: selectedItem.dataset.shadowEnabled !== 'false',
            shadowPreset: selectedItem.dataset.shadowPreset || 'soft',
            shadowIntensity: Number(selectedItem.dataset.shadowIntensity || 1),
            shadowBlur: Number(selectedItem.dataset.shadowBlur ?? shadowPresets[selectedItem.dataset.shadowPreset || 'soft'].blur),
            shadowSpread: Number(selectedItem.dataset.shadowSpread ?? shadowPresets[selectedItem.dataset.shadowPreset || 'soft'].spread)
        });
        syncToolbar();
    }
});

document.addEventListener('mouseup', () => {
    if (dragging) {
        saveState(true);
    }
    dragging = false;
});

scrapbook.addEventListener('wheel', event => {
    const item = event.target.closest('img.scrapbook-item');
    if (!item) return;
    event.preventDefault();
    selectItem(item);
    const currentScale = Number(item.dataset.scale || 1);
    const nextScale = clamp(currentScale - event.deltaY * 0.0015, 0.1, 3);
    setItemState(item, {
        left: Number((item.dataset.centerX ?? item.dataset.left) || 0),
        top: Number((item.dataset.centerY ?? item.dataset.top) || 0),
        rotate: Number(item.dataset.rotate || 0),
        scale: Number(nextScale.toFixed(2)),
        shadowEnabled: item.dataset.shadowEnabled !== 'false',
        shadowPreset: item.dataset.shadowPreset || 'soft',
        shadowIntensity: Number(item.dataset.shadowIntensity || 1),
        shadowBlur: Number(item.dataset.shadowBlur ?? shadowPresets[item.dataset.shadowPreset || 'soft'].blur),
        shadowSpread: Number(item.dataset.shadowSpread ?? shadowPresets[item.dataset.shadowPreset || 'soft'].spread)
    });
    syncToolbar();
    saveState(true);
}, { passive: false });

[controlLeft, controlTop, controlRotate, controlScale, controlShadowEnabled, controlShadowPreset, controlShadowIntensity, controlShadowBlur, controlShadowSpread].forEach(input => {
    input.addEventListener('input', updateSelectedFromControls);
});

controlShadowPreset.addEventListener('change', () => {
    if (!selectedItem) return;
    const preset = controlShadowPreset.value;
    controlShadowBlur.value = shadowPresets[preset].blur;
    controlShadowSpread.value = shadowPresets[preset].spread;
    updateSelectedFromControls();
});

saveButton.addEventListener('click', () => saveState(false));
exportButton.addEventListener('click', exportState);
exportHtmlButton.addEventListener('click', exportHtml);
importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) {
        importState(file);
    }
    importFile.value = '';
});

function exportState() {
    const state = JSON.stringify(getState(), null, 2);
    const blob = new Blob([state], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scrapbook-layout.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeHtmlAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function exportHtml() {
    const state = getState();
    const scrapbookRect = getScrapbookRect();
    const itemsByName = new Map(Array.from(scrapbook.querySelectorAll('img.scrapbook-item')).map(img => [img.dataset.name, img]));
    const fragment = state.items.map(itemState => {
        const sourceItem = itemsByName.get(itemState.name);
        if (!sourceItem) return '';
        const centerX = Number((itemState.centerX ?? itemState.left) || 0);
        const centerY = Number((itemState.centerY ?? itemState.top) || 0);
        const sizeRatio = Number(itemState.sizeRatio || itemState.widthRatio || sourceItem.dataset.sizeRatio || sourceItem.dataset.widthRatio || (sourceItem.offsetWidth / Math.min(scrapbookRect.width, scrapbookRect.height)));
        const rotate = Number(itemState.rotate || 0);
        const scale = Number(itemState.scale || 1);
        const filter = getShadowStyle({
            shadowEnabled: itemState.shadowEnabled !== false,
            shadowPreset: itemState.shadowPreset || 'soft',
            shadowIntensity: itemState.shadowIntensity ?? 1,
            shadowBlur: itemState.shadowBlur ?? shadowPresets[itemState.shadowPreset || 'soft'].blur,
            shadowSpread: itemState.shadowSpread ?? shadowPresets[itemState.shadowPreset || 'soft'].spread
        });
        const styleParts = [
            'position:absolute',
            `left:${centerX * 100}%`,
            `top:${centerY * 100}%`,
            `width:${Math.max(0.01, sizeRatio) * 100}vmin`,
            `transform:translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`
        ];
        if (filter !== 'none') {
            styleParts.push(`filter:${filter}`);
        }
        const opacity = sourceItem.style.opacity;
        if (opacity) {
            styleParts.push(`opacity:${opacity}`);
        }
        return `<img src="${escapeHtmlAttribute(sourceItem.getAttribute('src'))}" alt="${escapeHtmlAttribute(sourceItem.getAttribute('alt') || '')}" data-name="${escapeHtmlAttribute(itemState.name)}" style="${styleParts.join(';')};">`;
    }).filter(Boolean).join('\n');

    const blob = new Blob([fragment], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scrapbook-fragment.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importState(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const imported = JSON.parse(reader.result);
            if (!imported || !Array.isArray(imported.items)) throw new Error('Invalid layout file');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
            applyState(imported);
            selectItem(null);
            alert('Import successful. Layout loaded and saved locally.');
        } catch (err) {
            alert('Could not import layout: ' + err.message);
        }
    };
    reader.readAsText(file);
}

window.addEventListener('load', () => {
    applyState(getState());
});