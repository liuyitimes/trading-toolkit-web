# Design

Element Plus table columns support local sorting through `sortable` and `sort-by`. `Lof.vue` already exposes numeric `amountRaw` alongside formatted `amountText`, so the view can enable numeric sorting without changing stores or APIs.

The change removes only `FormulaInfo` components nested in desktop table-header slots. Formula information in detail workflows and the non-header alert remain unchanged.

Both desktop table variants receive identical `sortable :sort-by="'amountRaw'"` configuration to avoid tab-dependent behavior.
