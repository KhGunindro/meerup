import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LandmarkResponse, recognizeLandmarkBase64, recognizeLandmarkFile } from '@/utils/meerupApi';

interface LandmarkCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onLandmarkDetected: (result: LandmarkResponse, photoUri?: string) => void;
}

export function LandmarkCameraModal({ visible, onClose, onLandmarkDetected }: LandmarkCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (!photo) throw new Error('Could not capture photo');

      let response: LandmarkResponse;
      if (photo.base64) {
        response = await recognizeLandmarkBase64(photo.base64);
      } else {
        response = await recognizeLandmarkFile({
          uri: photo.uri,
          name: 'capture.jpg',
          type: 'image/jpeg',
        });
      }

      onLandmarkDetected(response, photo.uri);
      onClose();
    } catch (err: any) {
      console.error('Landmark recognition error:', err);
      setErrorMessage(err.message || 'Landmark detection failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFileWeb = () => {
    if (Platform.OS !== 'web') return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      try {
        setIsProcessing(true);
        setErrorMessage(null);
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const b64 = (reader.result as string).split(',')[1];
            const response = await recognizeLandmarkBase64(b64);
            const objectUrl = URL.createObjectURL(file);
            onLandmarkDetected(response, objectUrl);
            onClose();
          } catch (apiErr: any) {
            setErrorMessage(apiErr.message || 'Recognition failed');
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        setErrorMessage(err.message);
        setIsProcessing(false);
      }
    };
    input.click();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isProcessing}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>MEERUP Landmark AI</Text>
            <Text style={styles.headerSubtitle}>Point at Ima Keithel or Kangla Fort</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── CAMERA / VIEWFINDER ── */}
        <View style={styles.cameraWrapper}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <MaterialIcons name="photo-camera" size={54} color="#9CA3AF" />
              <Text style={styles.permissionText}>Camera permission is needed to scan landmarks</Text>
              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantBtnText}>Grant Camera Access</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' && (
                <TouchableOpacity style={[styles.grantBtn, { backgroundColor: '#2563EB', marginTop: 12 }]} onPress={handlePickFileWeb}>
                  <Text style={styles.grantBtnText}>Upload Photo Instead</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <CameraView style={styles.camera} ref={cameraRef}>
              {/* Overlay Frame */}
              <View style={styles.overlay}>
                <View style={styles.targetFrame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.guidanceText}>Align landmark within frame</Text>
              </View>
            </CameraView>
          )}

          {/* Processing Loading Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.processingTitle}>Identifying Landmark...</Text>
              <Text style={styles.processingSub}>Matching ORB visual features & generating AI story</Text>
            </View>
          )}
        </View>

        {/* ── ERROR MESSAGE BAR ── */}
        {errorMessage && (
          <View style={styles.errorBar}>
            <MaterialIcons name="info-outline" size={16} color="#EF4444" />
            <Text style={styles.errorText} numberOfLines={2}>{errorMessage}</Text>
          </View>
        )}

        {/* ── BOTTOM CONTROLS ── */}
        <View style={styles.bottomControls}>
          {Platform.OS === 'web' ? (
            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFileWeb} disabled={isProcessing}>
              <MaterialIcons name="photo-library" size={20} color="#FFF" />
              <Text style={styles.galleryBtnText}>Select Image File</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          {permission?.granted && (
            <TouchableOpacity
              style={[styles.captureBtn, isProcessing && { opacity: 0.5 }]}
              onPress={handleCapture}
              disabled={isProcessing}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
          )}

          <View style={{ width: 80 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetFrame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#10B981',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  guidanceText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 99,
  },
  processingTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  processingSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 14,
  },
  grantBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  grantBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7F1D1D',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    flex: 1,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  galleryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  captureBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#10B981',
  },
});
