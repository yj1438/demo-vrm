import { resolve } from 'path';
import { defineConfig } from 'vite';

// 多页面入口：根目录下的每个 page-*.html 都作为一个入口
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        'page-face': resolve(__dirname, 'page-face.html'),
        'page-gesture': resolve(__dirname, 'page-gesture.html'),
        'page-pose': resolve(__dirname, 'page-pose.html'),
        'page-tween': resolve(__dirname, 'page-tween.html'),
        'page-uni': resolve(__dirname, 'page-uni.html'),
        'page-vrm': resolve(__dirname, 'page-vrm.html'),
        'page-holistic': resolve(__dirname, 'page-holistic.html'),
      },
    },
  },
});
