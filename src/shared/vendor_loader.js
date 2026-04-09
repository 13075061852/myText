const scriptPromises = new Map();
let lucideRefreshQueued = false;

const loadScript = (src) => {
    if (!scriptPromises.has(src)) {
        scriptPromises.set(src, new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`);

            if (existingScript) {
                if (existingScript.dataset.loaded === 'true') {
                    resolve();
                    return;
                }

                existingScript.addEventListener('load', () => resolve(), { once: true });
                existingScript.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
                resolve();
            }, { once: true });
            script.addEventListener('error', () => {
                scriptPromises.delete(src);
                reject(new Error(`Failed to load script: ${src}`));
            }, { once: true });
            document.head.appendChild(script);
        }));
    }

    return scriptPromises.get(src);
};

export const ensureLucide = async () => {
    if (window.lucide?.createIcons) {
        return window.lucide;
    }

    await loadScript('https://unpkg.com/lucide@latest');
    return window.lucide;
};

export const refreshIcons = () => {
    if (lucideRefreshQueued) {
        return;
    }

    lucideRefreshQueued = true;
    window.requestAnimationFrame(async () => {
        lucideRefreshQueued = false;
        const lucide = await ensureLucide();
        lucide.createIcons();
    });
};

export const ensureXlsx = async () => {
    if (window.XLSX?.read) {
        return window.XLSX;
    }

    await loadScript('https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js');
    return window.XLSX;
};
