export interface CroppedAreaPixels {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Processes an image with the given crop area and returns a blob
 */
export async function cropImage(
	imageFile: File,
	croppedAreaPixels: CroppedAreaPixels,
	format = 'image/jpeg',
	quality = 0.9
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		const url = URL.createObjectURL(imageFile);

		image.src = url;
		image.onload = () => {
			URL.revokeObjectURL(url);
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			canvas.width = croppedAreaPixels.width;
			canvas.height = croppedAreaPixels.height;

			ctx?.drawImage(
				image,
				croppedAreaPixels.x,
				croppedAreaPixels.y,
				croppedAreaPixels.width,
				croppedAreaPixels.height,
				0,
				0,
				croppedAreaPixels.width,
				croppedAreaPixels.height
			);

			canvas.toBlob(
				(blob) => {
					if (blob) resolve(blob);
					else reject(new Error('Failed to create blob from cropped image'));
				},
				format,
				quality
			);
		};

		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image for cropping'));
		};
	});
}
