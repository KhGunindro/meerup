import React from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';

export interface NativeMapViewProps {
  mapRef: React.RefObject<MapView | null>;
  style: any;
  userLocation: { lat: number; lng: number };
  selectedDest: { lat: number; lng: number; name: string };
  nativeRouteCoords: Array<{ latitude: number; longitude: number }>;
  userPulseContainerStyle: any;
  userPulseRingStyle: any;
  userPulseDotStyle: any;
  destPinBoxStyle: any;
  destLabelTagStyle: any;
  destPinHeadStyle: any;
  destPinIconStyle: any;
}

export function NativeMapView({
  mapRef,
  style,
  userLocation,
  selectedDest,
  nativeRouteCoords,
  userPulseContainerStyle,
  userPulseRingStyle,
  userPulseDotStyle,
  destPinBoxStyle,
  destLabelTagStyle,
  destPinHeadStyle,
  destPinIconStyle,
}: NativeMapViewProps) {
  return (
    <MapView
      ref={mapRef as any}
      style={style}
      provider={PROVIDER_DEFAULT}
      mapType="none"
      initialRegion={{
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
    >
      <UrlTile
        urlTemplate={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.EXPO_PUBLIC_CARTO_API_KEY || 'cb1_3uls_1_7874b4335173e85877f26ebd'}`}
        maximumZ={19}
        flipY={false}
      />
      {/* Glow Polyline */}
      <Polyline
        coordinates={nativeRouteCoords}
        strokeColor="rgba(71, 119, 194, 0.25)"
        strokeWidth={12}
        lineCap="round"
        lineJoin="round"
      />
      {/* Main Polyline */}
      <Polyline
        coordinates={nativeRouteCoords}
        strokeColor="#4777c2"
        strokeWidth={5}
        lineCap="round"
        lineJoin="round"
      />
      {/* User Marker */}
      <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={userPulseContainerStyle}>
          <View style={userPulseRingStyle} />
          <View style={userPulseDotStyle} />
        </View>
      </Marker>
      {/* Destination Marker */}
      <Marker coordinate={{ latitude: selectedDest.lat, longitude: selectedDest.lng }} anchor={{ x: 0.5, y: 1.0 }}>
        <View style={destPinBoxStyle}>
          <Text style={destLabelTagStyle}>{selectedDest.name}</Text>
          <View style={destPinHeadStyle}>
            <Text style={destPinIconStyle}>★</Text>
          </View>
        </View>
      </Marker>
    </MapView>
  );
}
