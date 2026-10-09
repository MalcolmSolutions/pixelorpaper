// Launch day: puts this branch live in one go.
//
//   1. Checks: on newupdat26, clean and pushed; tests, lint, admin guards.
//   2. Wipes test data from the remote D1 database: orders, downloads,
//      Stripe events, customer accounts, sign-in links and sessions.
//      The catalogue (categories, products, prices) and admin accounts stay.
//   3. Makes main this branch. The two share no history, so main's history
//      is joined with a merge that keeps only this branch's files; main then
//      fast-forwards, with no force push.
//   4. Deploys to the live Worker (`npm run deploy`).
//
// Afterwards set the live Stripe secrets (printed at the end).
//
// Usage: npm run launch             (asks you to type LAUNCH first)
//        npm run launch -- --dry-run  (checks and counts only, changes nothing)
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const BRANCH = "newupdat26";
const DATABASE = "pixelorpaper-orders";
const dryRun = process.argv.includes("--dry-run");

// Children first, so foreign keys never block a delete.
const WIPE = [
  "DELETE FROM download_events",
  "DELETE FROM order_items",
  "DELETE FROM orders",
  "DELETE FROM stripe_events",
  "DELETE FROM sign_in_tokens",
  "DELETE FROM sessions",
  "DELETE FROM customers WHERE role <> 'admin'",
  "DELETE FROM sqlite_sequence WHERE name IN ('order_items', 'download_events')",
];
const COUNTS = `SELECT
  (SELECT count(*) FROM orders) AS orders,
  (SELECT count(*) FROM download_events) AS downloads,
  (SELECT count(*) FROM stripe_events) AS stripe_events,
  (SELECT count(*) FROM customers WHERE role <> 'admin') AS customers,
  (SELECT count(*) FROM customers WHERE role = 'admin') AS admins_kept,
  (SELECT count(*) FROM products) AS products_kept`;

function run(command, { capture = false } = {}) {
  if (!capture) console.log(`\n> ${command}`);
  const result = spawnSync(command, {
    shell: true,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stderr ?? "");
    fail(`Command failed: ${command}`);
  }
  return capture ? result.stdout.trim() : "";
}

function fail(message) {
  console.error(`\n✗ ${message}\nNothing after this step was done.`);
  process.exit(1);
}

const d1 = (sql) =>
  JSON.parse(
    run(
      `npx wrangler d1 execute ${DATABASE} --remote --json --command "${sql.replace(/\s+/g, " ")}"`,
      { capture: true },
    ),
  )[0].results;

// 1. Checks
console.log(dryRun ? "Dry run: nothing will be changed.\n" : "");
if (run("git branch --show-current", { capture: true }) !== BRANCH) {
  fail(`Switch to ${BRANCH} first.`);
}
if (run("git status --porcelain", { capture: true })) {
  fail("Commit or stash your changes first.");
}
run("git fetch origin", { capture: true });
if (
  run("git rev-parse HEAD", { capture: true }) !==
  run(`git rev-parse origin/${BRANCH}`, { capture: true })
) {
  fail(`${BRANCH} differs from origin/${BRANCH}. Push or pull first.`);
}
run("npm test");
run("npm run lint");
run("npm run check:admin");

const [counts] = d1(COUNTS);
console.log("\nRemote database now:", counts);
if (counts.admins_kept === 0) {
  console.warn(
    "⚠ No admin account exists, so nobody will have admin access after the wipe.",
  );
}

if (dryRun) {
  console.log("\nDry run finished. Run `npm run launch` to go live.");
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  `\nThis deletes the data above (except admins and the catalogue), makes main ${BRANCH} and deploys the live site.\nType LAUNCH to continue: `,
);
rl.close();
if (answer.trim() !== "LAUNCH") fail("Cancelled.");

// 2. Wipe test data
d1(WIPE.join("; "));
console.log("\n✓ Test data wiped:", d1(COUNTS)[0]);

// 3. Make main this branch
run(
  `git merge -s ours --allow-unrelated-histories origin/main -m "Replace the previous site with the new store"`,
);
run(`git push origin ${BRANCH} ${BRANCH}:main`);
console.log("\n✓ main now matches", BRANCH);

// 4. Deploy
run("npm run deploy");

console.log(`
✓ The new site is live.

Now, in PowerShell (not through Claude's ! prefix), set the live Stripe keys:
  npx wrangler secret put STRIPE_SECRET_KEY       (live sk_live_… or rk_live_… key)
  npx wrangler secret put STRIPE_WEBHOOK_SECRET   (whsec_… from the live webhook)

Then place a small real order and refund it from the Stripe dashboard.`);
