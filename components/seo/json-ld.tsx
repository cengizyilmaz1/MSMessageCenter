export function JsonLd({ data }: { data: object }) {
  // Escape "<" so a message Title/description containing "</script>" cannot
  // break out of this <script> block and inject executable markup.
  const json = JSON.stringify(data).replace(/</g, "\\u003c")
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}

