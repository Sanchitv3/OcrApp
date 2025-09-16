import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center bg-gray-50 px-6">
          <MaterialIcons name="error-outline" size={80} color="#ef4444" />
          <Text className="text-gray-900 text-xl font-bold mt-4 text-center">
            Something went wrong
          </Text>
          <Text className="text-gray-600 text-center mt-2 leading-6">
            An unexpected error occurred. Please try restarting the app.
          </Text>
          <TouchableOpacity
            className="bg-blue-600 px-6 py-3 rounded-lg mt-6"
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;