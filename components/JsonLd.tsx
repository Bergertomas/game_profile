/**
 * Renders a JSON-LD graph into the document.
 *
 * The payload is built by lib/seo/structured-data.ts from typed profile data,
 * never from user input, and `<` is escaped so a game title or summary can
 * never close the script element.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
