// Client-safe S3 utilities
// This file should only contain functions that can be safely used in client components

/**
 * Get image URL for viewing (client-side safe)
 * This is a wrapper that calls the server-side API to get presigned URLs
 */
export async function getImageUrl(key: string): Promise<string> {
  try {
    const response = await fetch('/api/upload/view-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      throw new Error('Failed to get image URL');
    }

    const { viewUrl } = await response.json();
    return viewUrl;
  } catch (error) {
    console.error('Error getting image URL:', error);
    // Return a fallback or placeholder image URL
    return '/placeholder-image.jpg';
  }
}

/**
 * Client-side helper to check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}
