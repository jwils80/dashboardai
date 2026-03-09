// Data Structure
// panels = [ { id: '...', name: '...', categories: [ { id: '...', name: '...', links: [...] } ] } ]

const defaultData = [
    {
        id: 'panel-1',
        name: 'PERSONAL',
        categories: [
            {
                id: 'cat-1',
                name: 'RADICAL STUFF',
                links: [
                    { id: 'link-1', name: 'MTV ARCHIVE', url: 'https://mtv.com' },
                    { id: 'link-2', name: 'SYNTHWAVE RADIO', url: 'https://youtube.com' }
                ]
            }
        ]
    },
    {
        id: 'panel-2',
        name: 'WORK',
        categories: [
            {
                id: 'cat-2',
                name: 'TOOLS',
                links: [
                    { id: 'link-3', name: 'GITHUB', url: 'https://github.com' }
                ]
            }
        ]
    }
];

let panels = [];
let currentPanelId = null;
let draggedItem = null; // { type: 'category'|'link', element: Node, dataId: string, parentCatId?: string }
let isUnlocked = localStorage.getItem('linkDashboardUnlocked') === 'true';

// DOM Elements
const dashboard = document.getElementById('dashboard');
const tabsContainer = document.getElementById('tabsContainer');
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');

// Modals
const modalOverlay = document.getElementById('modalOverlay');
const itemForm = document.getElementById('itemForm');
const formMode = document.getElementById('formMode');
const formCatId = document.getElementById('formCatId');
const formLinkId = document.getElementById('formLinkId');
const itemName = document.getElementById('itemName');
const itemUrl = document.getElementById('itemUrl');
const itemDesc = document.getElementById('itemDesc');
const urlGroup = document.getElementById('urlGroup');
const descGroup = document.getElementById('descGroup');
const modalTitle = document.getElementById('modalTitle');

const confirmOverlay = document.getElementById('confirmOverlay');
let pendingDelete = null; // { type: 'category'|'link', catId: '...', linkId: '...' }

// Password Elements
const lockToggleBtn = document.getElementById('lockToggleBtn');
const passwordOverlay = document.getElementById('passwordOverlay');
const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('passwordInput');
const closePasswordBtn = document.getElementById('closePasswordBtn');

// Init
function init() {
    loadData();
    applyLockState();
    renderTabs();
    renderDashboard();
    startClock();
    setupEventListeners();
    setupKeyboardShortcuts();
}

function applyLockState() {
    if (isUnlocked) {
        document.body.classList.remove('locked');
        lockToggleBtn.textContent = '🔒 LOCK';
        lockToggleBtn.style.background = 'var(--yellow)';
        lockToggleBtn.style.color = 'var(--black)';
    } else {
        document.body.classList.add('locked');
        lockToggleBtn.textContent = '🔓 UNLOCK EDITING';
        lockToggleBtn.style.background = 'var(--purple)';
        lockToggleBtn.style.color = '#fff';
    }
}

function loadData() {
    const saved = localStorage.getItem('linkDashboardPanels');
    if (saved) {
        try {
            panels = JSON.parse(saved);
        } catch (e) {
            panels = defaultData;
        }
    } else {
        // Migration from old version or fresh start
        const oldSaved = localStorage.getItem('linkDashboardData');
        if (oldSaved) {
            try {
                const oldCats = JSON.parse(oldSaved);
                panels = [{ id: 'panel-1', name: 'DEFAULT', categories: oldCats }];
            } catch (e) {
                panels = defaultData;
            }
        } else {
            panels = defaultData;
        }
        saveData();
    }

    if (panels.length > 0) {
        currentPanelId = panels[0].id;
    }
}

function saveData() {
    localStorage.setItem('linkDashboardPanels', JSON.stringify(panels));
}

// Clock
function startClock() {
    function update() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    update();
    setInterval(update, 1000);
}

// Render Tabs
function renderTabs() {
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    panels.forEach(panel => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn ' + (panel.id === currentPanelId ? 'active' : '');
        btn.textContent = panel.name;
        btn.onclick = () => {
            currentPanelId = panel.id;
            renderTabs();
            renderDashboard();
        };
        tabsContainer.appendChild(btn);
    });

    const addTabBtn = document.createElement('button');
    addTabBtn.className = 'add-tab-btn';
    addTabBtn.textContent = '+';
    addTabBtn.title = 'Add Panel';
    addTabBtn.onclick = () => openModal('addPanel');
    tabsContainer.appendChild(addTabBtn);
}

