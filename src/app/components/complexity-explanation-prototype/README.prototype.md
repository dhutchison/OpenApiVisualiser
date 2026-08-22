# Operation complexity explanation prototype

This is a throwaway prototype for deciding how operation contract complexity should appear across tree/list, endpoint detail, and summary surfaces.

Run it with:

```sh
npm start
```

Then compare the three variants on the existing application route:

- `http://localhost:4200/?variant=A` — Band first
- `http://localhost:4200/?variant=B` — Comparison matrix
- `http://localhost:4200/?variant=C` — Explain the burden

Use the floating switcher or the left and right arrow keys to move between variants. The prototype and switcher are development-only and must not be promoted directly to production.
