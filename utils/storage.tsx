import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanResult, ScanData } from '../types';

const STORAGE_KEY = 'scan_results';

export const saveScanResult = async (scanData: ScanData): Promise<ScanResult> => {
  try {
    const scanResult: ScanResult = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      numbers: scanData.numbers,
      croppedImageUri: scanData.croppedImageUri,
      originalImageUri: scanData.originalImageUri,
    };

    const existingResults = await getAllScanResults();
    const updatedResults = [scanResult, ...existingResults];
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedResults));
    
    console.log('Saved scan result:', scanResult.id, scanResult.numbers);
    return scanResult;
  } catch (error) {
    console.error('Error saving scan result:', error);
    throw new Error('Failed to save scan result');
  }
};

export const getAllScanResults = async (): Promise<ScanResult[]> => {
  try {
    const storedResults = await AsyncStorage.getItem(STORAGE_KEY);
    const results = storedResults ? JSON.parse(storedResults) : [];
    
    // Ensure all results have proper type structure
    return results.map((result: any): ScanResult => ({
      id: result.id,
      timestamp: result.timestamp,
      numbers: Array.isArray(result.numbers) ? result.numbers : [],
      croppedImageUri: result.croppedImageUri,
      originalImageUri: result.originalImageUri,
    }));
  } catch (error) {
    console.error('Error loading scan results:', error);
    return [];
  }
};

export const getScanResult = async (scanId: string): Promise<ScanResult | null> => {
  try {
    const allResults = await getAllScanResults();
    return allResults.find(result => result.id === scanId) || null;
  } catch (error) {
    console.error('Error getting scan result:', error);
    return null;
  }
};

export const deleteScanResult = async (scanId: string): Promise<boolean> => {
  try {
    const allResults = await getAllScanResults();
    const filteredResults = allResults.filter(result => result.id !== scanId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredResults));
    console.log('Deleted scan result:', scanId);
    return true;
  } catch (error) {
    console.error('Error deleting scan result:', error);
    throw new Error('Failed to delete scan result');
  }
};

export const clearAllScanResults = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('Cleared all scan results');
  } catch (error) {
    console.error('Error clearing scan results:', error);
    throw new Error('Failed to clear scan results');
  }
};
