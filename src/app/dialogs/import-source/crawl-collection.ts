import { Cozy, type CozyCollection, type CozyCollectionManifestItem } from 'cozy-iiif';

export const crawlCollection = async (
  collection: CozyCollection,
  onProgress: (manifests: CozyCollectionManifestItem[]) => void,
  signal: AbortSignal
): Promise<CozyCollectionManifestItem[]> => {
  const manifests: CozyCollectionManifestItem[] = [];

  const crawl = async (col: CozyCollection) => {
    for (const item of col.items ?? []) {
      if (signal.aborted) return;

      if (item.type === 'Manifest') {
        manifests.push(item);
        onProgress(manifests);
      } else if (item.type === 'Collection') {
        const result = await Cozy.parseURL(item.id);
        if (signal.aborted) return;
        if (result.type === 'collection')
          await crawl(result.resource);
      }
    }
  }

  await crawl(collection);
  
  return manifests;
}