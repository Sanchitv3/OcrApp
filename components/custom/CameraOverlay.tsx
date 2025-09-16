import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import type { CameraOverlayProps } from '@/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CameraOverlay: React.FC<CameraOverlayProps> = ({ width, height }) => {
  const overlayX = (screenWidth - width) / 2;
  const overlayY = (screenHeight - height) / 2;

  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0 
    }}>
      {/* Semi-transparent overlay with cutout */}
      <Svg height={screenHeight} width={screenWidth}>
        <Defs>
          <Mask id="mask">
            <Rect width="100%" height="100%" fill="white" />
            <Rect
              x={overlayX}
              y={overlayY}
              width={width}
              height={height}
              rx={12}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#mask)"
        />
      </Svg>

      {/* Rectangle border */}
      <View
        style={{
          position: 'absolute',
          left: overlayX,
          top: overlayY,
          width: width,
          height: height,
          borderWidth: 3,
          borderColor: '#3b82f6',
          borderRadius: 12,
          backgroundColor: 'transparent',
        }}
      >
        {/* Corner indicators */}
        <View style={{
          position: 'absolute',
          top: -2,
          left: -2,
          width: 20,
          height: 20,
          borderTopWidth: 4,
          borderLeftWidth: 4,
          borderColor: '#ffffff',
          borderTopLeftRadius: 12,
        }} />
        <View style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 20,
          height: 20,
          borderTopWidth: 4,
          borderRightWidth: 4,
          borderColor: '#ffffff',
          borderTopRightRadius: 12,
        }} />
        <View style={{
          position: 'absolute',
          bottom: -2,
          left: -2,
          width: 20,
          height: 20,
          borderBottomWidth: 4,
          borderLeftWidth: 4,
          borderColor: '#ffffff',
          borderBottomLeftRadius: 12,
        }} />
        <View style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 20,
          height: 20,
          borderBottomWidth: 4,
          borderRightWidth: 4,
          borderColor: '#ffffff',
          borderBottomRightRadius: 12,
        }} />
      </View>
    </View>
  );
};

export default CameraOverlay;