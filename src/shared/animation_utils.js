export const swapTextWithSlide = (element, nextText) => {
    if (!element) {
        return;
    }

    const normalizedText = String(nextText);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof element.animate !== 'function') {
        element.textContent = normalizedText;
        return;
    }

    if (element.textContent === normalizedText && !element.dataset.swapAnimating) {
        return;
    }

    const animationToken = `${Date.now()}-${Math.random()}`;
    element.dataset.swapAnimating = animationToken;

    const finishSwap = () => {
        if (element.dataset.swapAnimating !== animationToken) {
            return;
        }

        element.textContent = normalizedText;

        const enterAnimation = element.animate(
            [
                { transform: 'translateY(0.45em)', opacity: 0 },
                { transform: 'translateY(0)', opacity: 1 }
            ],
            {
                duration: 180,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'both'
            }
        );

        enterAnimation.onfinish = () => {
            if (element.dataset.swapAnimating !== animationToken) {
                return;
            }

            delete element.dataset.swapAnimating;
            element.style.transform = '';
            element.style.opacity = '';
        };
    };

    const exitAnimation = element.animate(
        [
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(-0.45em)', opacity: 0 }
        ],
        {
            duration: 120,
            easing: 'ease-out',
            fill: 'both'
        }
    );

    exitAnimation.onfinish = finishSwap;
};
