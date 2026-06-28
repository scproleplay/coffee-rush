/* CodeCup Arcade — auth config.
 *
 * The dev list controls which signed-in users see early/unreleased
 * games on the arcade homepage (e.g. Coffee Escape is gated as
 * "Coming soon" for everyone except dev accounts).
 *
 * Emails are matched case-insensitively. To add a new dev account,
 * add their email to this list (no quotes around the value needed,
 * just the string).
 *
 * The anon / publishable Supabase key (in supabase-config.js) is the
 * only key we use. No service_role key is ever sent to the browser.
 */
(function () {
  "use strict";
  window.AUTH_DEV_EMAILS = [
    "bhspider30@gmail.com",
  ];
})();
