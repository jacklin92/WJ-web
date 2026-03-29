---
title: 'Tailwind CSS 實用技巧'
description: '分享幾個在日常開發中常用的 Tailwind CSS 技巧，讓你的開發效率更上一層樓。'
pubDate: '2026-03-28'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

Tailwind CSS 是一個功能優先（utility-first）的 CSS 框架，讓你能直接在 HTML 中快速建構出各種樣式，無需撰寫自定義 CSS。

## 暗色模式的配置

Tailwind v4 大幅簡化了設定流程，只需要在 CSS 中加入 `@import "tailwindcss"` 即可開始使用。搭配 CSS 變數，可以輕鬆實現主題切換：

```css
:root {
  --bg-primary: #0f0f1a;
  --text-primary: #e2e8f0;
}
```

## 響應式設計

Tailwind 的響應式前綴讓 RWD 開發變得非常直觀：

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- 自動適應不同螢幕寬度 -->
</div>
```

## Backdrop Blur 效果

毛玻璃效果是現代 UI 設計的常見元素，在 Tailwind 中只需一個 class：

```html
<header class="backdrop-blur-md bg-black/50">
  <!-- 透明模糊的導覽列 -->
</header>
```

善用這些工具類別，能大幅縮短開發時間並保持樣式的一致性。
