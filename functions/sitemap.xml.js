export async function onRequest() {
  const response = await fetch(
    "https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/sitemap"
  );

  const body = await response.text();

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
    status: response.ok ? 200 : response.status,
  });
}
