import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CropBounds } from '../types';

// Main cropping function with optimized OCR processing
export const cropImageToRectangle = async (
  imageUri: string, 
  cropBounds: CropBounds
): Promise<string> => {
  try {
    console.log('Cropping image with bounds:', cropBounds);
    console.log('Original image URI:', imageUri);
    
    // Validate crop bounds
    if (cropBounds.width <= 0 || cropBounds.height <= 0) {
      throw new Error('Invalid crop bounds');
    }
    
    // Calculate crop area and determine strategy
    const cropArea = cropBounds.width * cropBounds.height;
    const isSmallCrop = cropArea < 40000; // Less than ~200x200 pixels
    
    console.log('Crop area (pixels):', cropArea, 'Is small crop:', isSmallCrop);
    
    // Prepare manipulations array
    const manipulations: any[] = [
      {
        crop: {
          originX: Math.max(0, Math.round(cropBounds.x)),
          originY: Math.max(0, Math.round(cropBounds.y)),
          width: Math.round(cropBounds.width),
          height: Math.round(cropBounds.height),
        },
      }
    ];
    
    // Determine optimal settings based on crop size
    let targetWidth: number;
    let format: SaveFormat;
    let compress: number;
    
    if (isSmallCrop) {
      // For small crops (text areas), upscale significantly
      targetWidth = Math.max(800, cropBounds.width * 2.5);
      format = SaveFormat.PNG; // PNG preserves text quality better
      compress = 1.0; // No compression for small text areas
      console.log('Using small crop strategy - upscaling to', targetWidth);
    } else {
      // For larger crops, moderate processing
      targetWidth = Math.max(600, Math.min(1200, cropBounds.width * 1.2));
      format = SaveFormat.JPEG; // JPEG is fine for larger areas
      compress = 0.85; // Light compression
      console.log('Using large crop strategy - scaling to', targetWidth);
    }
    
    // Add resize if the target width is significantly different
    if (Math.abs(targetWidth - cropBounds.width) > 50) {
      manipulations.push({ 
        resize: { width: targetWidth }
      });
    }
    
    console.log('Final manipulations:', manipulations);
    console.log('Format:', format, 'Compress:', compress);
    
    // Perform the image manipulation
    const result = await manipulateAsync(
      imageUri,
      manipulations,
      { 
        compress,
        format,
      }
    );
    
    console.log('Crop result:', {
      uri: result.uri,
      width: result.width,
      height: result.height,
      originalCropWidth: cropBounds.width,
      originalCropHeight: cropBounds.height,
      scaleFactor: result.width / cropBounds.width
    });
    
    return result.uri;
    
  } catch (error) {
    console.error('Image cropping error:', error);
    throw new Error(`Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced image processing specifically for OCR
export const enhanceImageForOCR = async (
  imageUri: string,
  targetSize: { width?: number; height?: number } = {}
): Promise<string> => {
  try {
    console.log('Enhancing image for OCR:', imageUri);
    
    const manipulations: any[] = [];
    
    // Add resize if specified
    if (targetSize.width || targetSize.height) {
      manipulations.push({
        resize: targetSize
      });
    }
    
    // Process with optimal settings for text recognition
    const result = await manipulateAsync(
      imageUri,
      manipulations,
      {
        compress: 1.0, // No compression for maximum quality
        format: SaveFormat.PNG, // PNG for sharp text
      }
    );
    
    console.log('Enhanced image:', {
      uri: result.uri,
      dimensions: `${result.width}x${result.height}`
    });
    
    return result.uri;
    
  } catch (error) {
    console.error('Image enhancement failed:', error);
    throw new Error(`Failed to enhance image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Create multiple variants of cropped image for testing different OCR approaches
export const createOCRVariants = async (
  imageUri: string, 
  cropBounds: CropBounds
): Promise<{
  variants: string[];
  recommended: string;
}> => {
  const variants: string[] = [];
  let recommended = '';
  
  // Different processing strategies
  const strategies = [
    {
      name: 'High-Quality PNG',
      resize: { width: Math.max(1000, cropBounds.width * 2) },
      format: SaveFormat.PNG as SaveFormat,
      compress: 1.0
    },
    {
      name: 'Medium JPEG',
      resize: { width: Math.max(800, cropBounds.width * 1.5) },
      format: SaveFormat.JPEG as SaveFormat,
      compress: 0.9
    },
    {
      name: 'Super-Res PNG',
      resize: { width: Math.max(1500, cropBounds.width * 3) },
      format: SaveFormat.PNG as SaveFormat,
      compress: 1.0
    }
  ];
  
  for (const [index, strategy] of strategies.entries()) {
    try {
      console.log(`Creating ${strategy.name} variant...`);
      
      const result = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.max(0, Math.round(cropBounds.x)),
              originY: Math.max(0, Math.round(cropBounds.y)),
              width: Math.round(cropBounds.width),
              height: Math.round(cropBounds.height),
            },
          },
          { resize: strategy.resize }
        ],
        { 
          compress: strategy.compress,
          format: strategy.format,
        }
      );
      
      console.log(`${strategy.name} created:`, {
        width: result.width,
        height: result.height
      });
      
      variants.push(result.uri);
      
      // Use the first successful high-quality variant as recommended
      if (!recommended && (strategy.format === SaveFormat.PNG || strategy.compress >= 0.9)) {
        recommended = result.uri;
      }
      
    } catch (error) {
      console.warn(`${strategy.name} failed:`, error);
    }
  }
  
  // Fallback: use the first variant as recommended
  if (!recommended && variants.length > 0) {
    recommended = variants[0];
  }
  
  return { variants, recommended };
};

