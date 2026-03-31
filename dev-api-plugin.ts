/**
 * Vite Dev Plugin — 僅在 astro dev 時啟用的本地 API。
 * 提供 POST /__dev-api/publish 將文章寫入 src/content/blog/。
 * Production build 時此 plugin 完全不載入，零攻擊面。
 */

import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `post-${Date.now()}`;
}

export default function devApiPlugin(): Plugin {
  return {
    name: 'wj-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/__dev-api/publish' || req.method !== 'POST') {
          return next();
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const { title, content, description } = JSON.parse(body);

          if (!title || !content) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少 title 或 content' }));
            return;
          }

          const slug = slugify(title);
          const date = new Date().toISOString().split('T')[0];
          const frontmatter = [
            '---',
            `title: '${title.replace(/'/g, "''")}'`,
            `description: '${(description || '').replace(/'/g, "''")}'`,
            `pubDate: '${date}'`,
            '---',
          ].join('\n');

          const md = `${frontmatter}\n\n${content}\n`;
          const blogDir = path.resolve(process.cwd(), 'src/content/blog');

          if (!fs.existsSync(blogDir)) {
            fs.mkdirSync(blogDir, { recursive: true });
          }

          // 避免檔名衝突
          let fileName = `${slug}.md`;
          let filePath = path.join(blogDir, fileName);
          let counter = 1;
          while (fs.existsSync(filePath)) {
            fileName = `${slug}-${counter}.md`;
            filePath = path.join(blogDir, fileName);
            counter++;
          }

          fs.writeFileSync(filePath, md, 'utf-8');

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            fileName,
            filePath: `src/content/blog/${fileName}`,
          }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/__dev-api/articles' || req.method !== 'GET') {
          return next();
        }

        try {
          const blogDir = path.resolve(process.cwd(), 'src/content/blog');
          if (!fs.existsSync(blogDir)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }

          const files = fs.readdirSync(blogDir)
            .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
            .map(f => {
              const content = fs.readFileSync(path.join(blogDir, f), 'utf-8');
              const titleMatch = content.match(/^title:\s*['"](.*?)['"]/m);
              return { fileName: f, title: titleMatch?.[1] || f };
            });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(files));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/__dev-api/delete' || req.method !== 'POST') {
          return next();
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const { fileName } = JSON.parse(body);
          if (!fileName || fileName.includes('..') || fileName.includes('/')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '無效的檔名' }));
            return;
          }

          const filePath = path.resolve(process.cwd(), 'src/content/blog', fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}
