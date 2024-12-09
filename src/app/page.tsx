"use client";

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

interface Shelter {
  lat: number;
  lng: number;
}

const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

const isWithinRadius = (lat1: number, lng1: number, lat2: number, lng2: number, radius: number): boolean => {
  const earthRadius = 6371; // 地球の半径 (km)
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lat1);

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Papa.parse('/TokyoSheet.csv', {
      download: true,
      header: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const parsedData: Shelter[] = results.data.map((row) => ({
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
      setError("ブラウザで位置情報がサポートされていません。");
      return;
    }
    setIsLoading(true);
    setError(null); // エラー状態をリセット
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setIsLoading(false);
      },
      () => {
        setError("位置情報が読み込めませんでした。");
        setIsLoading(false);
      }
    );
  };

  const getMapImageUrl = () => {
    if (!location) return '';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('APIキーが見つかりません。');
      return '';
    }

    const { lat, lng } = location;
    const zoom = 15;
    const size = '500x500';

    const filteredShelters = shelters.filter(shelter =>
      isWithinRadius(lat, lng, shelter.lat, shelter.lng, 0.5)
    );

    const shelterMarkers = filteredShelters
      .map(shelter => `markers=color:red|label:S|${shelter.lat},${shelter.lng}`)
      .join('&');

    const currentLocationMarker = `markers=color:black|label:C|${lat},${lng}`;

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
          className={`py-2 px-6 group relative rounded duration-300 inline-flex items-center shadow hover:shadow-lg ${
            isLoading ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'
          } text-white`}
          onClick={location ? downloadMapImage : getCurrentLocation}
          disabled={isLoading}
        >
          {isLoading
            ? 'Loading...'
            : location
            ? 'download'
            : 'GPS ON'}
        </button>
      </div>
      {error && (
        <p className="text-center text-red-500 mt-4">
          {error} 再度お試しください。
        </p>
      )}
      <p className="text-center text-black mt-4 mx-4"> GPS を使って現在地の避難所が載った MAP をダウンロードできます。 </p>
      <p className="text-center text-black mt-4 mx-4"> You can download a MAP with evacuation centers in your current location using GPS. </p>
      <p className="text-center text-black mt-4 mx-4"> 您可以使用 GPS 下载您当前所在位置的疏散中心地图。 </p>
    </div>
  );
};

export default MapComponent;
