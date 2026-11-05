import { toPng } from 'html-to-image';

// Renders an off-screen clone of `el` (with the .capturing class, so capture-only bits show)
// and puts it on the clipboard, or downloads it if the clipboard refuses.
// Resolves to 'done' (copied), 'saved' (downloaded) or 'error'.
export async function copyElementAsImage(el, fileName, background) {
    const render = () => {
        const ghost = el.cloneNode(true);
        ghost.removeAttribute('id');
        ghost.classList.add('capturing');
        Object.assign(ghost.style, { position: 'fixed', left: '-10000px', top: '0', width: `${el.offsetWidth}px` });
        document.body.appendChild(ghost);
        return toPng(ghost, {
            pixelRatio: 2,
            backgroundColor: background,
            filter: (node) => !node.classList?.contains('no-capture'),
            style: { position: 'static', left: 'auto', top: 'auto' },
        })
            .then(url => fetch(url))
            .then(res => res.blob())
            .finally(() => ghost.remove());
    };

    try {
        // Passing the promise (not the finished blob) keeps Safari's user-gesture check happy.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': render() })]);
        return 'done';
    } catch {
        try {
            const blob = await render();
            const url = URL.createObjectURL(blob);
            Object.assign(document.createElement('a'), { href: url, download: `${fileName.replace(/[^\w\s-]/g, '').trim() || 'weapon'}.png` }).click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return 'saved';
        } catch {
            return 'error';
        }
    }
}
