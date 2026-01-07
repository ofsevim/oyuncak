'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Path as FabricPath } from 'fabric';
import { motion } from 'framer-motion';
import { Trash2, Download } from 'lucide-react';
import { playPopSound } from '@/utils/soundEffects';

const COLORS = [
    { name: 'Kırmızı', value: '#EF5350' },
    { name: 'Turuncu', value: '#FFA726' },
    { name: 'Sarı', value: '#FFEE58' },
    { name: 'Yeşil', value: '#66BB6A' },
    { name: 'Mavi', value: '#42A5F5' },
    { name: 'Mor', value: '#AB47BC' },
    { name: 'Pembe', value: '#EC407A' },
    { name: 'Kahverengi', value: '#8D6E63' },
    { name: 'Beyaz', value: '#FFFFFF' },
];

type RegionKind = 'fill' | 'detail' | 'outline';

type PageRegion = {
    /** SVG path data */
    path: string;
    /** Kullanıcı için açıklama */
    name: string;
    /** Boyanabilir mi? (detail: sadece çizgi) */
    kind?: RegionKind;
};

type ColoringPage = {
    name: string;
    regions: PageRegion[];
};

// Her sayfa için ayrı boyama bölgeleri (daha iyi line-art + kapalı bölgeler)
const PAGES: ColoringPage[] = [
    {
        name: 'Kedi',
        regions: [
            // Fill bölgeleri
            { path: 'M 150,50 L 110,102 Q 108,112 112,120 L 150,112 L 188,120 Q 192,112 190,102 Z', name: 'Kulaklar' },
            { path: 'M 100,125 Q 82,175 98,222 Q 118,265 150,265 Q 182,265 202,222 Q 218,175 200,125 Q 175,105 150,115 Q 125,105 100,125 Z', name: 'Yüz' },
            { path: 'M 118,160 A 10,10 0 1,0 119,160', name: 'Sol Göz' },
            { path: 'M 182,160 A 10,10 0 1,0 183,160', name: 'Sağ Göz' },
            { path: 'M 150,190 L 142,200 L 158,200 Z', name: 'Burun' },
            // Detaylar (boyanmaz)
            { path: 'M 150,200 Q 145,210 140,205', name: 'Ağız Sol', kind: 'detail' },
            { path: 'M 150,200 Q 155,210 160,205', name: 'Ağız Sağ', kind: 'detail' },
            { path: 'M 105,185 L 70,175', name: 'Bıyık 1', kind: 'detail' },
            { path: 'M 105,198 L 70,198', name: 'Bıyık 2', kind: 'detail' },
            { path: 'M 105,212 L 75,220', name: 'Bıyık 3', kind: 'detail' },
            { path: 'M 195,185 L 230,175', name: 'Bıyık 4', kind: 'detail' },
            { path: 'M 195,198 L 230,198', name: 'Bıyık 5', kind: 'detail' },
            { path: 'M 195,212 L 225,220', name: 'Bıyık 6', kind: 'detail' },
            // Dış kontur (tek çizgi)
            { path: 'M 150,50 L 110,102 Q 108,112 112,120 L 150,112 L 188,120 Q 192,112 190,102 Z M 100,125 Q 82,175 98,222 Q 118,265 150,265 Q 182,265 202,222 Q 218,175 200,125 Q 175,105 150,115 Q 125,105 100,125 Z', name: 'Kontur', kind: 'outline' },
        ]
    },
    {
        name: 'Kelebek',
        regions: [
            { path: 'M 150,100 Q 100,80 80,120 Q 60,160 80,200 Q 100,240 150,220 Z', name: 'Sol Üst Kanat' },
            { path: 'M 150,100 Q 200,80 220,120 Q 240,160 220,200 Q 200,240 150,220 Z', name: 'Sağ Üst Kanat' },
            // Gövde (kapalı bölge)
            { path: 'M 145,105 Q 150,95 155,105 L 160,245 Q 150,260 140,245 Z', name: 'Gövde' },
            { path: 'M 100,140 A 12,12 0 1,0 101,140', name: 'Sol Nokta' },
            { path: 'M 200,140 A 12,12 0 1,0 201,140', name: 'Sağ Nokta' },
            // Antenler (detay)
            { path: 'M 148,100 Q 140,78 132,62', name: 'Anten Sol', kind: 'detail' },
            { path: 'M 152,100 Q 160,78 168,62', name: 'Anten Sağ', kind: 'detail' },
        ]
    },
    {
        name: 'Çiçek',
        regions: [
            { path: 'M 150,80 Q 180,100 170,130 Q 200,120 190,150 Q 220,160 190,180 Q 200,210 170,200 Q 180,230 150,220 Q 120,230 130,200 Q 100,210 110,180 Q 80,160 110,150 Q 100,120 130,130 Q 120,100 150,80 Z', name: 'Taç Yaprakları' },
            { path: 'M 150,150 A 25,25 0 1,0 151,150', name: 'Merkez' },
            // Gövde (kapalı şerit)
            { path: 'M 145,220 Q 150,215 155,220 L 160,300 Q 150,310 140,300 Z', name: 'Gövde' },
            // Yapraklar (kapalı)
            { path: 'M 150,250 Q 118,235 98,258 Q 120,285 150,270 Q 138,260 150,250 Z', name: 'Sol Yaprak' },
            { path: 'M 150,270 Q 182,255 202,278 Q 180,305 150,290 Q 162,280 150,270 Z', name: 'Sağ Yaprak' },
        ]
    },
    {
        name: 'Yıldız',
        regions: [
            { path: 'M 150,40 L 172,98 L 235,105 L 188,142 L 205,210 L 150,176 L 95,210 L 112,142 L 65,105 L 128,98 Z', name: 'Yıldız' },
            { path: 'M 150,110 A 18,18 0 1,0 151,110', name: 'Merkez' },
            { path: 'M 150,40 L 172,98 L 235,105 L 188,142 L 205,210 L 150,176 L 95,210 L 112,142 L 65,105 L 128,98 Z', name: 'Kontur', kind: 'outline' },
        ]
    },
    {
        name: 'Kalp',
        regions: [
            { path: 'M 150,245 Q 85,190 85,125 Q 85,78 118,78 Q 145,78 150,105 Q 155,78 182,78 Q 215,78 215,125 Q 215,190 150,245 Z', name: 'Kalp' },
            { path: 'M 150,245 Q 85,190 85,125 Q 85,78 118,78 Q 145,78 150,105 Q 155,78 182,78 Q 215,78 215,125 Q 215,190 150,245 Z', name: 'Kontur', kind: 'outline' },
        ]
    },
    {
        name: 'Güneş',
        regions: [
            { path: 'M 150,150 A 50,50 0 1,0 151,150', name: 'Yüz' },
            // Işınlar (kapalı üçgenler)
            { path: 'M 150,35 L 165,80 L 135,80 Z', name: 'Işın Üst' },
            { path: 'M 150,265 L 165,220 L 135,220 Z', name: 'Işın Alt' },
            { path: 'M 265,150 L 220,165 L 220,135 Z', name: 'Işın Sağ' },
            { path: 'M 35,150 L 80,165 L 80,135 Z', name: 'Işın Sol' },
            { path: 'M 245,70 L 210,100 L 225,55 Z', name: 'Işın Sağ-Üst' },
            { path: 'M 55,75 L 90,105 L 75,55 Z', name: 'Işın Sol-Üst' },
            { path: 'M 245,230 L 210,200 L 225,245 Z', name: 'Işın Sağ-Alt' },
            { path: 'M 55,225 L 90,195 L 75,245 Z', name: 'Işın Sol-Alt' },
        ]
    },
    {
        name: 'Ev',
        regions: [
            { path: 'M 150,55 L 235,125 L 65,125 Z', name: 'Çatı' },
            { path: 'M 80,125 L 220,125 L 220,255 L 80,255 Z', name: 'Bina' },
            { path: 'M 130,190 Q 150,175 170,190 L 170,255 L 130,255 Z', name: 'Kapı' },
            { path: 'M 105,150 L 135,150 L 135,175 L 105,175 Z', name: 'Sol Pencere' },
            { path: 'M 165,150 L 195,150 L 195,175 L 165,175 Z', name: 'Sağ Pencere' },
            { path: 'M 120,162 L 135,162 M 112,150 L 112,175', name: 'Pencere Çizgisi 1', kind: 'detail' },
            { path: 'M 180,162 L 195,162 M 172,150 L 172,175', name: 'Pencere Çizgisi 2', kind: 'detail' },
            { path: 'M 150,55 L 235,125 L 65,125 Z M 80,125 L 220,125 L 220,255 L 80,255 Z', name: 'Kontur', kind: 'outline' },
        ]
    },
    {
        name: 'Ağaç',
        regions: [
            { path: 'M 150,70 Q 200,85 210,125 Q 235,140 220,170 Q 230,210 190,220 Q 175,245 150,230 Q 125,245 110,220 Q 70,210 80,170 Q 65,140 90,125 Q 100,85 150,70 Z', name: 'Yapraklar' },
            { path: 'M 138,220 Q 150,205 162,220 L 170,280 Q 150,295 130,280 Z', name: 'Gövde' },
            { path: 'M 138,245 Q 120,250 108,265', name: 'Dal Sol', kind: 'detail' },
            { path: 'M 162,245 Q 180,250 192,265', name: 'Dal Sağ', kind: 'detail' },
            { path: 'M 150,70 Q 200,85 210,125 Q 235,140 220,170 Q 230,210 190,220 Q 175,245 150,230 Q 125,245 110,220 Q 70,210 80,170 Q 65,140 90,125 Q 100,85 150,70 Z M 138,220 Q 150,205 162,220 L 170,280 Q 150,295 130,280 Z', name: 'Kontur', kind: 'outline' },
        ]
    },
    {
        name: 'Araba',
        regions: [
            { path: 'M 85,195 Q 90,160 110,155 L 140,130 Q 150,120 165,125 L 195,145 Q 215,150 225,175 Q 230,190 225,210 Q 220,230 200,230 L 110,230 Q 90,230 85,210 Z', name: 'Kasa' },
            { path: 'M 110,180 A 25,25 0 1,0 111,180', name: 'Sol Tekerlek' },
            { path: 'M 190,180 A 25,25 0 1,0 191,180', name: 'Sağ Tekerlek' },
            { path: 'M 125,155 Q 132,140 145,140 L 155,140 Q 150,155 140,160 Z', name: 'Sol Cam' },
            { path: 'M 160,140 L 180,150 Q 187,155 185,165 L 160,160 Z', name: 'Sağ Cam' },
            { path: 'M 150,170 L 160,170', name: 'Kapı Kolu', kind: 'detail' },
            { path: 'M 85,195 Q 90,160 110,155 L 140,130 Q 150,120 165,125 L 195,145 Q 215,150 225,175 Q 230,190 225,210 Q 220,230 200,230 L 110,230 Q 90,230 85,210 Z', name: 'Kontur', kind: 'outline' },
        ]
    },
    {
        name: 'Uçak',
        regions: [
            { path: 'M 150,85 Q 158,105 162,125 L 210,165 Q 222,175 215,188 L 165,182 L 150,200 L 135,182 L 85,188 Q 78,175 90,165 L 138,125 Q 142,105 150,85 Z', name: 'Gövde' },
            { path: 'M 150,150 L 210,180 L 205,205 L 150,185 L 95,205 L 90,180 Z', name: 'Kanatlar' },
            { path: 'M 150,115 L 170,95 L 170,120 L 150,135 L 130,120 L 130,95 Z', name: 'Kuyruk' },
        ]
    },
    // ========== PREMİUM SAYFALAR ==========
    {
        name: 'Dinozor',
        regions: [
            { path: 'M 100,180 Q 85,160 90,130 Q 100,100 130,95 Q 160,92 180,100 Q 200,110 210,130 Q 220,150 215,180 Q 210,210 180,220 Q 150,225 120,220 Q 95,210 100,180 Z', name: 'Gövde' },
            { path: 'M 200,120 Q 220,100 240,105 Q 260,115 255,140 Q 250,160 230,165 Q 210,165 200,150 Z', name: 'Kafa' },
            { path: 'M 240,125 A 6,6 0 1,0 241,125', name: 'Göz' },
            { path: 'M 100,200 Q 90,230 95,260 Q 100,265 110,255 Q 115,230 115,200 Z', name: 'Sol Ön Bacak' },
            { path: 'M 140,210 Q 135,240 140,265 Q 148,270 155,260 Q 155,235 150,210 Z', name: 'Sol Arka Bacak' },
            { path: 'M 95,180 Q 70,175 50,180 Q 40,185 45,195 Q 55,200 80,195 Q 95,190 95,180 Z', name: 'Kuyruk' },
            { path: 'M 130,95 L 125,75 L 140,90', name: 'Sırt Dikeni 1', kind: 'detail' },
            { path: 'M 155,93 L 150,70 L 165,88', name: 'Sırt Dikeni 2', kind: 'detail' },
            { path: 'M 180,100 L 178,78 L 192,95', name: 'Sırt Dikeni 3', kind: 'detail' },
        ]
    },
    {
        name: 'Unicorn',
        regions: [
            { path: 'M 120,140 Q 100,120 105,90 Q 115,65 145,60 Q 175,58 195,75 Q 210,95 205,125 Q 200,155 170,170 Q 140,180 120,165 Z', name: 'Kafa' },
            { path: 'M 145,60 L 150,20 L 160,58', name: 'Boynuz' },
            { path: 'M 130,95 A 8,8 0 1,0 131,95', name: 'Göz' },
            { path: 'M 120,165 Q 110,200 115,240 Q 125,260 145,255 Q 160,245 155,200 Q 150,165 140,155 Z', name: 'Boyun' },
            { path: 'M 145,240 Q 130,270 140,290 Q 155,300 175,290 Q 190,275 180,245 Q 170,220 155,225 Z', name: 'Gövde' },
            { path: 'M 145,280 Q 140,300 145,315 Q 152,318 158,312 Q 160,295 155,280 Z', name: 'Ön Bacak' },
            { path: 'M 175,280 Q 172,302 178,318 Q 185,322 192,315 Q 195,298 188,278 Z', name: 'Arka Bacak' },
            { path: 'M 105,85 Q 85,70 75,80 Q 70,95 85,105 Q 100,108 110,95 Z', name: 'Kulak' },
            { path: 'M 175,58 Q 190,45 210,50 Q 220,60 210,80 Q 195,90 180,75 Z', name: 'Yele 1' },
            { path: 'M 200,80 Q 220,75 235,90 Q 240,110 225,120 Q 205,125 195,105 Z', name: 'Yele 2' },
            { path: 'M 180,245 Q 195,255 215,250 Q 225,245 220,230 Q 210,220 190,225 Z', name: 'Kuyruk' },
        ]
    },
    {
        name: 'Uzay',
        regions: [
            { path: 'M 150,60 Q 165,80 170,120 Q 175,180 165,220 Q 155,250 150,260 Q 145,250 135,220 Q 125,180 130,120 Q 135,80 150,60 Z', name: 'Roket Gövde' },
            { path: 'M 150,60 Q 160,40 150,25 Q 140,40 150,60 Z', name: 'Roket Burun' },
            { path: 'M 130,200 Q 110,220 105,250 Q 115,255 130,240 Q 135,220 130,200 Z', name: 'Sol Kanat' },
            { path: 'M 170,200 Q 190,220 195,250 Q 185,255 170,240 Q 165,220 170,200 Z', name: 'Sağ Kanat' },
            { path: 'M 150,140 A 15,15 0 1,0 151,140', name: 'Pencere' },
            { path: 'M 140,260 Q 135,280 145,290 Q 150,285 155,290 Q 165,280 160,260 Z', name: 'Alev' },
            { path: 'M 70,80 L 75,95 L 60,95 Z', name: 'Yıldız 1' },
            { path: 'M 230,120 L 235,135 L 220,135 Z', name: 'Yıldız 2' },
            { path: 'M 80,200 L 85,215 L 70,215 Z', name: 'Yıldız 3' },
            { path: 'M 220,60 A 20,20 0 1,0 221,60', name: 'Gezegen' },
            { path: 'M 200,55 Q 220,45 245,55 Q 250,62 240,68 Q 215,75 195,65 Z', name: 'Gezegen Halkası' },
        ]
    },
    {
        name: 'Denizaltı',
        regions: [
            { path: 'M 80,150 Q 60,130 80,110 Q 120,90 180,90 Q 240,90 260,120 Q 275,150 260,180 Q 240,210 180,210 Q 120,210 80,190 Q 60,170 80,150 Z', name: 'Gövde' },
            { path: 'M 130,130 A 15,15 0 1,0 131,130', name: 'Sol Pencere' },
            { path: 'M 180,130 A 15,15 0 1,0 181,130', name: 'Sağ Pencere' },
            { path: 'M 230,130 A 12,12 0 1,0 231,130', name: 'Küçük Pencere' },
            { path: 'M 150,90 Q 145,60 160,50 Q 175,55 170,85 Q 165,90 150,90 Z', name: 'Periskop' },
            { path: 'M 260,150 Q 280,145 290,155 Q 285,170 265,165 Z', name: 'Pervane' },
            { path: 'M 60,100 Q 50,95 45,105 Q 50,115 60,110 Z', name: 'Balık 1' },
            { path: 'M 250,200 Q 240,195 235,205 Q 240,215 250,210 Z', name: 'Balık 2' },
            { path: 'M 100,240 Q 90,250 100,260 Q 115,255 110,245 Q 105,238 100,240 Z', name: 'Deniz Yıldızı' },
            { path: 'M 200,230 Q 195,250 210,260 Q 220,250 215,235 Z', name: 'Yosun' },
            { path: 'M 80,260 Q 75,280 90,285 Q 100,275 95,265 Z', name: 'Mercan' },
        ]
    },
    {
        name: 'Prenses',
        regions: [
            { path: 'M 150,80 Q 120,85 115,115 Q 112,145 125,170 Q 140,190 150,190 Q 160,190 175,170 Q 188,145 185,115 Q 180,85 150,80 Z', name: 'Yüz' },
            { path: 'M 135,115 A 6,6 0 1,0 136,115', name: 'Sol Göz' },
            { path: 'M 165,115 A 6,6 0 1,0 166,115', name: 'Sağ Göz' },
            { path: 'M 150,140 L 147,148 L 153,148 Z', name: 'Burun' },
            { path: 'M 145,160 Q 150,168 155,160', name: 'Ağız', kind: 'detail' },
            { path: 'M 115,80 Q 100,60 120,45 Q 145,35 150,40 Q 155,35 180,45 Q 200,60 185,80 Q 175,70 150,68 Q 125,70 115,80 Z', name: 'Taç' },
            { path: 'M 150,40 L 148,25 L 152,25 Z', name: 'Taç Ucu' },
            { path: 'M 120,45 A 4,4 0 1,0 121,45', name: 'Taç Mücevher 1' },
            { path: 'M 150,38 A 5,5 0 1,0 151,38', name: 'Taç Mücevher 2' },
            { path: 'M 180,45 A 4,4 0 1,0 181,45', name: 'Taç Mücevher 3' },
            { path: 'M 150,190 Q 130,200 120,230 Q 115,270 130,300 Q 150,310 170,300 Q 185,270 180,230 Q 170,200 150,190 Z', name: 'Elbise Üst' },
            { path: 'M 130,300 Q 100,320 90,360 Q 95,380 150,380 Q 205,380 210,360 Q 200,320 170,300 Z', name: 'Elbise Etek' },
            { path: 'M 150,220 A 8,8 0 1,0 151,220', name: 'Elbise Süsü' },
            { path: 'M 115,115 Q 95,100 90,115 Q 92,130 110,125 Z', name: 'Sol Saç' },
            { path: 'M 185,115 Q 205,100 210,115 Q 208,130 190,125 Z', name: 'Sağ Saç' },
        ]
    },
    {
        name: 'Ejderha',
        regions: [
            { path: 'M 120,120 Q 100,100 110,75 Q 130,55 160,60 Q 190,68 200,95 Q 205,125 190,150 Q 170,170 140,165 Q 110,155 120,120 Z', name: 'Kafa' },
            { path: 'M 145,95 A 8,8 0 1,0 146,95', name: 'Göz' },
            { path: 'M 180,100 Q 200,95 210,105 Q 205,120 190,115 Z', name: 'Burun' },
            { path: 'M 110,75 Q 95,55 85,65 Q 80,85 100,90 Z', name: 'Sol Boynuz' },
            { path: 'M 160,60 Q 165,35 180,40 Q 190,55 175,70 Z', name: 'Sağ Boynuz' },
            { path: 'M 140,165 Q 130,200 135,250 Q 145,280 170,275 Q 195,265 190,220 Q 185,175 170,160 Z', name: 'Gövde' },
            { path: 'M 170,200 Q 200,180 230,190 Q 250,210 240,240 Q 220,260 190,250 Q 175,235 175,215 Z', name: 'Kanat' },
            { path: 'M 135,270 Q 125,290 135,305 Q 150,310 160,295 Q 165,275 155,265 Z', name: 'Ön Bacak' },
            { path: 'M 175,265 Q 180,285 195,295 Q 210,290 205,270 Q 195,255 180,260 Z', name: 'Arka Bacak' },
            { path: 'M 135,250 Q 110,260 90,255 Q 75,245 85,230 Q 100,225 120,235 Z', name: 'Kuyruk' },
            { path: 'M 200,110 Q 215,105 225,115 Q 220,130 205,125', name: 'Alev 1', kind: 'detail' },
            { path: 'M 225,115 Q 240,108 250,120 Q 245,135 230,128', name: 'Alev 2', kind: 'detail' },
        ]
    },
    {
        name: 'Balerin',
        regions: [
            { path: 'M 150,60 Q 130,65 128,85 Q 130,105 145,115 Q 155,115 170,105 Q 172,85 170,65 Q 160,58 150,60 Z', name: 'Yüz' },
            { path: 'M 140,80 A 4,4 0 1,0 141,80', name: 'Sol Göz' },
            { path: 'M 160,80 A 4,4 0 1,0 161,80', name: 'Sağ Göz' },
            { path: 'M 150,95 L 148,100 L 152,100 Z', name: 'Burun' },
            { path: 'M 128,65 Q 140,50 150,55 Q 160,50 172,65 Q 175,55 165,45 Q 150,40 135,45 Q 125,55 128,65 Z', name: 'Saç' },
            { path: 'M 150,115 Q 135,125 130,145 Q 128,165 140,180 Q 150,185 160,180 Q 172,165 170,145 Q 165,125 150,115 Z', name: 'Gövde' },
            { path: 'M 140,180 Q 100,185 80,195 Q 75,210 100,215 Q 140,210 150,200 Q 160,210 200,215 Q 225,210 220,195 Q 200,185 160,180 Z', name: 'Tutu' },
            { path: 'M 130,145 Q 110,140 95,150 Q 90,160 105,165 Q 120,160 130,155 Z', name: 'Sol Kol' },
            { path: 'M 170,145 Q 190,140 205,150 Q 210,160 195,165 Q 180,160 170,155 Z', name: 'Sağ Kol' },
            { path: 'M 145,215 Q 140,250 145,280 Q 152,285 158,280 Q 160,250 155,215 Z', name: 'Sol Bacak' },
            { path: 'M 155,215 Q 160,240 180,260 Q 190,265 195,258 Q 185,240 170,220 Z', name: 'Sağ Bacak' },
        ]
    }
];

const ColoringBookGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
    const [activeColor, setActiveColor] = useState(COLORS[2].value);
    const [activePage, setActivePage] = useState(0);
    const coloredRegionsRef = useRef<Map<string, string>>(new Map());
    const activeColorRef = useRef(activeColor);

    // Seçili rengi event handler'larda stale olmadan kullanabilmek için ref'e yaz
    useEffect(() => {
        activeColorRef.current = activeColor;
    }, [activeColor]);

    const loadPage = useCallback((canvas: FabricCanvas, pageIndex: number) => {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        coloredRegionsRef.current.clear();

        const page = PAGES[pageIndex];
        const margin = 60;
        const canvasWidth = canvas.width! - margin * 2;
        const canvasHeight = canvas.height! - margin * 2;

        const kindRank = (k?: RegionKind) => (k === 'outline' || k === 'detail' ? 1 : 0);
        const sorted = [...page.regions].sort((a, b) => kindRank(a.kind) - kindRank(b.kind));

        const created: FabricPath[] = [];

        sorted.forEach((region, index) => {
            const isLine = region.kind === 'outline' || region.kind === 'detail';
            const path = new FabricPath(region.path, {
                fill: 'transparent',
                stroke: isLine ? '#3B3B3B' : 'rgba(0,0,0,0)',
                strokeWidth: isLine ? 5 : 0,
                strokeLineCap: 'round',
                strokeLineJoin: 'round',
                selectable: false,
                evented: !isLine,
                hoverCursor: isLine ? 'default' : 'pointer',
                objectCaching: false,
            });

            // Tıklama -> seçili renkle bölgeyi doldur (taşma yok)
            if (!isLine) {
                path.on('mousedown', () => {
                    playPopSound();
                    const fillColor = activeColorRef.current;
                    path.set({ fill: fillColor });
                    coloredRegionsRef.current.set(`${pageIndex}-${index}`, fillColor);
                    canvas.renderAll();
                });
            }

            created.push(path);
        });

        // Tüm çizimi tek seferde ölçekle/ortala (tüm path'ler aynı koordinat sisteminde)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        created.forEach((p) => {
            const b = p.getBoundingRect();
            minX = Math.min(minX, b.left);
            minY = Math.min(minY, b.top);
            maxX = Math.max(maxX, b.left + b.width);
            maxY = Math.max(maxY, b.top + b.height);
        });

        const contentWidth = Math.max(1, maxX - minX);
        const contentHeight = Math.max(1, maxY - minY);
        const scale = Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight) * 0.9;
        const offsetX = (canvas.width! - contentWidth * scale) / 2 - minX * scale;
        const offsetY = (canvas.height! - contentHeight * scale) / 2 - minY * scale;

        created.forEach((p) => {
            p.set({
                scaleX: scale,
                scaleY: scale,
                left: offsetX,
                top: offsetY,
            });
            canvas.add(p);
        });

        canvas.renderAll();
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const width = Math.min(containerRef.current.clientWidth - 32, 550);
        const height = 450;

        const canvas = new FabricCanvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff',
            selection: false,
        });

        setFabricCanvas(canvas);
        // İlk yükleme: sayfa 0
        loadPage(canvas, 0);

        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = Math.min(containerRef.current.clientWidth - 32, 550);
            canvas.setDimensions({ width: newWidth, height });
            canvas.renderAll();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            canvas.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [loadPage]);

    useEffect(() => {
        if (fabricCanvas) {
            loadPage(fabricCanvas, activePage);
        }
    }, [activePage, fabricCanvas, loadPage]);

    const handleClear = () => {
        if (!fabricCanvas) return;
        playPopSound();
        loadPage(fabricCanvas, activePage);
    };

    const handleSave = () => {
        if (!fabricCanvas) return;
        const link = document.createElement('a');
        link.download = `boyama-${PAGES[activePage].name}.png`;
        link.href = fabricCanvas.toDataURL({ format: 'png' });
        link.click();
    };

    return (
        <motion.div className="flex flex-col items-center gap-6 p-4 pb-32 max-w-4xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-foreground tracking-tight">🎨 Boyama Defteri</h2>
                <p className="text-muted-foreground font-bold">Bir renk seç, şekle tıkla ve boya!</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[2rem] shadow-sm border-2 border-primary/10">
                {PAGES.map((page, i) => (
                    <button
                        key={i}
                        onClick={() => { playPopSound(); setActivePage(i); }}
                        className={`px-6 py-3 rounded-2xl font-black transition-all duration-200 ${activePage === i ? 'bg-primary text-white scale-105 shadow-lg' : 'bg-muted text-muted-foreground hover:bg-primary/10'}`}
                    >
                        {page.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 w-full items-start">
                {/* Canvas Area */}
                <div className="flex flex-col items-center gap-4">
                    <div ref={containerRef} className="bg-white rounded-[3rem] shadow-playful overflow-hidden border-8 border-white p-2">
                        <canvas ref={canvasRef} />
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <button 
                            onClick={handleClear}
                            className="flex items-center gap-2 px-6 py-4 bg-muted text-muted-foreground rounded-full font-bold hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                            <Trash2 className="w-6 h-6" /> <span className="hidden sm:inline">Temizle</span>
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-3 px-10 py-4 bg-success text-white rounded-full font-black text-xl shadow-lg btn-bouncy">
                            <Download className="w-6 h-6" /> Kaydet
                        </button>
                    </div>
                </div>

                {/* Sidebar - Colors */}
                <div className="flex flex-col gap-6 bg-white p-6 rounded-[3rem] shadow-playful border-4 border-primary/5">
                    <div className="space-y-4">
                        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest px-2">🎨 Renkler</span>
                        <div className="grid grid-cols-3 gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => { 
                                        playPopSound(); 
                                        setActiveColor(c.value);
                                    }}
                                    className={`w-14 h-14 rounded-full border-4 transition-all duration-200 hover:scale-110 ${activeColor === c.value ? 'border-primary scale-110 shadow-lg ring-2 ring-offset-2 ring-primary' : 'border-gray-200'}`}
                                    style={{ backgroundColor: c.value }}
                                    aria-label={`${c.name} rengi seç`}
                                />
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-primary/10 rounded-2xl text-center">
                            <p className="text-sm font-bold text-primary">
                                💡 {COLORS.find(c => c.value === activeColor)?.name}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ColoringBookGame;
