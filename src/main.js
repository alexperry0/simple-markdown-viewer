document.addEventListener('DOMContentLoaded', async () => {
    const { invoke } = window.__TAURI__.core;
    const { listen } = window.__TAURI__.event;
    const { getCurrentWebview } = window.__TAURI__.webview;
    const { getCurrentWindow } = window.__TAURI__.window;

    // Configure marked with highlight.js via the marked-highlight extension.
    // marked v5+ removed the built-in highlight option from setOptions().
    // The marked-highlight extension package is required instead.
    const { markedHighlight } = globalThis.markedHighlight;

    marked.use(markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        }
    }));

    // Global state - now managing multiple tabs
    let currentFilePath = null;
    let tabs = new Map(); // Map<filePath, { content, scrollPosition, previousBlockSignatures }>

    // DOM elements
    const emptyState = document.getElementById('empty-state');
    const contentEl = document.getElementById('content');
    const toolbar = document.getElementById('toolbar');
    const tabsContainer = document.getElementById('tabs-container');
    const openBtn = document.getElementById('open-btn');
    const openBtnToolbar = document.getElementById('open-btn-toolbar');

    // Block-level elements that represent distinct content units
    const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,pre,ul,ol,blockquote,table,hr';

    function getBlockSignatures() {
        const blocks = contentEl.querySelectorAll(':scope > ' + BLOCK_SELECTOR);
        return Array.from(blocks).map(el => el.textContent.trim());
    }

    function highlightChanges(previousBlockSignatures) {
        const newBlocks = contentEl.querySelectorAll(':scope > ' + BLOCK_SELECTOR);
        const newSigs = Array.from(newBlocks).map(el => el.textContent.trim());

        // Build a set of old signatures for quick lookup
        const oldSet = new Set(previousBlockSignatures);

        newBlocks.forEach((el, i) => {
            if (!oldSet.has(newSigs[i])) {
                el.classList.add('diff-added');
            }
        });

        return newSigs;
    }

    // Core functions

    function renderMarkdown(content, isReload) {
        const rawHtml = marked.parse(content);
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        contentEl.innerHTML = cleanHtml;

        let newBlockSignatures;
        if (isReload && currentFilePath && tabs.has(currentFilePath)) {
            const tab = tabs.get(currentFilePath);
            newBlockSignatures = highlightChanges(tab.previousBlockSignatures);
        } else {
            newBlockSignatures = getBlockSignatures();
        }

        // Update the current tab's block signatures
        if (currentFilePath && tabs.has(currentFilePath)) {
            tabs.get(currentFilePath).previousBlockSignatures = newBlockSignatures;
        }

        // Show content, hide empty state
        contentEl.style.display = 'block';
        emptyState.style.display = 'none';
    }

    function createTabElement(path) {
        const filename = path.split(/[\\/]/).pop();
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.path = path;
        tab.title = path;

        const title = document.createElement('span');
        title.className = 'tab-title';
        title.textContent = filename;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.textContent = '×';
        closeBtn.title = 'Close';

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(path);
        });

        tab.addEventListener('click', () => {
            switchToTab(path);
        });

        tab.appendChild(title);
        tab.appendChild(closeBtn);

        return tab;
    }

    function updateTabBar() {
        if (tabs.size === 0) {
            toolbar.style.display = 'none';
            emptyState.style.display = 'flex';
            contentEl.style.display = 'none';
        } else {
            toolbar.style.display = 'flex';
            emptyState.style.display = 'none';

            // Update active tab styling
            const allTabs = tabsContainer.querySelectorAll('.tab');
            allTabs.forEach(tab => {
                if (tab.dataset.path === currentFilePath) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }
    }

    async function switchToTab(path) {
        if (!tabs.has(path)) return;

        // Save current tab's scroll position
        if (currentFilePath && tabs.has(currentFilePath)) {
            tabs.get(currentFilePath).scrollPosition = window.scrollY;
        }

        currentFilePath = path;
        const tab = tabs.get(path);

        // Render the content
        renderMarkdown(tab.content, false);

        // Restore scroll position
        window.scrollTo(0, tab.scrollPosition);

        // Update tab bar immediately so it's always visible
        updateTabBar();

        // Update window title
        const filename = path.split(/[\\/]/).pop();
        await getCurrentWindow().setTitle(filename + ' - Clive');
    }

    async function closeTab(path) {
        if (!tabs.has(path)) return;

        tabs.delete(path);

        // Stop watching the file
        try { await invoke('unwatch_file', { path }); } catch (_) {}

        // Remove the tab element
        const tabElement = tabsContainer.querySelector(`[data-path="${CSS.escape(path)}"]`);
        if (tabElement) {
            tabElement.remove();
        }

        // If we closed the active tab, switch to another
        if (currentFilePath === path) {
            if (tabs.size > 0) {
                const firstPath = tabs.keys().next().value;
                switchToTab(firstPath);
            } else {
                currentFilePath = null;
                updateTabBar();
            }
        } else {
            updateTabBar();
        }
    }

    async function loadFile(path) {
        try {
            // If tab already exists, just switch to it
            if (tabs.has(path)) {
                await switchToTab(path);
                return;
            }

            const content = await invoke('read_file', { path });

            // Create new tab
            tabs.set(path, {
                content: content,
                scrollPosition: 0,
                previousBlockSignatures: []
            });

            // Add tab element to the bar
            const tabElement = createTabElement(path);
            tabsContainer.appendChild(tabElement);

            // Start watching this file for changes
            await invoke('watch_file', { path });

            // Switch to the new tab
            await switchToTab(path);

        } catch (err) {
            console.error('Failed to load file:', err);
        }
    }

    async function openFile() {
        try {
            const paths = await invoke('open_file_dialog');
            for (const path of paths) {
                await loadFile(path);
            }
        } catch (err) {
            console.error('Failed to open file dialog:', err);
        }
    }

    // Event listeners

    // Open button clicks
    openBtn.addEventListener('click', openFile);
    openBtnToolbar.addEventListener('click', openFile);

    // File changed (from Rust watcher)
    listen('file-changed', async (event) => {
        const changedPath = event.payload;

        // Only re-render if the changed file is the active tab
        if (changedPath === currentFilePath && tabs.has(changedPath)) {
            try {
                const content = await invoke('read_file', { path: changedPath });

                // Update the stored content
                tabs.get(changedPath).content = content;

                // Re-render
                renderMarkdown(content, true);
            } catch (err) {
                console.error('Failed to reload file:', err);
            }
        } else if (tabs.has(changedPath)) {
            // File is open but not active - update stored content only
            try {
                const content = await invoke('read_file', { path: changedPath });
                tabs.get(changedPath).content = content;
            } catch (err) {
                console.error('Failed to reload file content:', err);
            }
        }
    });

    // Drag and drop - open ALL dropped .md files as tabs
    getCurrentWebview().onDragDropEvent(async (event) => {
        if (event.payload.type === 'drop') {
            const mdFiles = event.payload.paths.filter(p =>
                p.toLowerCase().endsWith('.md') || p.toLowerCase().endsWith('.markdown')
            );
            for (const file of mdFiles) {
                await loadFile(file);
            }
        }
    });
});
