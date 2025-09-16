import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { EmptyStateProps } from '@/types';

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  description, 
  actionText, 
  onAction 
}) => {
  return (
    <View className="flex-1 justify-center items-center px-8">
      <MaterialIcons name={icon as any} size={80} color="#d1d5db" />
      <Text className="text-gray-900 text-xl font-bold mt-6 text-center">
        {title}
      </Text>
      <Text className="text-gray-600 text-center mt-2 leading-6">
        {description}
      </Text>
      {actionText && onAction && (
        <TouchableOpacity
          className="bg-blue-600 px-6 py-3 rounded-lg mt-8"
          onPress={onAction}
        >
          <Text className="text-white font-semibold">{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EmptyState;