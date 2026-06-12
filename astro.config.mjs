// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** @type {Record<string, { priority: number; changefreq: any }>} */
const priorityMap = {
  'https://realwordcounter.com/': { priority: 1.0, changefreq: 'daily' },
  'https://realwordcounter.com/word-counter/': { priority: 0.9, changefreq: 'weekly' },
  'https://realwordcounter.com/character-counter/': { priority: 0.85, changefreq: 'weekly' },
  'https://realwordcounter.com/text-case-converter/': { priority: 0.8, changefreq: 'weekly' },
  'https://realwordcounter.com/readability-checker/': { priority: 0.8, changefreq: 'weekly' },
  'https://realwordcounter.com/meta-description-checker/': { priority: 0.8, changefreq: 'weekly' },
  'https://realwordcounter.com/twitter-character-counter/': { priority: 0.8, changefreq: 'weekly' },
  'https://realwordcounter.com/instagram-caption-checker/': { priority: 0.8, changefreq: 'weekly' },
  'https://realwordcounter.com/upsc-word-counter/': { priority: 0.75, changefreq: 'weekly' },
  'https://realwordcounter.com/about/': { priority: 0.5, changefreq: 'monthly' },
  'https://realwordcounter.com/contact/': { priority: 0.5, changefreq: 'monthly' },
  'https://realwordcounter.com/privacy-policy/': { priority: 0.3, changefreq: 'yearly' },
  'https://realwordcounter.com/terms/': { priority: 0.3, changefreq: 'yearly' },
};

export default defineConfig({
  site: 'https://realwordcounter.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      lastmod: new Date('2026-06-04'),
      serialize(item) {
        const meta = priorityMap[item.url];
        if (meta) {
          item.priority = meta.priority;
          item.changefreq = meta.changefreq;
        }
        return item;
      },
    }),
  ],
});
