export const safeJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");
