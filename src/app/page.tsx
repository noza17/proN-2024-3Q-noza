"use client";  // ファイルの先頭に配置

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

interface Shelter {
  lat: number;
  lng: number;
}

// 緯度と経度の距離を計算するための関数に型を指定
const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// 指定された半径内にポイントが含まれているかどうかを判定する関数に型を指定
const isWithinRadius = (lat1: number, lng1: number, lat2: number, lng2: number, radius: number): boolean => {
  const earthRadius = 6371; // 地球の半径 (km)
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  return distance <= radius;
};

const MapComponent = () => {
  const [location, setLocation] = useState<Shelter | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);

  useEffect(() => {
    Papa.parse('/TokyoSheet.csv', {
      download: true,
      header: true,
      complete: (results) => {
        const parsedData: Shelter[] = results.data.map((row: any) => ({
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
        }));
        setShelters(parsedData);
      },
      error: () => {
        console.log('CSVの読み込みに失敗しました。');
      },
    });
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.log("ブラウザで位置情報がサポートされていません。");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
      },
      () => {
        console.log("位置情報の取得に失敗しました。");
      }
    );
  };

  const getMapImageUrl = () => {
    if (!location) return '';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // この行を保持して良い
    if (!apiKey) {
      console.error('APIキーが見つかりません。');
      return '';
    }
    
    const { lat, lng } = location;
    const zoom = 15;
    const size = '500x500';

  // 500m範囲内にあるシェルターのみをフィルタリング
  const filteredShelters = shelters.filter(shelter =>
    isWithinRadius(lat, lng, shelter.lat, shelter.lng, 0.5)
  );

  // シェルターマーカーを生成
  const shelterMarkers = filteredShelters
    .map(shelter => `markers=color:red|label:S|${shelter.lat},${shelter.lng}`)
    .join('&');

  // 現在地に黒点を打つマーカーを追加
  const currentLocationMarker = `markers=color:black|label:C|${lat},${lng}`;

  // マーカーをURLに追加
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&format=jpg&key=${apiKey}&${currentLocationMarker}&${shelterMarkers}`;
};

  const downloadMapImage = () => {
    const mapImageUrl = getMapImageUrl();
    if (!mapImageUrl) {
      console.log("マップURLの生成に失敗しました。");
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = mapImageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'map.jpg';
            link.click();
            console.log("マップのダウンロードに成功しました。");
          } else {
            console.log("Blob生成に失敗しました。");
          }
        }, 'image/jpeg');
      } else {
        console.log("Canvasのコンテキストを取得できませんでした。");
      }
    };

    img.onerror = () => {
      console.log("画像の読み込みに失敗しました。");
    };
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-3xl text-black font-bold mb-6">GPS 避難所 MAP</h1>
      <div className="w-full max-w-md flex justify-center">
        <button
          className="py-2 px-6 group relative bg-orange-600 text-white rounded duration-300 inline-flex items-center shadow hover:shadow-lg"
          onClick={location ? downloadMapImage : getCurrentLocation}
        >
          {location ? 'download' : 'GPS ON'}
        </button>
      </div>
      <p className="text-center text-black mt-4 mx-4">
        GPS を使って現在地の避難所が載った MAP をダウンロードできます。
      </p>
      <p className="text-center text-black mt-4 mx-4">
        You can download a MAP with evacuation centers in your current location using GPS.
      </p>
      <p className="text-center text-black mt-4 mx-4">
      您可以使用 GPS 下载您当前所在位置的疏散中心地图。
      </p>
    </div>
  );
};

export default MapComponent;
