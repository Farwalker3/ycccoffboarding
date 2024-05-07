import mailchannelsPlugin from "@cloudflare/pages-plugin-mailchannels";

export const onRequest = mailchannelsPlugin({
  personalizations: [
    {
      to: [{ name: "John C. Barr", email: "Farwalker3@icloud.com" }],
    },
  ],
  from: { name: "YCCC Offboarding", email: "Farwalker3@icloud.com" },
  respondWith: () =>
    new Response(null, {
      status: 302,
      headers: { Location: "/thank-you" },
    }),
});