-- Admin role on customer accounts. Admins sign in with the normal email link.
--
-- Grant admin (the person must have signed in once so the account exists):
--   npx wrangler d1 execute pixelorpaper-orders --remote \
--     --command "UPDATE customers SET role = 'admin' WHERE email = '<their email>'"
ALTER TABLE customers ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'admin'));
