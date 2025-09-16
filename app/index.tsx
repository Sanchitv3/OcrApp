import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { cropImageToRectangle } from "@/utils/imageProcessing";
import { extractNumbersFromImage } from "@/utils/ocrProcessor";
import { saveScanResult } from "@/utils/storage";
import CameraOverlay from "@/components/custom/CameraOverlay";
import ErrorBoundary from "@/components/custom/ErrorBoundry";
import type { CameraRef } from "@/types";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const cameraRef = useRef<CameraRef>(null);

  // Camera overlay dimensions (16:9 aspect ratio)
  const overlayWidth = screenWidth * 0.8;
  const overlayHeight = overlayWidth * (9 / 16);

  useFocusEffect(
    React.useCallback(() => {
      initializeCamera();
    }, [])
  );

  const initializeCamera = async (): Promise<void> => {
    try {
      if (!permission) {
        await requestPermission();
        return;
      }

      if (!permission.granted) {
        Alert.alert(
          "Camera Access Required",
          "This app needs camera access to scan numbers. Please enable camera permissions in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error("Camera initialization error:", error);
    }
  };

  const handleCameraReady = (): void => {
    setCameraReady(true);
  };

  const captureAndProcess = async (): Promise<void> => {
    if (!cameraRef.current || !cameraReady || isProcessing) return;

    setIsProcessing(true);

    try {
      // Capture photo using new Camera API
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      // Calculate crop bounds based on overlay position
      const cropBounds = {
        x: (screenWidth - overlayWidth) / 2,
        y: (screenHeight - overlayHeight) / 2,
        width: overlayWidth,
        height: overlayHeight,
      };

      // Crop image to rectangle bounds
      const croppedImageUri = await cropImageToRectangle(photo.uri, cropBounds);

      // Extract numbers using OCR
      const extractedNumbers = await extractNumbersFromImage(croppedImageUri);

      if (extractedNumbers.length === 0) {
        Alert.alert(
          "No Numbers Found",
          "Could not detect any numbers in the captured area. Please try again with better lighting or positioning."
        );
        return;
      }

      // Save scan result
      const scanResult = await saveScanResult({
        numbers: extractedNumbers,
        croppedImageUri,
        originalImageUri: photo.uri,
      });

      // Navigate to detail screen using expo-router
      router.push(`/detail/${scanResult.id}`);
    } catch (error) {
      console.error("Capture and process error:", error);
      Alert.alert(
        "Processing Error",
        "Failed to process the image. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCameraType = (): void => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  const openHistory = (): void => {
    router.push("/history");
  };

  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-white mt-4">
          Requesting camera permissions...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-900 px-6">
        <MaterialIcons name="camera-alt" size={80} color="#6b7280" />
        <Text className="text-white text-xl font-bold mt-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-gray-400 text-center mt-2 leading-6">
          This app needs camera access to scan and extract numbers from images.
          Please enable camera permissions in your device settings.
        </Text>
        <TouchableOpacity
          className="bg-blue-600 px-6 py-3 rounded-lg mt-6"
          onPress={initializeCamera}
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={cameraType}
          onCameraReady={handleCameraReady}
          ratio="16:9"
        >
          <CameraOverlay width={overlayWidth} height={overlayHeight} />

          {/* Bottom Controls */}
          <View className="absolute bottom-0 left-0 right-0 pb-10">
            <View className="flex-row justify-between items-center px-8">
              {/* History Button */}
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-gray-800/80 justify-center items-center"
                onPress={openHistory}
              >
                <MaterialIcons name="history" size={24} color="white" />
              </TouchableOpacity>

              {/* Capture Button */}
              <TouchableOpacity
                className={`w-20 h-20 rounded-full border-4 border-white justify-center items-center ${
                  isProcessing ? "bg-gray-600" : "bg-transparent"
                }`}
                onPress={captureAndProcess}
                disabled={!cameraReady || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <View className="w-16 h-16 rounded-full bg-white" />
                )}
              </TouchableOpacity>

              {/* Camera Flip Button */}
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-gray-800/80 justify-center items-center"
                onPress={toggleCameraType}
              >
                <MaterialIcons name="flip-camera-ios" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Instructions */}
          <View className="absolute top-16 left-4 right-4">
            <View className="bg-black/50 rounded-lg p-4">
              <Text className="text-white text-center font-medium">
                Position numbers within the rectangle and tap capture
              </Text>
            </View>
          </View>
        </CameraView>
      </View>
    </ErrorBoundary>
  );
}
