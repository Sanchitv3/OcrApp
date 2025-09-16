import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { getAllScanResults, deleteScanResult } from "@/utils/storage";
import { formatDate } from "@/utils/dateUtils";
import EmptyState from "@/components/custom/EmptyState";
import type { ScanResult } from "@/types";

export default function HistoryScreen() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useFocusEffect(
    React.useCallback(() => {
      loadScanResults();
    }, [])
  );

  const loadScanResults = async (): Promise<void> => {
    try {
      const results = await getAllScanResults();
      setScanResults(results);
    } catch (error) {
      console.error("Error loading scan results:", error);
      Alert.alert("Error", "Failed to load scan history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = (): void => {
    setRefreshing(true);
    loadScanResults();
  };

  const handleDelete = (item: ScanResult): void => {
    Alert.alert(
      "Delete Scan",
      "Are you sure you want to delete this scan result?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(item.id),
        },
      ]
    );
  };

  const performDelete = async (scanId: string): Promise<void> => {
    try {
      await deleteScanResult(scanId);
      setScanResults((prev) => prev.filter((item) => item.id !== scanId));
    } catch (error) {
      console.error("Error deleting scan result:", error);
      Alert.alert("Error", "Failed to delete scan result");
    }
  };

  const renderScanItem = ({ item }: { item: ScanResult }) => {
    const previewNumbers = item.numbers.slice(0, 3).join(", ");
    const hasMore = item.numbers.length > 3;

    return (
      <TouchableOpacity
        className="bg-white mx-4 mb-3 rounded-lg p-4 shadow-sm border border-gray-200"
        onPress={() => router.push(`/detail/${item.id}`)}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-gray-600 text-sm mb-1">
              {formatDate(item.timestamp)}
            </Text>
            <Text className="text-gray-900 text-lg font-medium">
              {previewNumbers}
              {hasMore ? "..." : ""}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {item.numbers.length} number{item.numbers.length !== 1 ? "s" : ""}{" "}
              found
            </Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              className="p-2"
              onPress={() => handleDelete(item)}
            >
              <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
            <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <MaterialIcons name="hourglass-empty" size={48} color="#9ca3af" />
        <Text className="text-gray-600 mt-2">Loading history...</Text>
      </View>
    );
  }

  if (scanResults.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <EmptyState
          icon="camera-alt"
          title="No Scans Yet"
          description="Start scanning numbers with your camera to see them here"
          actionText="Start Scanning"
          onAction={() => router.push("/")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={scanResults}
        renderItem={renderScanItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#3b82f6"]}
          />
        }
      />
    </SafeAreaView>
  );
}
