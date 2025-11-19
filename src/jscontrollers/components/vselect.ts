import { html } from 'P@/vendor/plugins/code-tag/code-tag-esm';

const { defineComponent } = Vue;

type Opt = { id: any; text: string };

export default defineComponent({
    name: 'vselect',
    props: {
        options: { type: Array, default: () => [] },
        value: { required: false },
        multiple: { type: Boolean, default: false },
        placeholder: { type: String, default: 'Select' },
        searchable: { type: Boolean, default: true },
        searchPlaceholder: { type: String, default: 'Search' },
    },
    data() {
        return {
            open: false,
            query: '',
            focusedIndex: -1,
            _moved: false,
            _origParent: null,
            _origNext: null,
            _backdrop: null,
            _dropdownRef: null,
            _docClickBound: null,
            _resizeBound: null,
        };
    },
    computed: {
        filteredOptions(): Opt[] {
            const q = (this as any).query?.toString().toLowerCase() || '';
            if (!q) return (this as any).options || [];
            return ((this as any).options || []).filter((o: Opt) =>
                (o.text || '').toString().toLowerCase().includes(q)
            );
        },
        selectedSet(): any {
            const val = (this as any).value;
            if ((this as any).multiple) return new Set(Array.isArray(val) ? val : []);
            return val;
        },
    },
    methods: {
        toggle() {
            (this as any).open = !(this as any).open;
            if ((this as any).open) this.onOpened();
            else this.onClosed();
        },
        close() {
            (this as any).open = false;
            (this as any).query = '';
            (this as any).focusedIndex = -1;
            this.onClosed();
        },
        isSelected(id: any) {
            if ((this as any).multiple) return (this as any).selectedSet.has(id);
            return (this as any).value === id;
        },
        selectOption(opt: Opt) {
            if ((this as any).multiple) {
                const current = Array.isArray((this as any).value) ? [...(this as any).value] : [];
                const idx = current.findIndex(v => v === opt.id);
                if (idx >= 0) current.splice(idx, 1);
                else current.push(opt.id);
                (this as any).$emit('input', current);
            } else {
                (this as any).$emit('input', opt.id);
                (this as any).close();
            }
        },
        removeTag(id: any) {
            if (!(this as any).multiple) return;
            const current = Array.isArray((this as any).value) ? [...(this as any).value] : [];
            const idx = current.findIndex(v => v === id);
            if (idx >= 0) {
                current.splice(idx, 1);
                (this as any).$emit('input', current);
            }
        },
        onKeyDown(e: KeyboardEvent) {
            const list = (this as any).filteredOptions || [];
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                (this as any).focusedIndex = Math.min((this as any).focusedIndex + 1, list.length - 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                (this as any).focusedIndex = Math.max((this as any).focusedIndex - 1, 0);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if ((this as any).focusedIndex >= 0 && list[(this as any).focusedIndex])
                    (this as any).selectOption(list[(this as any).focusedIndex]);
            } else if (e.key === 'Escape') {
                (this as any).close();
            }
        },
        onOpened() {
            // move dropdown to body and add backdrop
            this.$nextTick(() => {
                try {
                    const control = (this as any).$el.querySelector('.vsp-control');
                    const dropdown = (this as any).$el.querySelector('.vsp-dropdown');
                    if (!dropdown || this._moved) return;

                    // create backdrop — prefer CSS classes over inline styles so theme variables apply
                    const backdrop = document.createElement('div');
                    backdrop.className = 'vselect-backdrop';
                    backdrop.addEventListener('click', () => this.close());
                    // add theme-aware modifier when document has data-theme="light"
                    try {
                        const theme = document.documentElement?.dataset?.theme;
                        if (theme === 'light') backdrop.classList.add('vselect-backdrop--light');
                    } catch {
                        /* ignore */
                    }
                    document.body.appendChild(backdrop);
                    this._backdrop = backdrop;

                    // remember original position and keep a reference to the dropdown
                    this._origParent = dropdown.parentNode;
                    this._origNext = dropdown.nextSibling;

                    // move dropdown to body and position fixed, match control width
                    this._dropdownRef = dropdown;
                    document.body.appendChild(this._dropdownRef);
                    const rect = control.getBoundingClientRect();
                    // set inline position/width; styling (background, border, z-index) handled by CSS
                    this._dropdownRef.style.position = 'fixed';
                    this._dropdownRef.style.left = rect.left + 'px';
                    this._dropdownRef.style.top = rect.bottom + 'px';
                    this._dropdownRef.style.width = rect.width + 'px';
                    // Add theme-aware modifier to dropdown when theme is light so CSS can adjust visuals
                    try {
                        const theme = document.documentElement?.dataset?.theme;
                        if (theme === 'light') this._dropdownRef.classList.add('vsp-dropdown--light');
                    } catch {
                        /* ignore */
                    }
                    this._moved = true;

                    // focus search input if present
                    const input = dropdown.querySelector('.vsp-search-input') as HTMLInputElement;
                    if (input) {
                        input.focus();
                    }

                    // listen outside clicks
                    // listen outside clicks using bound handlers (so we can remove them reliably)
                    this._docClickBound = (e: MouseEvent) => this._handleDocClick(e);
                    document.addEventListener('click', this._docClickBound, true);
                    this._resizeBound = () => this._handleWindowResize();
                    window.addEventListener('resize', this._resizeBound);
                } catch {
                    console.warn('vselect: onOpened error');
                }
            });
        },
        onClosed() {
            try {
                // Find dropdown using stored ref or fallback to DOM queries
                const foundDropdown =
                    this._dropdownRef ||
                    (this as any).$el.querySelector('.vsp-dropdown') ||
                    document.querySelector('.vsp-dropdown');
                if (this._moved && foundDropdown && this._origParent) {
                    try {
                        if (this._origNext) this._origParent.insertBefore(foundDropdown, this._origNext);
                        else this._origParent.appendChild(foundDropdown);
                    } catch {
                        try {
                            this._origParent.appendChild(foundDropdown);
                        } catch {
                            /* nothing */
                        }
                    }
                    // clear inline styles applied when moved
                    foundDropdown.style.position = '';
                    foundDropdown.style.left = '';
                    foundDropdown.style.top = '';
                    foundDropdown.style.width = '';
                    foundDropdown.style.zIndex = '';
                    this._moved = false;
                }

                if (this._backdrop && this._backdrop.parentNode) this._backdrop.parentNode.removeChild(this._backdrop);
                this._backdrop = null;

                // remove bound listeners if present
                if (this._docClickBound) document.removeEventListener('click', this._docClickBound, true);
                if (this._resizeBound) window.removeEventListener('resize', this._resizeBound);
                this._docClickBound = null;
                this._resizeBound = null;
                this._dropdownRef = null;
            } catch {
                /* ignore errors during open cleanup */
            }
        },
        _handleDocClick(e: MouseEvent) {
            const el = (this as any).$el as HTMLElement;
            const dropdown = document.querySelector('.vsp-dropdown');
            if (el && (el.contains(e.target as Node) || (dropdown && dropdown.contains(e.target as Node)))) return;
            this.close();
        },
        _handleWindowResize() {
            // reposition dropdown top according to control
            try {
                const control = (this as any).$el.querySelector('.vsp-control');
                const dropdown = document.querySelector('.vsp-dropdown') as HTMLElement;
                if (control && dropdown && this._moved) {
                    dropdown.style.top = control.getBoundingClientRect().bottom + 'px';
                }
            } catch {
                /* ignore resize errors */
            }
        },
    },
    template: html`
        <div class="v-select-picker">
            <div
                class="vsp-control w-full flex items-center justify-between min-h-[2.4rem] px-3 py-2 rounded-md bg-card-bg text-base cursor-pointer border focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/40"
                @click="toggle"
                :class="{ 'ring-2 ring-primary/40': open }">
                <div class="vsp-value flex items-center flex-wrap gap-2">
                    <template v-if="multiple">
                        <template v-if="Array.isArray(value) && value.length">
                            <span
                                class="vsp-tag inline-flex items-center bg-primary/10 text-primary text-sm px-2 py-1 rounded border-2"
                                v-for="val in value"
                                :key="val">
                                <span class="vsp-tag-text">{{ (options.find(o => o.id === val) || {}).text }}</span>
                                <button type="button" class="vsp-tag-x ml-2 text-muted" @click.stop="removeTag(val)">
                                    &times;
                                </button>
                            </span>
                        </template>
                        <template v-else>
                            <span class="vsp-placeholder text-muted">{{ placeholder }}</span>
                        </template>
                    </template>
                    <template v-else>
                        <span v-if="value !== undefined && value !== null">
                            {{ (options.find(o => o.id === value) || {}).text }}
                        </span>
                        <span v-else class="vsp-placeholder text-muted">{{ placeholder }}</span>
                    </template>
                </div>
                <div class="vsp-caret text-muted">▾</div>
            </div>
            <div
                class="vsp-dropdown mt-2 absolute left-0 right-0 z-[32000] rounded-md shadow-lg bg-surface border border-white/5 overflow-hidden"
                v-show="open">
                <div class="vsp-search p-2 border-b border-white/5" v-if="searchable">
                    <input
                        class="vsp-search-input w-full bg-transparent text-base text-current placeholder:text-muted px-3 py-2 rounded"
                        :placeholder="searchPlaceholder"
                        v-model="query"
                        @keydown="onKeyDown" />
                </div>
                <ul class="vsp-list max-h-64 overflow-auto">
                    <li
                        class="vsp-item px-3 py-2 flex justify-between items-center hover:bg-white/5"
                        v-for="(opt, idx) in filteredOptions"
                        :key="opt.id"
                        :class="{ 'bg-white/5': idx===focusedIndex, 'font-semibold': isSelected(opt.id) }"
                        @click.stop="selectOption(opt)"
                        @mouseenter="focusedIndex=idx">
                        <span class="vsp-item-text">{{ opt.text }}</span>
                        <span class="vsp-item-check text-primary" v-if="isSelected(opt.id)">✓</span>
                    </li>
                    <li class="vsp-empty p-3 text-muted" v-if="filteredOptions.length===0">No results</li>
                </ul>
            </div>
        </div>
    `,
});
