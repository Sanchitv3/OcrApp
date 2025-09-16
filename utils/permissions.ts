import { Camera } from 'expo-camera';

export const requestCameraPermissions = async () => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};