// Optimize image size and quality for Google Vision API
export const optimizeForVisionAPI = async (
  imageUri: string,
  maxSizeKB: number = 4000 // Google Vision API has size limits
): Promise<string> => {
  try {
    console.log('Optimizing image for Vision API, max size:', maxSizeKB, 'KB');
    
    // Start with high quality
    let compress = 0.8;
    let maxWidth = 1600;
    
    // Function to estimate file size (rough approximation)
    const estimateSize = (width: number, height: number, quality: number): number => {
      return (width * height * 3 * quality) / 1024; // Rough KB estimate
    };
    
    let result = await manipulateAsync(
      imageUri,
      [
        { resize: { width: maxWidth } }
      ],
      {
        compress,
        format: SaveFormat.JPEG,
      }
    );
    
    // If we need to reduce size further (this is a rough check)
    const estimatedSize = estimateSize(result.width, result.height, compress);
    
    if (estimatedSize > maxSizeKB) {
      console.log('Estimated size too large, reducing quality...');
      
      // Reduce quality
      compress = 0.6;
      maxWidth = 1200;
      
      result = await manipulateAsync(
        imageUri,
        [
          { resize: { width: maxWidth } }
        ],
        {
          compress,
          format: SaveFormat.JPEG,
        }
      );
    }
    
    console.log('Optimized for Vision API:', {
      uri: result.uri,
      dimensions: `${result.width}x${result.height}`,
      compress,
      estimatedSizeKB: estimateSize(result.width, result.height, compress)
    });
    
    return result.uri;
    
  } catch (error) {
    console.error('Vision API optimization failed:', error);
    throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Validate image before processing
export const validateImageForOCR = async (imageUri: string): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Basic URI validation
    if (!imageUri || typeof imageUri !== 'string') {
      issues.push('Invalid image URI');
      return { isValid: false, issues, recommendations };
    }
    
    if (!imageUri.startsWith('file://') && !imageUri.startsWith('http')) {
      issues.push('Unsupported URI format');
      recommendations.push('Use file:// or http:// URI');
    }
    
    // Try to get image info (this will fail if image doesn't exist)
    try {
      const info = await manipulateAsync(imageUri, [], { compress: 1, format: SaveFormat.JPEG });
      
      // Check dimensions
      if (info.width < 100 || info.height < 100) {
        issues.push('Image too small for reliable OCR');
        recommendations.push('Use higher resolution image (min 100x100)');
      }
      
      if (info.width > 4000 || info.height > 4000) {
        recommendations.push('Consider resizing large images for faster processing');
      }
      
      // Check aspect ratio
      const aspectRatio = info.width / info.height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        recommendations.push('Extreme aspect ratios may affect OCR accuracy');
      }
      
    } catch (manipulateError) {
      issues.push('Cannot access or process image file');
      recommendations.push('Check if image file exists and is valid');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
    
  } catch (error) {
    return {
      isValid: false,
      issues: ['Validation failed'],
      recommendations: ['Check image file and try again']
    };
  }
};