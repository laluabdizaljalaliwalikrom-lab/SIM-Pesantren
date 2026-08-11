'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  radius: number;
  draggable: boolean;
  onPositionChange: (lat: number, lng: number) => void;
}

export default function LeafletMap({ latitude, longitude, radius, draggable, onPositionChange }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const posRef = useRef({ latitude, longitude });

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { draggable }).addTo(map);
    const circle = L.circle([latitude, longitude], {
      radius,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      posRef.current = { latitude: pos.lat, longitude: pos.lng };
      circle.setLatLng(pos);
      onPositionChange(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!draggable) return;
      marker.setLatLng(e.latlng);
      posRef.current = { latitude: e.latlng.lat, longitude: e.latlng.lng };
      circle.setLatLng(e.latlng);
      onPositionChange(e.latlng.lat, e.latlng.lng);
    });

    instanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      map.remove();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;
    instanceRef.current.setView([latitude, longitude], instanceRef.current.getZoom());
  }, [latitude, longitude]);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([posRef.current.latitude, posRef.current.longitude]);
      markerRef.current.options.draggable = draggable;
    }
  }, [draggable]);

  return <div ref={mapRef} className="h-[350px] w-full" />;
}
