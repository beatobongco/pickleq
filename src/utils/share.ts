import html2canvas from 'html2canvas';

export async function captureElement(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2, // Higher quality
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob'));
      }
    }, 'image/png');
  });
}

export async function shareImage(blob: Blob, title: string): Promise<boolean> {
  const file = new File([blob], 'pickleq-stats.png', { type: 'image/png' });

  // Try native share if available (mobile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
        text: 'Check out my PickleQ stats!',
      });
      return true;
    } catch (err) {
      // User cancelled or share failed
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return false;
    }
  }

  // Fallback: download the image
  downloadImage(blob);
  return true;
}

export function downloadImage(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pickleq-stats.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function canNativeShare(): boolean {
  return typeof navigator.share === 'function';
}
