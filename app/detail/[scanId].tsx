import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { getScanResult } from "@/utils/storage";
import { formatDate } from "@/utils/dateUtils";
import EmptyState from "@/components/custom/EmptyState";
import type { ScanResult } from "@/types";

export default function DetailScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (scanId) {
      loadScanResult();
    }
  }, [scanId]);

  const loadScanResult = async (): Promise<void> => {
    try {
      if (!scanId) return;

      const result = await getScanResult(scanId);
      if (result) {
        setScanResult(result);
      } else {
        Alert.alert("Error", "Scan result not found", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Error loading scan result:", error);
      Alert.alert("Error", "Failed to load scan details");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Numbers copied to clipboard");
  };

  const shareNumbers = async (): Promise<void> => {
    try {
      if (!scanResult) return;

      const numbersText = scanResult.numbers.join(", ");
      await Share.share({
        message: `Scanned Numbers: ${numbersText}`,
        title: "Scanned Numbers",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <MaterialIcons name="hourglass-empty" size={48} color="#9ca3af" />
        <Text className="text-gray-600 mt-2">Loading details...</Text>
      </View>
    );
  }

  if (!scanResult) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon="error-outline"
          title="Scan Not Found"
          description="The requested scan result could not be found"
          actionText="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header Info */}
        <View className="bg-gray-50 p-6 border-b border-gray-200">
          <Text className="text-gray-600 text-sm mb-1">
            Scanned on {formatDate(scanResult.timestamp)}
          </Text>
          <Text className="text-gray-900 text-lg font-semibold">
            {scanResult.numbers.length} Number
            {scanResult.numbers.length !== 1 ? "s" : ""} Found
          </Text>
        </View>

        {/* Cropped Image */}
        {scanResult.croppedImageUri && (
          <View className="p-6">
            <Text className="text-gray-900 font-semibold mb-3">
              Scanned Image
            </Text>
            <Image
              source={{ uri: scanResult.croppedImageUri }}
              className="w-full h-48 rounded-lg bg-gray-100"
              resizeMode="contain"
            />
          </View>
        )}

        {/* Extracted Numbers */}
        <View className="p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-900 font-semibold">
              Extracted Numbers
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-blue-600 px-4 py-2 rounded-lg mr-2"
                onPress={() => copyToClipboard(scanResult.numbers.join(", "))}
              >
                <View className="flex-row items-center">
                  <MaterialIcons name="content-copy" size={16} color="white" />
                  <Text className="text-white ml-1 font-medium">Copy</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-green-600 px-4 py-2 rounded-lg"
                onPress={shareNumbers}
              >
                <View className="flex-row items-center">
                  <MaterialIcons name="share" size={16} color="white" />
                  <Text className="text-white ml-1 font-medium">Share</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View className="space-y-2">
            {scanResult.numbers.map((number, index) => (
              <TouchableOpacity
                key={index}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                onPress={() => copyToClipboard(number)}
              >
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-900 text-lg font-mono">
                    {number}
                  </Text>
                  <MaterialIcons
                    name="content-copy"
                    size={16}
                    color="#9ca3af"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Info */}
        <View className="p-6 border-t border-gray-200">
          <Text className="text-gray-500 text-sm text-center">
            Tap any number to copy it individually
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
