import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  PanResponder,
  Animated,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArExperience, ArHotspot } from '@/constants/destinations';
import { Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ArExperienceCardProps {
  ar: ArExperience;
  destId: string;
  colors: (typeof Colors)['light' | 'dark'];
  isDark: boolean;
}

export function ArExperienceCard({ ar, destId, colors, isDark }: ArExperienceCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMode, setActiveMode] = useState<'3d' | 'ar'>('3d');
  const [selectedHotspot, setSelectedHotspot] = useState<ArHotspot | null>(null);
  const [scale, setScale] = useState(1.0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [photoSavedToast, setPhotoSavedToast] = useState(false);

  // Rotation animation
  const rotY = useRef(new Animated.Value(0)).current;
  const rotX = useRef(new Animated.Value(0)).current;

  // Auto-spin loop
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (autoRotate && modalVisible) {
      animLoop = Animated.loop(
        Animated.timing(rotY, {
          toValue: 360,
          duration: 12000,
          useNativeDriver: false,
        })
      );
      animLoop.start();
    } else {
      rotY.stopAnimation();
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [autoRotate, modalVisible]);

  // Touch Drag-to-Rotate Gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setAutoRotate(false);
      },
      onPanResponderMove: (_, gestureState) => {
        rotY.setValue((gestureState.dx * 0.8) % 360);
        rotX.setValue(Math.max(-30, Math.min(30, -gestureState.dy * 0.4)));
      },
    })
  ).current;

  // Photo capture effect
  const handleCapturePhoto = () => {
    setPhotoSavedToast(true);
    setTimeout(() => setPhotoSavedToast(false), 2400);
  };

  const cardBg = isDark ? '#181920' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(15,118,110,0.4)' : 'rgba(15,118,110,0.25)';

  return (
    <>
      {/* ── AR HERO PROMO CARD ON PAGE ─────────────── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.cardGlowOverlay} />

        <View style={styles.cardTopRow}>
          <View style={[styles.arBadge, { backgroundColor: '#0F766E' }]}>
            <Ionicons name="cube-outline" size={13} color="#FFFFFF" />
            <Text style={styles.arBadgeText}>{ar.badge}</Text>
          </View>
          <View style={styles.holoPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.holoPillText}>SPATIAL 3D</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]}>{ar.title}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{ar.subtitle}</Text>

        {/* Feature Pills */}
        <View style={styles.featuresRow}>
          {ar.arFeatures.map((feat, i) => (
            <View
              key={i}
              style={[
                styles.featurePill,
                { backgroundColor: isDark ? '#232530' : '#F3F4F6', borderColor: colors.border },
              ]}>
              <Ionicons name="sparkles" size={10} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feat}</Text>
            </View>
          ))}
        </View>

        {/* Launch Button */}
        <TouchableOpacity
          style={[styles.launchBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.88}>
          <Ionicons name="cube" size={18} color="#FFFFFF" />
          <Text style={styles.launchBtnText}>Launch AR Experience</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── FULLSCREEN INTERACTIVE AR MODAL ─────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalRoot, { backgroundColor: '#08090C' }]}>
          {/* Top Bar */}
          <View style={styles.modalTopBar}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
              accessibilityLabel="Close AR Viewer">
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.modalTitleCol}>
              <Text style={styles.modalTitleText}>{ar.modelName}</Text>
              <Text style={styles.modalSubText}>Drag to rotate 360° · Tap hotspots</Text>
            </View>

            <View style={styles.modeToggle}>
              <TouchableOpacity
                onPress={() => setActiveMode('3d')}
                style={[styles.modeBtn, activeMode === '3d' && styles.modeBtnActive]}>
                <Text style={[styles.modeBtnText, activeMode === '3d' && styles.modeBtnTextActive]}>3D</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveMode('ar')}
                style={[styles.modeBtn, activeMode === 'ar' && styles.modeBtnActive]}>
                <Text style={[styles.modeBtnText, activeMode === 'ar' && styles.modeBtnTextActive]}>AR</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 3D / AR VIEWPORT ─────────────────────── */}
          <View style={styles.viewport} {...panResponder.panHandlers}>
            {/* Background: Studio or AR Camera Simulator */}
            {activeMode === 'ar' ? (
              <View style={styles.arCameraSimulator}>
                {/* Camera reticle / grid */}
                <View style={styles.arGridFloor} />
                <View style={styles.arReticleSquare} />
                <View style={styles.arBadgeFloating}>
                  <Ionicons name="videocam-outline" size={13} color="#10B981" />
                  <Text style={styles.arLiveText}>Surface Detected · Scale 1:1</Text>
                </View>
              </View>
            ) : (
              <View style={styles.studioBg}>
                <View style={styles.podiumRing} />
                <View style={styles.podiumRingOuter} />
              </View>
            )}

            {/* 3D Hologram Artifact Illustration */}
            <Animated.View
              style={[
                styles.modelContainer,
                {
                  transform: [
                    { scale: scale },
                    {
                      rotateY: rotY.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                    {
                      rotateX: rotX.interpolate({
                        inputRange: [-30, 30],
                        outputRange: ['-30deg', '30deg'],
                      }),
                    },
                  ],
                },
              ]}>
              {/* Emblem / 3D Icon Representation */}
              <View style={styles.hologramGlow} />
              <Image
                source={require('@/assets/images/meerup-emblem.jpg')}
                style={styles.modelImage}
                resizeMode="contain"
              />

              {/* Glowing Interactive Hotspots on Model */}
              {ar.hotspots.map((hotspot, idx) => {
                const posStyles = [
                  { top: 20, right: 30 },
                  { bottom: 40, left: 35 },
                  { top: 90, left: 45 },
                ][idx % 3];

                const isSelected = selectedHotspot?.title === hotspot.title;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.hotspotPin, posStyles, isSelected && styles.hotspotPinSelected]}
                    onPress={() => setSelectedHotspot(hotspot)}>
                    <View style={styles.hotspotPulse} />
                    <Ionicons name="information" size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            {/* Selected Hotspot Cultural Card Overlay */}
            {selectedHotspot && (
              <View style={styles.hotspotCard}>
                <View style={styles.hotspotCardHeader}>
                  <View style={styles.hotspotTagRow}>
                    <Ionicons name="sparkles" size={13} color="#F59E0B" />
                    <Text style={styles.hotspotCardTitle}>{selectedHotspot.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedHotspot(null)}>
                    <Ionicons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hotspotCardDesc}>{selectedHotspot.desc}</Text>
              </View>
            )}

            {/* Photo Saved Feedback Toast */}
            {photoSavedToast && (
              <View style={styles.toast}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.toastText}>AR Snapshot Captured & Saved</Text>
              </View>
            )}
          </View>

          {/* ── AR CONTROLS BAR ──────────────────────── */}
          <View style={styles.controlsBar}>
            {/* Auto Rotate Toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, autoRotate && styles.controlBtnActive]}
              onPress={() => setAutoRotate((prev) => !prev)}>
              <Ionicons name="sync" size={18} color={autoRotate ? '#0F766E' : '#FFFFFF'} />
              <Text style={[styles.controlBtnText, autoRotate && { color: '#0F766E' }]}>
                {autoRotate ? 'Spinning' : 'Manual'}
              </Text>
            </TouchableOpacity>

            {/* Scale - */}
            <TouchableOpacity
              style={styles.scaleBtn}
              onPress={() => setScale((s) => Math.max(0.6, s - 0.2))}>
              <Ionicons name="remove" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Scale Label */}
            <Text style={styles.scaleLabel}>{Math.round(scale * 100)}%</Text>

            {/* Scale + */}
            <TouchableOpacity
              style={styles.scaleBtn}
              onPress={() => setScale((s) => Math.min(1.8, s + 0.2))}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Capture Shutter Button */}
            <TouchableOpacity style={styles.shutterBtn} onPress={handleCapturePhoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  cardGlowOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    backgroundColor: 'rgba(15,118,110,0.08)',
    borderRadius: 70,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  arBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  holoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  holoPillText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  launchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalRoot: {
    flex: 1,
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1C24',
    zIndex: 20,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1A1C24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleCol: {
    alignItems: 'center',
    flex: 1,
  },
  modalTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSubText: {
    color: '#9CA3AF',
    fontSize: 10.5,
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1A1C24',
    borderRadius: 12,
    padding: 3,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  modeBtnActive: {
    backgroundColor: '#0F766E',
  },
  modeBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },

  // Viewport
  viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  studioBg: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRing: {
    width: 260,
    height: 90,
    borderRadius: 130,
    borderWidth: 1.5,
    borderColor: 'rgba(15,118,110,0.3)',
    backgroundColor: 'rgba(15,118,110,0.05)',
    transform: [{ rotateX: '60deg' }],
    position: 'absolute',
    bottom: '22%',
  },
  podiumRingOuter: {
    width: 340,
    height: 120,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(15,118,110,0.15)',
    transform: [{ rotateX: '60deg' }],
    position: 'absolute',
    bottom: '18%',
  },
  arCameraSimulator: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#05070A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arGridFloor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: 'rgba(16,185,129,0.04)',
  },
  arReticleSquare: {
    width: 140,
    height: 70,
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 14,
    transform: [{ rotateX: '65deg' }],
    position: 'absolute',
    bottom: '24%',
  },
  arBadgeFloating: {
    position: 'absolute',
    top: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  arLiveText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  modelContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hologramGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(15,118,110,0.18)',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  modelImage: {
    width: 180,
    height: 180,
  },
  hotspotPin: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F766E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  hotspotPinSelected: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 1.25 }],
  },
  hotspotPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  hotspotCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(24,25,32,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0F766E',
    padding: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  hotspotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hotspotTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hotspotCardTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  hotspotCardDesc: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 18,
  },
  toast: {
    position: 'absolute',
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Controls Bar
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: '#1A1C24',
    backgroundColor: '#0C0D12',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#1A1C24',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(15,118,110,0.2)',
  },
  controlBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
  },
  scaleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1C24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  shutterBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  shutterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
});
