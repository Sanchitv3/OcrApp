import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GOOGLE_VISION_API_KEY } from "@env";

const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

// Main OCR function using Google Vision API
export const extractNumbersFromImage = async (imageUri: string): Promise<string[]> => {
  console.log('Starting Google Vision OCR processing for:', imageUri);
  
  try {
    // Step 1: Convert image to base64
    console.log('Converting image to base64...');
    const base64Image = await convertImageToBase64(imageUri);
    
    // Step 2: Call Google Vision API
    console.log('Calling Google Vision API...');
    const visionResponse = await callGoogleVisionAPI(base64Image);
    
    // Step 3: Extract text from response
    const extractedText = extractTextFromVisionResponse(visionResponse);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text detected in the image');
    }
    
    console.log('Vision API detected text:', extractedText);
    
    // Step 4: Extract numbers from text
    const numbers = extractNumbersFromText(extractedText);
    
    if (numbers.length === 0) {
      throw new Error('No numbers found in the detected text');
    }
    
    console.log('Extracted numbers:', numbers);
    return numbers;
    
  } catch (error) {
    console.error('Google Vision OCR failed:', error);
    
    // Provide specific error handling
    if (error instanceof Error) {
      if (error.message.includes('403') || error.message.includes('API key')) {
        throw new Error('Invalid API key or Vision API not enabled. Please check your Google Cloud Console settings.');
      } else if (error.message.includes('429') || error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please check your Google Cloud Console billing and quotas.');
      } else if (error.message.includes('400')) {
        throw new Error('Invalid image format. Please try capturing the image again.');
      } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
    }
    
    throw error;
  }
};

// Convert image to base64 with proper optimization
const convertImageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    console.log('Processing image:', imageUri);
    
    // First, check if it's a local file or remote URL
    let finalImageUri = imageUri;
    
    // If it's a local file URI, we need to handle it properly
    if (imageUri.startsWith('file://')) {
      console.log('Processing local file...');
      
      // Optimize image for OCR
      const optimizedImage = await manipulateAsync(
        imageUri,
        [
          { resize: { width: 1024 } }, // Optimal size for OCR
        ],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
          base64: true, // This will give us base64 directly
        }
      );
      
      if (!optimizedImage.base64) {
        throw new Error('Failed to convert image to base64');
      }
      
      console.log('Image converted successfully, base64 length:', optimizedImage.base64.length);
      return optimizedImage.base64;
      
    } else {
      // If it's already a base64 string or URL, handle accordingly
      throw new Error('Unsupported image format');
    }
    
  } catch (error) {
    console.error('Image conversion failed:', error);
    
    // Fallback: try reading the file directly
    try {
      console.log('Trying fallback method...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Fallback successful, base64 length:', base64.length);
      return base64;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw new Error('Failed to process image for OCR');
    }
  }
};

