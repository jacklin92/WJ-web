---
title: '使用 Astro 打造個人作品集'
description: '介紹如何用 Astro 框架建立一個現代化的個人網站與部落格，搭配 React 與 Three.js 實現互動式 3D 體驗。'
pubDate: '2026-03-25'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

Astro 是一個專注於內容的現代網頁框架，特別適合用來打造部落格與作品集網站。它採用「島嶼架構」（Islands Architecture），只在需要互動的地方載入 JavaScript，大幅提升頁面載入速度。

## 為什麼選擇 Astro

- **零 JavaScript 預設**：靜態頁面不會載入多餘的 JS
- **框架無關**：可以混用 React、Vue、Svelte 等元件
- **內建 Markdown 支援**：寫文章就像寫筆記一樣簡單
- **優秀的效能**：Lighthouse 滿分不是夢

## 搭配 Three.js 的 3D 特效

透過 `@react-three/fiber` 和 `@react-three/drei`，我們可以輕鬆地在 Astro 專案中加入 3D 視覺效果。這些特效只會在客戶端渲染，不影響伺服器端的效能。

```javascript
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

function Scene() {
  return (
    <Canvas>
      <Stars />
    </Canvas>
  );
}
```

這就是本站背景中那些流動粒子與旋轉幾何體的實作方式。
