export function showLoader() {
    let el = document.getElementById('page-loader');
    if (!el) {
        el = document.createElement('div');
        el.id = 'page-loader';
        // start hidden if we need to append later
        el.className = 'page-loader hidden';
        el.innerHTML = `<div class="spinner" aria-hidden="true"></div>`;

        const appendNow = () => {
            try {
                document.body.appendChild(el);
                // ensure visible after append
                el.classList.remove('hidden');
            } catch {
                // nothing: if append fails, try again on next tick
                setTimeout(() => {
                    try {
                        if (document.body) {
                            document.body.appendChild(el);
                            el.classList.remove('hidden');
                        }
                    } catch {
                        /* noop */
                    }
                }, 50);
            }
        };

        if (document.body) {
            appendNow();
        } else {
            // body not ready yet — append once DOMContentLoaded fires
            const onReady = () => {
                appendNow();
                document.removeEventListener('DOMContentLoaded', onReady);
            };
            document.addEventListener('DOMContentLoaded', onReady);
        }
    } else {
        // element exists in DOM
        el.classList.remove('hidden');
    }
}

export function hideLoader() {
    const el = document.getElementById('page-loader');
    if (el) el.classList.add('hidden');
}
