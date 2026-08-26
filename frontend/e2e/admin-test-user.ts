// Shared between admin-setup.ts (creates + promotes this user) and admin.spec.ts
// (asserts it shows up in the admin Users tab). Kept out of admin-setup.ts itself
// so importing it doesn't re-run that file's top-level `setup(...)` test.
export const TEST_EMAIL = `e2e.admin.${Date.now()}@lingua.test`;
export const TEST_PASSWORD = 'Test1234!';
