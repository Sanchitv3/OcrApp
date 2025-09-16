import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CropBounds } from '../types';

export const cropImageToRectangle = async (
  imageUri: string, 
  cropBounds: CropBounds
): Promise<string> => {
  try {
    const result = await manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: cropBounds.x,
            originY: cropBounds.y,
            width: cropBounds.width,
            height: cropBounds.height,
          },
        },
        { resize: { width: 800 } }, // Optimize size for OCR
      ],
      { 
        compress: 0.8,
        format: SaveFormat.JPEG,
      }
    );
    
    return result.uri;
  } catch (error) {
    console.error('Image cropping error:', error);
    throw new Error('Failed to crop image');
  }
};