// Render Dashboard
function renderDashboard() {
    dashboard.innerHTML = '';

    const currentPanel = panels.find(p => p.id === currentPanelId);
    if (!currentPanel) return;

    currentPanel.categories.forEach(cat => {
        const catCard = document.createElement('div');
        catCard.className = 'category-card';
        catCard.dataset.catId = cat.id;
        catCard.draggable = true;

        let linksHTML = cat.links.map(link => {
            let hostname = '';
            try {
                hostname = new URL(link.url).hostname;
            } catch (e) { }

            return `
                <div class="link-item" data-cat-id="${cat.id}" data-link-id="${link.id}" draggable="true">
                    <div class="drag-handle" title="Drag to reorder">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                    </div>
                    <div class="link-details">
                        <a href="${link.url}" class="link-content" target="_blank" rel="noopener noreferrer">
                            <img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=32" class="fav-icon" loading="lazy" alt="" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIxMiIgeTE9IjgiIHgyPSIxMiIgeTI9IjEyIj48L2xpbmU+PGxpbmUgeDE9IjEyIiB5MT0iMTYiIHgyPSIxMi4wMSIgeTI9IjE2Ij48L2xpbmU+PC9zdmc+'">
                            <span class="link-name">${link.name}</span>
                        </a>
                        ${link.desc ? `<p class="link-desc">${link.desc}</p>` : ''}
                    </div>
                    <div class="link-actions">
                        <button class="icon-btn edit-link" data-cat-id="${cat.id}" data-link-id="${link.id}" title="Edit Link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="icon-btn delete delete-link" data-cat-id="${cat.id}" data-link-id="${link.id}" title="Delete Link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        catCard.innerHTML = `
            <div class="category-header">
                <div style="display: flex; align-items: center;">
                    <div class="drag-handle" title="Drag to reorder category">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle></svg>
                    </div>
                    <h3>${cat.name}</h3>
                </div>
                <div class="cat-actions">
                    <button class="icon-btn delete delete-cat" data-cat-id="${cat.id}" title="Delete Category">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
            <div class="links-list" data-cat-id="${cat.id}">
                ${linksHTML}
            </div>
            <button class="add-link-btn" data-cat-id="${cat.id}">+ ADD LINK</button>
        `;
        dashboard.appendChild(catCard);
    });

    attachDragAndDrop();

    // Attach dynamic click listeners
    document.querySelectorAll('.add-link-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal('addLink', btn.dataset.catId));
    });
    document.querySelectorAll('.edit-link').forEach(btn => {
        btn.addEventListener('click', () => openModal('editLink', btn.dataset.catId, btn.dataset.linkId));
    });
    document.querySelectorAll('.delete-link').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDelete = { type: 'link', catId: btn.dataset.catId, linkId: btn.dataset.linkId };
            confirmMessage.innerHTML = 'Delete this gnarly link?';
            confirmOverlay.classList.remove('hidden');
        });
    });
    document.querySelectorAll('.delete-cat').forEach(btn => {
        btn.addEventListener('click', () => promptDelete('category', btn.dataset.catId));
    });
}

function attachDragAndDrop() {
    if (!isUnlocked) return; // Prevent drag mechanics completely if locked

    // Categories Drag
    const catCards = document.querySelectorAll('.category-card');
    catCards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            // Only drag category if using its handle, to allow link dragging to work without moving category
            if (!e.target.closest('.category-header')) return;

            e.stopPropagation();
            draggedItem = { type: 'category', element: card, dataId: card.dataset.catId };
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            draggedItem = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        card.addEventListener('dragover', (e) => {
            if (!draggedItem || draggedItem.type !== 'category') return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (card !== draggedItem.element) {
                card.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));

        card.addEventListener('drop', (e) => {
            if (!draggedItem || draggedItem.type !== 'category') return;
            e.preventDefault();
            card.classList.remove('drag-over');
            if (card !== draggedItem.element) {
                reorderCategories(draggedItem.dataId, card.dataset.catId);
            }
        });
    });

    // Links Drag
    const linkItems = document.querySelectorAll('.link-item');
    linkItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            draggedItem = {
                type: 'link',
                element: item,
                dataId: item.dataset.linkId,
                parentCatId: item.dataset.catId
            };
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            if (!draggedItem || draggedItem.type !== 'link') return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (item !== draggedItem.element) {
                // Determine if dropping above or below
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    item.classList.add('drag-over');
                } else {
                    item.classList.remove('drag-over');
                }
            }
        });

        item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

        item.addEventListener('drop', (e) => {
            if (!draggedItem || draggedItem.type !== 'link') return;
            e.preventDefault();
            e.stopPropagation(); // prevent category drop if inside a link
            item.classList.remove('drag-over');

            if (item !== draggedItem.element) {
                reorderLinks(draggedItem, item.dataset.linkId, item.dataset.catId);
            }
        });
    });

    // Link Empty List Drop Zone
    const linkLists = document.querySelectorAll('.links-list');
    linkLists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            if (!draggedItem || draggedItem.type !== 'link') return;
            e.preventDefault();
        });

        list.addEventListener('drop', (e) => {
            if (!draggedItem || draggedItem.type !== 'link') return;
            e.preventDefault();
            // Only trigger if dropping on the empty space of the list, not a specific link
            if (e.target.closest('.link-item')) return;

            reorderLinks(draggedItem, null, list.dataset.catId);
        });
    });
}

function reorderCategories(dragId, dropId) {
    const currentPanel = panels.find(p => p.id === currentPanelId);
    if (!currentPanel) return;

    const dragIdx = currentPanel.categories.findIndex(c => c.id === dragId);
    const dropIdx = currentPanel.categories.findIndex(c => c.id === dropId);

    if (dragIdx > -1 && dropIdx > -1) {
        const [movedCat] = currentPanel.categories.splice(dragIdx, 1);
        currentPanel.categories.splice(dropIdx, 0, movedCat);
        saveData();
        renderDashboard();
    }
}

function reorderLinks(dragMeta, dropLinkId, dropCatId) {
    const currentPanel = panels.find(p => p.id === currentPanelId);
    if (!currentPanel) return;

    const sourceCat = currentPanel.categories.find(c => c.id === dragMeta.parentCatId);
    const targetCat = currentPanel.categories.find(c => c.id === dropCatId);

    if (!sourceCat || !targetCat) return;

    const dragIdx = sourceCat.links.findIndex(l => l.id === dragMeta.dataId);
    if (dragIdx === -1) return;

    const [movedLink] = sourceCat.links.splice(dragIdx, 1);

    if (dropLinkId) {
        // Dropped on a specific link
        const dropIdx = targetCat.links.findIndex(l => l.id === dropLinkId);
        if (dropIdx > -1) {
            targetCat.links.splice(dropIdx, 0, movedLink);
        } else {
            targetCat.links.push(movedLink);
        }
    } else {
        // Dropped on empty category list
        targetCat.links.push(movedLink);
    }

    saveData();
    renderDashboard();
}

function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // Ignore if focus is in an input or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = parseInt(e.key);
        if (!isNaN(key) && key >= 1 && key <= 9) {
            const index = key - 1;
            if (index < panels.length) {
                currentPanelId = panels[index].id;
                renderTabs();
                renderDashboard();
            }
        }
    });
}

function setupEventListeners() {
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        openModal('addCat');
    });

    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    // Lock/Unlock Auth Flow
    lockToggleBtn.addEventListener('click', () => {
        if (isUnlocked) {
            isUnlocked = false;
            localStorage.setItem('linkDashboardUnlocked', 'false');
            applyLockState();
            renderDashboard(); // re-render to strip drag mechanics
        } else {
            passwordInput.value = '';
            passwordOverlay.classList.remove('hidden');
            passwordInput.focus();
        }
    });

    closePasswordBtn.addEventListener('click', () => {
        passwordOverlay.classList.add('hidden');
    });

    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // The password required to unlock edit access
        if (passwordInput.value === 'password') {
            isUnlocked = true;
            localStorage.setItem('linkDashboardUnlocked', 'true');
            applyLockState();
            renderDashboard(); // re-render to re-attach drag mechanics
            passwordOverlay.classList.add('hidden');
        } else {
            alert('Incorrect password! Way to test the security though.');
            passwordInput.focus();
        }
    });

    // Form Submit
    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const mode = formMode.value;
        const name = itemName.value.trim();
        let url = itemUrl.value.trim();
        const desc = itemDesc.value.trim();

        if (mode !== 'addCat' && mode !== 'addPanel' && url && !url.startsWith('http')) {
            url = 'https://' + url;
        }

        const currentPanel = panels.find(p => p.id === currentPanelId);

        if (mode === 'addPanel') {
            const newId = 'panel-' + Date.now();
            panels.push({ id: newId, name, categories: [] });
            currentPanelId = newId; // switch to new panel
            renderTabs();
        } else if (mode === 'addCat') {
            if (currentPanel) {
                currentPanel.categories.push({ id: 'cat-' + Date.now(), name, links: [] });
            }
        } else if (mode === 'addLink') {
            if (currentPanel) {
                const cat = currentPanel.categories.find(c => c.id === formCatId.value);
                if (cat) cat.links.push({ id: 'link-' + Date.now(), name, url, desc });
            }
        } else if (mode === 'editLink') {
            if (currentPanel) {
                const cat = currentPanel.categories.find(c => c.id === formCatId.value);
                if (cat) {
                    const link = cat.links.find(l => l.id === formLinkId.value);
                    if (link) {
                        link.name = name;
                        link.url = url;
                        link.desc = desc;
                    }
                }
            }
        }

        saveData();
        renderDashboard();
        closeModal();
    });

    // Delete Modals
    document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirm);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) closeConfirm();
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeConfirm();
        }
    });
}

function openModal(mode, catId = '', linkId = '') {
    formMode.value = mode;
    formCatId.value = catId;
    formLinkId.value = linkId;

    itemName.value = '';
    itemUrl.value = '';
    itemDesc.value = '';

    if (mode === 'addPanel') {
        modalTitle.textContent = 'NEW PANEL';
        urlGroup.style.display = 'none';
        descGroup.style.display = 'none';
        itemUrl.removeAttribute('required');
    } else if (mode === 'addCat') {
        modalTitle.textContent = 'NEW CATEGORY';
        urlGroup.style.display = 'none';
        descGroup.style.display = 'none';
        itemUrl.removeAttribute('required');
    } else if (mode === 'addLink') {
        modalTitle.textContent = 'ADD LINK';
        urlGroup.style.display = 'block';
        descGroup.style.display = 'block';
        itemUrl.setAttribute('required', 'true');
    } else if (mode === 'editLink') {
        modalTitle.textContent = 'EDIT LINK';
        urlGroup.style.display = 'block';
        descGroup.style.display = 'block';
        itemUrl.setAttribute('required', 'true');

        const currentPanel = panels.find(p => p.id === currentPanelId);
        if (currentPanel) {
            const cat = currentPanel.categories.find(c => c.id === catId);
            if (cat) {
                const link = cat.links.find(l => l.id === linkId);
                if (link) {
                    itemName.value = link.name;
                    itemUrl.value = link.url;
                    itemDesc.value = link.desc || '';
                }
            }
        }
    }

    modalOverlay.classList.remove('hidden');
    itemName.focus();
}

function closeModal() {
    modalOverlay.classList.add('hidden');
}

function promptDelete(type, catId, linkId = null) {
    pendingDelete = { type, catId, linkId };

    if (type === 'panel') {
        confirmMessage.innerHTML = 'Delete this whole Panel?';
    } else if (type === 'category') {
        confirmMessage.innerHTML = 'Are you sure you want to delete this Radical Category?<br/>All links inside will be dumped.';
    } else if (type === 'link') {
        confirmMessage.innerHTML = 'Delete this gnarly link?';
    }

    confirmOverlay.classList.remove('hidden');
}

function closeConfirm() {
    confirmOverlay.classList.add('hidden');
    pendingDelete = null;
}

function confirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.type === 'panel') {
        panels = panels.filter(p => p.id !== pendingDelete.catId);
        if (panels.length > 0) {
            currentPanelId = panels[0].id;
        } else {
            currentPanelId = null;
        }
        renderTabs();
    } else if (pendingDelete.type === 'category') {
        const currentPanel = panels.find(p => p.id === currentPanelId);
        if (currentPanel) {
            currentPanel.categories = currentPanel.categories.filter(c => c.id !== pendingDelete.catId);
        }
    } else if (pendingDelete.type === 'link') {
        const currentPanel = panels.find(p => p.id === currentPanelId);
        if (currentPanel) {
            const cat = currentPanel.categories.find(c => c.id === pendingDelete.catId);
            if (cat) {
                cat.links = cat.links.filter(l => l.id !== pendingDelete.linkId);
            }
        }
    }

    saveData();
    renderDashboard();
    closeConfirm();
}

// Start
init();
