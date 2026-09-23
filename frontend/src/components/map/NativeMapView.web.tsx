import React from 'react';
import { View } from 'react-native';

export interface NativeMapViewProps {
  mapRef: React.RefObject<any>;
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

export function NativeMapView(_props: NativeMapViewProps) {
  // Web uses Leaflet in an iframe, so native MapView is not rendered on web
  return <View style={_props.style} />;
}
