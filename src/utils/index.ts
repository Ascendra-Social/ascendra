export function createPageUrl(pageName: string) {
  const [pathPart, queryAndHash = ''] = pageName.split(/(?=[?#])/);
  const normalizedPath = pathPart.trim().replace(/ /g, '-');
  return `/${normalizedPath}${queryAndHash}`;
}