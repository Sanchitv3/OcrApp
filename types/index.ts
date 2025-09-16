import { CameraView } from 'expo-camera';

export interface ScanResult {
  id: string;
  timestamp: string;
  numbers: string[];
  croppedImageUri?: string;
  originalImageUri?: string;
}

export interface ScanData {
  numbers: string[];
  croppedImageUri?: string;
  originalImageUri?: string;
}

export interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export interface CameraOverlayProps {
  width: number;
  height: number;
}

export interface OCRResult {
  blocks?: Array<{
    text: string;
    lines?: Array<{
      text: string;
    }>;
  }>;
  text?: string;
}

export type CameraRef = React.ComponentRef<typeof CameraView>;