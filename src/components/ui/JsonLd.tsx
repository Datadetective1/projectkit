/**
 * Renders developer-authored structured data. The payload is always built from
 * project definitions and static config — never from user input.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
