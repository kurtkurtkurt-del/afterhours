// google maps, mürekkep stili: tek renk, sokaklar koyu gri, su siyah, yazılar soluk.
export const inkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1c1b18' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a877f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#161512' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2c29' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3733' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6c6961' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1a1916' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0e0c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a4740' }] },
];
