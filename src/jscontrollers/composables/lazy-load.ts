export default {
    inserted: (el: HTMLImageElement) => {
        function loadImage() {
            const imageElement = Array.from(el.children).find(
                el => el.nodeName === 'IMG' || el.nodeName === 'img'
            );
            if (imageElement instanceof HTMLImageElement) {
                imageElement.src = imageElement.dataset.src;
                imageElement.onload = () => {
                    imageElement.classList.add('loaded');
                };
            }
        }

        function createObserver() {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        loadImage();
                        observer.unobserve(el);
                    }
                });
            });
            observer.observe(el);
        }

        if (!window['IntersectionObserver']) {
            loadImage();
        } else {
            createObserver();
        }
    },
    update: (el: HTMLImageElement) => {
        function loadImage() {
            const imageElement = Array.from(el.children).find(
                el => el.nodeName === 'IMG' || el.nodeName === 'img'
            );
            if (imageElement instanceof HTMLImageElement) {
                imageElement.src = imageElement.dataset.src;
                imageElement.onload = () => {
                    imageElement.classList.add('loaded');
                };
            }
        }

        function createObserver() {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        loadImage();
                        observer.unobserve(el);
                    }
                });
            });
            observer.observe(el);
        }

        if (!window['IntersectionObserver']) {
            loadImage();
        } else {
            createObserver();
        }
    },
};
