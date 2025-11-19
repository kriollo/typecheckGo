const { ref, onMounted, onUnmounted } = Vue;

// Crear un ref compartido para el estado del dispositivo
const device = ref(null);

const detectDevice = () => {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const width = window.innerWidth;

    const deviceInferer = {
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isIOS: false,
        isAndroid: false,
        deviceType: 'desktop',
        browserName: 'Unknown',
        details: {},
        resolutionType: 'desktop',
    };

    // Detectar navegador
    deviceInferer.browserName = (() => {
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE';
        return 'Unknown';
    })();

    // Detectar sistema operativo móvil
    deviceInferer.isIOS = /iPhone|iPad|iPod/i.test(ua);
    deviceInferer.isAndroid = /Android/i.test(ua);

    // Detectar tipo de dispositivo
    if (/Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        if (width >= 768) {
            deviceInferer.isTablet = true;
            deviceInferer.deviceType = 'tablet';
            deviceInferer.resolutionType = 'tablet';
        } else {
            deviceInferer.isMobile = true;
            deviceInferer.deviceType = 'mobile';
            deviceInferer.resolutionType = 'mobile';
        }
    } else {
        deviceInferer.isDesktop = true;
        deviceInferer.deviceType = 'desktop';

        if (width >= 768) {
            deviceInferer.resolutionType = 'desktop';
        } else {
            deviceInferer.resolutionType = 'mobile';
        }
    }

    // Añadir detalles adicionales
    deviceInferer.details = {
        userAgent: ua,
        platform: platform,
        language: navigator.language,
        orientation: window.screen.orientation?.type || '',
        screenResolution: {
            width: window.screen.width,
            height: window.screen.height,
        },
        viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
    };

    // Actualizar la resolución basada en el ancho
    if (width < 768) {
        deviceInferer.resolutionType = 'mobile';
    } else if (width >= 768 && width < 1024) {
        deviceInferer.resolutionType = 'tablet';
    } else {
        deviceInferer.resolutionType = 'desktop';
    }

    return deviceInferer;
};

export const useDevice = () => {
    // Inicializar el device si aún no existe
    if (!device.value) {
        device.value = detectDevice();
    }

    // Función para manejar el resize con debounce
    let resizeTimeout;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            device.value = detectDevice();
        }, 250); // Debounce de 250ms
    };

    onMounted(() => {
        window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
    });

    return device;
};
