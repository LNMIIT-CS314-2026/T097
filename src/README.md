# Client source

`App.jsx` handles sign-in, session expiry, role-based navigation and data refresh. `api.js` calls the same-origin Express API. Shared inputs, dialogs and tables live in `components/`. Workflow-specific views live in `pages/`. The API and persistence implementation are in [server](../server/).
