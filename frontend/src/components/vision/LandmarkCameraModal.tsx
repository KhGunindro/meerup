import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  LandmarkResponse,
  recognizeLandmarkBase64,
  recognizeLandmarkFile,
} from '@/utils/meerupApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LandmarkCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onLandmarkDetected: (result: LandmarkResponse, photoUri?: string) => void;
  onSpeechInteraction?: (landmark: LandmarkResponse) => void;
}

export function LandmarkCameraModal({
  visible,
  onClose,
  onLandmarkDetected,
  onSpeechInteraction,
}: LandmarkCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedLandmark, setDetectedLandmark] = useState<LandmarkResponse | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | undefined>(undefined);
  const [speechToast, setSpeechToast] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);

  // ─── Animations ───────────────────────────────────────────────────────────
  // Scan beam animation
  const scanAnim = useRef(new Animated.Value(0)).current;
  // Card appearance animation
  const cardSlideAnim = useRef(new Animated.Value(60)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;

  // Run scan laser loop when camera is visible and not yet detected
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (visible && !detectedLandmark && !isProcessing) {
      scanAnim.setValue(0);
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      scanAnim.stopAnimation();
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [visible, detectedLandmark, isProcessing]);

  // Animate AR card in when landmark is detected
  useEffect(() => {
    if (detectedLandmark) {
      Animated.parallel([
        Animated.spring(cardSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(cardFadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      cardSlideAnim.setValue(60);
      cardFadeAnim.setValue(0);
    }
  }, [detectedLandmark]);

  const resetState = () => {
    setDetectedLandmark(null);
    setCapturedPhotoUri(undefined);
    setIsProcessing(false);
    setErrorMessage(null);
    setSpeechToast(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ─── Landmark Detection via Backend ───────────────────────────────────────
  const processImageForLandmark = async (photoUri: string, base64?: string) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      let response: LandmarkResponse;
      if (base64) {
        response = await recognizeLandmarkBase64(base64);
      } else {
        response = await recognizeLandmarkFile({
          uri: photoUri,
          name: 'ar_landmark.jpg',
          type: 'image/jpeg',
        });
      }

      setCapturedPhotoUri(photoUri);

      if (response && response.recognized) {
        setDetectedLandmark(response);
      } else {
        setErrorMessage(
          'No landmark recognized with high confidence. Point camera directly at Kangla Fort or Ima Keithel.'
        );
      }
    } catch (err: any) {
      console.error('AR recognition error:', err);
      setErrorMessage(err.message || 'Detection failed. Ensure the backend vision server is active.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        skipProcessing: true,
      });

      if (!photo) throw new Error('Could not capture frame');
      await processImageForLandmark(photo.uri, photo.base64);
    } catch (err: any) {
      setErrorMessage(err.message || 'Capture failed');
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
            const objectUrl = URL.createObjectURL(file);
            await processImageForLandmark(objectUrl, b64);
          } catch (apiErr: any) {
            setErrorMessage(apiErr.message || 'Recognition failed');
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

  // ─── Speech Interaction Trigger ───────────────────────────────────────────
  const handleSpeechPress = () => {
    if (!detectedLandmark) return;

    if (onSpeechInteraction) {
      onSpeechInteraction(detectedLandmark);
    } else {
      setSpeechToast(`Voice dialogue ready for ${detectedLandmark.name}`);
      setTimeout(() => setSpeechToast(null), 3000);
    }
  };

  // ─── Confirm and Pass to Companion Chat ───────────────────────────────────
  const handleSendToChat = () => {
    if (detectedLandmark) {
      onLandmarkDetected(detectedLandmark, capturedPhotoUri);
      handleClose();
    }
  };

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* ─── LIVE CAMERA AR VIEWPORT ──────────────────────────────────────── */}
        {!permission?.granted ? (
          <View style={styles.permissionBox}>
            <View style={styles.permissionIconCircle}>
              <MaterialIcons name="photo-camera" size={44} color="#4777c2" />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSub}>
              MEERUP needs camera permission to provide augmented reality landmark detection.
            </Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantBtnText}>Grant Camera Access</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={[styles.grantBtn, { backgroundColor: '#2563EB', marginTop: 12 }]}
                onPress={handlePickFileWeb}
              >
                <Text style={styles.grantBtnText}>Upload Photo Instead</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={facing}
              ref={cameraRef}
            />

            {/* ─── AR RETICLE & VIEWPORT OVERLAY ─────────────────────────────── */}
            <View style={styles.arOverlayLayer} pointerEvents="box-none">
              {!detectedLandmark && (
                <View style={styles.reticleContainer}>
                  {/* Outer corner brackets */}
                  <View style={[styles.reticleCorner, styles.cornerTL]} />
                  <View style={[styles.reticleCorner, styles.cornerTR]} />
                  <View style={[styles.reticleCorner, styles.cornerBL]} />
                  <View style={[styles.reticleCorner, styles.cornerBR]} />

                  {/* Animated laser scan beam */}
                  <Animated.View
                    style={[
                      styles.scanLaserBeam,
                      {
                        transform: [{ translateY: scanTranslateY }],
                      },
                    ]}
                  />

                  {/* Center reticle dot */}
                  <View style={styles.reticleCenterDot} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ─── TOP MINIMAL AR HUD ───────────────────────────────────────────── */}
        <View style={styles.topHudBar}>
          <TouchableOpacity onPress={handleClose} style={styles.hudCircleBtn}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* AR Mode Indicator Badge */}
          <View style={styles.arModeBadge}>
            <View style={styles.radarPulseDot} />
            <Text style={styles.arModeText}>LANDMARK VISION</Text>
          </View>

          {/* Camera Flip / Web Upload Button */}
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'web') {
                handlePickFileWeb();
              } else {
                setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
              }
            }}
            style={styles.hudCircleBtn}
          >
            <Ionicons
              name={Platform.OS === 'web' ? 'cloud-upload-outline' : 'camera-reverse-outline'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* ─── PROCESSING HUD OVERLAY ───────────────────────────────────────── */}
        {isProcessing && (
          <View style={styles.processingHud}>
            <ActivityIndicator size="large" color="#4777c2" />
            <Text style={styles.processingHudTitle}>Scanning Landmark...</Text>
            <Text style={styles.processingHudSub}>Matching ORB features & generating stories</Text>
          </View>
        )}

        {/* ─── ERROR BANNER ─────────────────────────────────────────────────── */}
        {errorMessage && !isProcessing && (
          <View style={styles.errorHudToast}>
            <MaterialIcons name="info-outline" size={16} color="#EF4444" />
            <Text style={styles.errorHudText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage(null)} style={styles.errorDismissBtn}>
              <Ionicons name="close" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── SPEECH TOAST NOTIFICATION ────────────────────────────────────── */}
        {speechToast && (
          <View style={styles.speechHudToast}>
            <MaterialIcons name="mic" size={18} color="#4777c2" />
            <Text style={styles.speechHudText}>{speechToast}</Text>
          </View>
        )}

        {/* ─── BOTTOM CONTROLS OR MINIMAL AR DETECTION OVERLAY ──────────────── */}
        <View style={styles.bottomHudContainer} pointerEvents="box-none">
          {detectedLandmark ? (
            /* ── MINIMAL AR OVERLAY CARD ── */
            <Animated.View
              style={[
                styles.minimalArCard,
                {
                  opacity: cardFadeAnim,
                  transform: [{ translateY: cardSlideAnim }],
                },
              ]}
            >
              {/* Header Badge: Verified & Confidence */}
              <View style={styles.arCardTopRow}>
                <View style={styles.verifiedPill}>
                  <MaterialIcons name="verified" size={13} color="#10B981" />
                  <Text style={styles.verifiedText}>
                    VERIFIED • {Math.round(detectedLandmark.confidence * 100)}% MATCH
                  </Text>
                </View>
                <View style={styles.heritageTag}>
                  <Text style={styles.heritageText}>Cultural Landmark</Text>
                </View>
              </View>

              {/* Landmark Title */}
              <Text style={styles.landmarkTitle}>{detectedLandmark.name}</Text>

              {/* Minimal Description */}
              <Text style={styles.landmarkDesc} numberOfLines={3}>
                {detectedLandmark.description || detectedLandmark.story}
              </Text>

              {/* Cultural Highlight Chips */}
              {detectedLandmark.highlights && detectedLandmark.highlights.length > 0 && (
                <View style={styles.highlightsRow}>
                  {detectedLandmark.highlights.slice(0, 3).map((h, i) => (
                    <View key={i} style={styles.highlightChip}>
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Primary Action: Speech Interaction Button (Accent #4777c2) */}
              <TouchableOpacity
                style={styles.speechActionBtn}
                onPress={handleSpeechPress}
                activeOpacity={0.8}
              >
                <View style={styles.speechPulseRing} />
                <MaterialIcons name="mic" size={20} color="#FFFFFF" />
                <Text style={styles.speechActionText}>Ask AI with Voice</Text>
              </TouchableOpacity>

              {/* Secondary Utility Actions */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.rescanBtn}
                  onPress={() => setDetectedLandmark(null)}
                >
                  <Ionicons name="scan-outline" size={15} color="#94A3B8" />
                  <Text style={styles.rescanText}>Scan Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sendChatBtn}
                  onPress={handleSendToChat}
                >
                  <MaterialIcons name="chat" size={15} color="#FFFFFF" />
                  <Text style={styles.sendChatText}>Open in Chat</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            /* ── CAMERA SHUTTER BAR ── */
            <View style={styles.shutterBar}>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handlePickFileWeb}
                disabled={isProcessing}
              >
                <Ionicons name="images-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureShutterBtn, isProcessing && { opacity: 0.5 }]}
                onPress={handleCapture}
                disabled={isProcessing || !permission?.granted}
              >
                <View style={styles.captureInnerCircle} />
              </TouchableOpacity>

              <View style={styles.toolBtnPlaceholder} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0A0F1D',
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(71, 119, 194, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(71, 119, 194, 0.3)',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  permissionSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: '#4777c2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // AR Overlay Layer
  arOverlayLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleContainer: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#4777c2',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanLaserBeam: {
    width: '94%',
    height: 2.5,
    backgroundColor: '#4777c2',
    shadowColor: '#4777c2',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  reticleCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(71, 119, 194, 0.7)',
  },

  // Top HUD Bar
  topHudBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  hudCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(71, 119, 194, 0.4)',
  },
  radarPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  arModeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Processing HUD
  processingHud: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71, 119, 194, 0.4)',
    gap: 8,
    zIndex: 25,
  },
  processingHudTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  processingHudSub: {
    color: '#94A3B8',
    fontSize: 12,
  },

  // Error Banner
  errorHudToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 76,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 30,
  },
  errorHudText: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  errorDismissBtn: {
    padding: 4,
  },

  // Speech Toast
  speechHudToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 76,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: '#4777c2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 30,
  },
  speechHudText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Bottom HUD
  bottomHudContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    zIndex: 20,
  },

  // Shutter Bar
  shutterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  toolBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toolBtnPlaceholder: {
    width: 48,
    height: 48,
  },
  captureShutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  captureInnerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4777c2', // Meerup accent
  },

  // ─── Minimal AR Overlay Card ──────────────────────────────────────────────
  minimalArCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(71, 119, 194, 0.45)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  arCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heritageTag: {
    backgroundColor: 'rgba(71, 119, 194, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heritageText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  landmarkTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  landmarkDesc: {
    color: '#CBD5E1',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  highlightChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  highlightText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
  },

  // Speech Action Button
  speechActionBtn: {
    backgroundColor: '#4777c2',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#4777c2',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  speechPulseRing: {
    position: 'absolute',
    left: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  speechActionText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },

  // Card Secondary Actions
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rescanBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rescanText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  sendChatBtn: {
    flex: 1,
    backgroundColor: 'rgba(71, 119, 194, 0.3)',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4777c2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendChatText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
