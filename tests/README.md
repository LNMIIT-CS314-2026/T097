# Running tests

Run `npm test` for Assignment 8 and supplementary backend integration checks. Each case starts from a reset test fixture inside a disposable SQLite database. The HTTP server uses a free loopback port.

Run `npx playwright install chromium` once, then `npm run test:browser` for the six-role browser workflow. Firefox and WebKit use the same script after installing those Playwright browsers and setting `STRATEGY_BROWSER` to `firefox` or `webkit`. For locally installed Chrome or Edge use `STRATEGY_CHANNEL=chrome` or `STRATEGY_CHANNEL=msedge` with the Chromium engine.

See the [test plan](../docs/testing/test-plan/README.md) and [recorded results](../docs/testing/test-results/README.md).
