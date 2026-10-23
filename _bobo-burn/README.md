# Bobo Burn

The page is published through this repository's existing GitHub Pages deployment at `/boboburn.html`. The homepage `$BOBO` dropdown links to it. `_bobo-burn` contains authoring files and is excluded from the Jekyll site by its leading underscore.

Run `npm install` and `npm run build` from this directory to regenerate `boboburn.html`, `assets/bobo-burn/app.js`, and `assets/bobo-burn/style.css`. The optional `BOBO_BUILD_MODULES` variable can reuse an existing directory of compatible Node dependencies. Commit the regenerated files with source changes.

The read-only public endpoint is recorded in `deployment.json`. Its Cloudflare Worker bundle is `.build/worker.js`; upload it as the `worker.js` module with the accompanying metadata. Enable its workers.dev address. Apply `schema.sql` once to the listed D1 database. There are no private keys or RPC secrets in this application.

The data service checks both the token account's mint and its owner, indexes finalized transactions, deduplicates signatures, and uses integer arithmetic at six-decimal precision. A snapshot is only marked live after all net transaction changes reconcile to the account balance. D1 retains verified history and bounded catch-up progress. Public RPC outages or missing history retain a clearly dated snapshot. The client refreshes every minute while visible; no scheduled process is required to reconstruct history when reopened.

Daily totals use UTC and measure positive net token-account changes, not SPL burn instructions. Outflows are preserved in history and CSV exports. The 20% GRR allocation is project-provided context, not independently verified by this tracker. The separate private ChatGPT Site is a preview, not a dependency of this public page.
