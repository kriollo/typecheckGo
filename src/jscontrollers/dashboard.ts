import { $dom } from '@/jscontrollers/composables/dom-selector';
import { hideLoader, showLoader } from '@/jscontrollers/ui/loader';
import { initTooltips } from '@/jscontrollers/ui/tooltips';

let messageAlert = false;
// enviar cada 5 min al servidor
const keepAlive = setInterval(async () => {
    try {
        const response = await fetch('/api/keepalive', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_user: owner_user.id_user,
                campus: campusSessions,
            }),
        });

        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        const contentType = response.headers.get('Content-Type');
        const isJson = contentType?.includes('application/json');
        const data = isJson ? await response.json() : await response.text();

        if (data.success === 0) {
            messageAlert = true;
            await Swal.fire({
                title: 'Error',
                text: data.message,
                icon: 'error',
                confirmButtonText: 'Aceptar',
                timer: 5000,
                timerProgressBar: true,
            });
            window.location.href = '/logout';
        }
    } catch (error) {
        const result = Swal.fire({
            title: 'Error',
            text:
                'No se pudo enviar la solicitud al servidor, el sistema se cerrará, por favor vuelva a iniciar sesión /n' +
                error.message,
            icon: 'error',
            confirmButtonText: 'Aceptar',
        });
        if (result.isConfirmed) {
            window.location.href = '/logout';
        }
    }
    if (messageAlert) {
        clearInterval(keepAlive);
    }
}, 300000);

// Inicializaciones UI al cargar
// show loader early
try {
    showLoader();
} catch {
    /* noop */
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initTooltips();
    } catch (e) {
        console.warn('initTooltips init failed', e);
    }
    try {
        hideLoader();
    } catch {
        /* noop */
    }

    // Performance optimizations
    try {
        // Lazy load images
        const lazyImages = document.querySelectorAll('img[data-src]');
        if (lazyImages.length > 0 && 'IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target as HTMLImageElement;
                            const src = img.dataset.src;
                            if (src) {
                                img.src = src;
                                img.removeAttribute('data-src');
                                img.classList.add('loaded');
                                imageObserver.unobserve(img);
                            }
                        }
                    });
                },
                { rootMargin: '50px 0px' }
            );

            lazyImages.forEach(img => imageObserver.observe(img));
        }

        // Observe elementos para animaciones
        if ('IntersectionObserver' in window) {
            const animationObserver = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-visible');
                        }
                    });
                },
                { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
            );

            const animatedElements = document.querySelectorAll('.fade-in-up, .fade-in-down, .scale-in');
            animatedElements.forEach(el => animationObserver.observe(el));
        }
    } catch (e) {
        console.warn('Performance optimizations failed', e);
    }
});
