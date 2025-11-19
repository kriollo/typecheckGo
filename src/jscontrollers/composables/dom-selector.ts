/**
 * @preserve
 * Selects the first element that matches the specified selector within the given context.
 *
 * @param {string} selector - The CSS selector to match the element.
 * @param {Document|Element} [context=document] - The context within which to search for the element.
 * @returns {Element|null} - The first matching element, or null if no element is found.
 */
export const $dom = (selector: string, context: Document | Element = document): Element | null =>
    context.querySelector(selector);

/**
 * @preserve
 * Returns a list of elements that match the given selector within the specified context.
 *
 * @param {string} selector - The CSS selector to match elements against.
 * @param {Document|Element} [context=document] - The context within which to search for elements. Defaults to the document.
 * @returns { NodeList  } - A list of elements that match the given selector.
 */
export const $domAll = (selector: string, context: Document | Element = document): NodeList =>
    context.querySelectorAll(selector);

/**
 * @preserve
 * Sets the locked status of a form and disables its inputs and submit button accordingly.
 * @param {HTMLFormElement} $form - The form element to be locked.
 * @param {string} [status='true'] - The status to set for the form. Defaults to 'true'.
 */
interface BlockedFormElements extends HTMLFormElement {
    querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
    querySelector<K extends keyof SVGElementTagNameMap>(selectors: K): SVGElementTagNameMap[K] | null;
    querySelector<E extends Element = Element>(selectors: string): E | null;
    querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]>;
    querySelectorAll<K extends keyof SVGElementTagNameMap>(selectors: K): NodeListOf<SVGElementTagNameMap[K]>;
    querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
}

export const blockedForm = ($form: BlockedFormElements, status: string = 'true', lastState: any[] = []): any[] => {
    const currentState = [];

    const $submit = $form.querySelector('[type="submit"]');
    if ($submit instanceof HTMLButtonElement) {
        currentState.push({
            id: $submit.id,
            disabled: $submit.disabled,
        });
        $submit.disabled = 'true' === status;
        const findButton = lastState.find(item => item.id === $submit.id);
        if (findButton) {
            $submit.disabled = findButton.disabled;
        }
    }

    type ElementInput = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;

    const $inputs = $form.querySelectorAll('input, select, textarea, button');
    $inputs.forEach(($input: ElementInput) => {
        currentState.push({
            id: $input.id,
            disabled: $input?.disabled,
        });
        if ($input instanceof HTMLInputElement) {
            $input.disabled = 'true' === status;
        }
        if ($input instanceof HTMLSelectElement) {
            $input.disabled = 'true' === status;
        }
        if ($input instanceof HTMLTextAreaElement) {
            $input.disabled = 'true' === status;
        }
        if ($input instanceof HTMLButtonElement) {
            $input.disabled = 'true' === status;
        }

        const findInput = lastState.find(item => item.id === $input.id);
        if (findInput) {
            $input.disabled = findInput.disabled;
        }
    });
    return currentState;
};

/**
 * @preserve
 * Serializes a form into an array of objects containing the form field names and values.
 * @param {HTMLFormElement} $form - The form element to be serialized.
 * @returns {Array} - An array of objects containing the form field names and values.
 */
export const serializeToArray = ($form: HTMLFormElement) =>
    Array.from(new FormData($form), ([name, value]) => {
        const element = $form.elements[name] as HTMLInputElement;
        if (element && element.type === 'checkbox') {
            value = element.checked ? value : '';
        }
        return { name, value };
    });

/**
 * @preserve
 * Serializes a form into an object.
 *
 * @param {HTMLFormElement} $form - The form element to serialize.
 * @returns {Object} - The serialized form data as an object.
 */
export const serializeToObject = ($form: HTMLFormElement) =>
    serializeToArray($form).reduce((acc, { name, value }) => {
        acc[name] = value;
        return acc;
    }, {});

/**
 * @preserve
 * Validates a form by checking if all required fields are filled.
 * @param {HTMLFormElement} $form - The form element to validate.
 * @returns {boolean} - Whether the form is valid.
 */
export const validateFormRequired = ($form: HTMLFormElement) => {
    const requiredFields = $domAll('[required]', $form);
    let isValid = true;
    requiredFields.forEach(field => {
        field.parentElement.classList.remove('border', 'border-danger', 'border-solid', 'border-dashed');
        if (!(field instanceof HTMLInputElement)) return;
        if (!field.value.trim()) {
            field.parentElement.classList.add('border', 'border-danger', 'border-solid', 'border-dashed');
            isValid = false;
        }
    });
    return isValid;
};

export const scrollToTop = (element: string) => {
    const $element = $dom(element);
    if ($element) {
        $element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

export const changeButtonSpinner = (buttonId: string, isLoading: boolean, originalContent: string = '') => {
    const button = $dom(`#${buttonId}`);
    if (button) {
        if (isLoading) {
            if (!originalContent) {
                originalContent = button.innerHTML;
            }
            button.setAttribute('disabled', 'true');
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        } else {
            button.innerHTML = originalContent;
            button.removeAttribute('disabled');
        }
    }
};