// Call Google Vision API with proper error handling
const callGoogleVisionAPI = async (base64Image: string): Promise<any> => {
  try {
    console.log('Making Vision API request, image size:', base64Image.length);
    
    // Validate base64 length (Google Vision has limits)
    if (base64Image.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Image too large for Vision API');
    }
    
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 50,
            },
          ],
          imageContext: {
            languageHints: ['en'],
          },
        },
      ],
    };

    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Vision API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vision API error response:', errorText);
      
      // Parse specific error messages
      try {
        const errorData = JSON.parse(errorText);
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        throw new Error(`Vision API error: ${errorMessage}`);
      } catch (parseError) {
        throw new Error(`Vision API error: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('Vision API response received successfully');
    
    // Log response structure for debugging
    if (result.responses && result.responses[0]) {
      const response = result.responses[0];
      console.log('Text annotations count:', response.textAnnotations?.length || 0);
      if (response.error) {
        console.error('Vision API returned error in response:', response.error);
        throw new Error(`Vision API error: ${response.error.message}`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Vision API call failed:', error);
    throw error;
  }
};

// Extract text from Google Vision API response
const extractTextFromVisionResponse = (visionResponse: any): string | null => {
  try {
    if (!visionResponse.responses || visionResponse.responses.length === 0) {
      console.log('No responses in Vision API result');
      return null;
    }

    const response = visionResponse.responses[0];
    
    // Check for errors in the response
    if (response.error) {
      console.error('Vision API returned error:', response.error);
      throw new Error(`Vision API error: ${response.error.message}`);
    }

    // Try fullTextAnnotation first (most structured)
    if (response.fullTextAnnotation && response.fullTextAnnotation.text) {
      console.log('Using fullTextAnnotation, length:', response.fullTextAnnotation.text.length);
      return response.fullTextAnnotation.text;
    }

    // Fallback: use textAnnotations
    if (response.textAnnotations && response.textAnnotations.length > 0) {
      const mainText = response.textAnnotations[0].description;
      console.log('Using textAnnotations[0], length:', mainText?.length || 0);
      return mainText || null;
    }

    console.log('No text found in Vision API response');
    return null;
    
  } catch (error) {
    console.error('Failed to extract text from Vision response:', error);
    throw error;
  }
};

// Enhanced number extraction function
const extractNumbersFromText = (text: string): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  console.log('Extracting numbers from text (first 200 chars):', text.substring(0, 200));

  // Clean the text but preserve important characters
  const cleanText = text
    .replace(/[^\d\s.,\-+()$€£¥₹%°]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Comprehensive patterns for different number formats
  const patterns = [
    {
      name: 'Currency',
      regex: /[$€£¥₹]\s*\d{1,3}(?:[,.']\d{3})*(?:[.,]\d{1,4})?/gi,
      priority: 1
    },
    {
      name: 'Percentages', 
      regex: /\d+(?:\.\d+)?\s*%/g,
      priority: 1
    },
    {
      name: 'Temperature',
      regex: /\d+(?:\.\d+)?\s*°[CF]?/g,
      priority: 1
    },
    {
      name: 'Thousand separators (US)',
      regex: /\b\d{1,3}(?:,\d{3})+(?:\.\d{1,4})?\b/g,
      priority: 2
    },
    {
      name: 'Thousand separators (EU)',
      regex: /\b\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?\b/g,
      priority: 2
    },
    {
      name: 'Decimal numbers',
      regex: /\b\d*\.\d+\b/g,
      priority: 3
    },
    {
      name: 'Large whole numbers',
      regex: /\b\d{4,}\b/g,
      priority: 3
    },
    {
      name: 'Medium numbers',
      regex: /\b\d{2,3}\b/g,
      priority: 4
    },
    {
      name: 'Numbers in parentheses',
      regex: /\(\s*\d+(?:[.,]\d+)?\s*\)/g,
      priority: 2
    },
    {
      name: 'Signed numbers',
      regex: /[+-]\s*\d+(?:[.,]\d+)?/g,
      priority: 2
    },
  ];

  const foundNumbers = new Map<string, number>(); // number -> priority

  // Apply each pattern
  patterns.forEach(({ name, regex, priority }) => {
    try {
      const matches = cleanText.match(regex);
      if (matches && matches.length > 0) {
        console.log(`${name}: found ${matches.length} matches:`, matches.slice(0, 3));
        
        matches.forEach(match => {
          let cleaned = match.trim();
          
          // Clean up parentheses
          if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
            cleaned = cleaned.slice(1, -1).trim();
          }
          
          // Skip if no digits
          if (!/\d/.test(cleaned)) return;
          
          // For very common numbers, be more selective
          if (/^\d{1,2}$/.test(cleaned.replace(/[^\d]/g, ''))) {
            const num = parseInt(cleaned.replace(/[^\d]/g, ''));
            if (num <= 5 && priority >= 4) return; // Skip small numbers from low-priority patterns
          }
          
          // Validate it represents a real number
          const numericPart = cleaned.replace(/[^\d.,\-+]/g, '');
          if (numericPart.length > 0) {
            const testNumber = numericPart.replace(/,(\d{3})/g, '$1').replace(',', '.');
            if (!isNaN(parseFloat(testNumber)) && isFinite(parseFloat(testNumber))) {
              // If we have symbols, keep the original match
              if (/[$€£¥₹%°]/.test(match)) {
                cleaned = match.trim();
              }
              
              // Store with priority (lower number = higher priority)
              if (!foundNumbers.has(cleaned) || foundNumbers.get(cleaned)! > priority) {
                foundNumbers.set(cleaned, priority);
              }
            }
          }
        });
      }
    } catch (regexError) {
      console.warn(`Pattern ${name} failed:`, regexError);
    }
  });

  // Sort by priority and then by position in text
  const results = Array.from(foundNumbers.keys())
    .sort((a, b) => {
      const priorityA = foundNumbers.get(a)!;
      const priorityB = foundNumbers.get(b)!;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower priority number comes first
      }
      
      // Same priority, sort by position in original text
      const indexA = text.indexOf(a.replace(/[^\d.,]/g, ''));
      const indexB = text.indexOf(b.replace(/[^\d.,]/g, ''));
      return indexA - indexB;
    });

  console.log('Final extracted numbers:', results.slice(0, 20));
  return results.slice(0, 20); // Limit to 20 most relevant numbers
};

// Utility function to test API connectivity
export const testGoogleVisionAPI = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    // Create a minimal test request
    const testResponse = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: { content: '/9j/4AAQSkZJRgABAQAAAQABAAD' }, // Minimal invalid base64 for testing
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
        }]
      }),
    });

    if (testResponse.status === 400) {
      return { success: true, message: 'API key is valid and Vision API is accessible' };
    } else if (testResponse.status === 403) {
      return { success: false, message: 'API key is invalid or Vision API is not enabled' };
    } else if (testResponse.status === 429) {
      return { success: false, message: 'API quota exceeded' };
    }

    return { 
      success: testResponse.ok, 
      message: testResponse.ok ? 'API is working' : `HTTP ${testResponse.status}` 
    };
    
  } catch (error) {
    console.error('API test failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Network error' 
    };
  }
};

// Check if API key is properly configured
export const isAPIKeyConfigured = (): boolean => {
  return GOOGLE_VISION_API_KEY && 
         GOOGLE_VISION_API_KEY !== 'YOUR_API_KEY_HERE' && 
         GOOGLE_VISION_API_KEY.length > 30;
};

// Get detailed OCR results with metadata
export const getDetailedOCRResults = async (imageUri: string): Promise<{
  allText: string;
  numbers: string[];
  confidence?: number;
  wordCount: number;
  processingTime: number;
}> => {
  const startTime = Date.now();
  
  try {
    const base64Image = await convertImageToBase64(imageUri);
    const visionResponse = await callGoogleVisionAPI(base64Image);
    const allText = extractTextFromVisionResponse(visionResponse) || '';
    const numbers = allText ? extractNumbersFromText(allText) : [];
    const wordCount = allText.split(/\s+/).filter(word => word.length > 0).length;
    const processingTime = Date.now() - startTime;
    
    // Calculate confidence if available
    let confidence: number | undefined;
    const response = visionResponse.responses?.[0];
    if (response?.textAnnotations) {
      const confidenceScores = response.textAnnotations
        .filter((annotation: any) => annotation.confidence !== undefined)
        .map((annotation: any) => annotation.confidence);
      
      if (confidenceScores.length > 0) {
        confidence = confidenceScores.reduce((a: number, b: number) => a + b, 0) / confidenceScores.length;
      }
    }
    
    return {
      allText,
      numbers,
      confidence,
      wordCount,
      processingTime
    };
    
  } catch (error) {
    console.error('Detailed OCR failed:', error);
    throw error;
  }
};

// Export the main function with the expected name
export { extractNumbersFromImage as extractNumbersFromFullImage };