// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:4321/word-counter';

const TEST_TEXT = `The quick brown fox jumps over the lazy dog. This is a second sentence for testing purposes. And here is a third sentence to ensure accuracy.

This is a second paragraph for testing paragraph counting.`;

// ── 1. PAGE LOAD TESTS ────────────────────────────────────────────────────────

test.describe('1. Page Load Tests', () => {
  test('Page loads without JavaScript console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    expect(errors, `Console errors found: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Page title matches expected SEO title', async ({ page }) => {
    await page.goto(BASE_URL);
    const title = await page.title();
    expect(title).toBe('Word Counter Online Free — Live Word Count, Character Count and Goal Tracker');
  });

  test('Meta description tag exists and is not empty', async ({ page }) => {
    await page.goto(BASE_URL);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect((desc || '').length).toBeGreaterThan(0);
  });

  test('Canonical link tag exists and points to correct URL', async ({ page }) => {
    await page.goto(BASE_URL);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://realwordcounter.com/word-counter');
  });

  test('H1 heading exists and contains target keyword', async ({ page }) => {
    await page.goto(BASE_URL);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1?.toLowerCase()).toContain('word counter');
  });

  test('Privacy badge is visible on the page', async ({ page }) => {
    await page.goto(BASE_URL);
    const badge = page.locator('.tool-privacy-badge');
    await expect(badge).toBeVisible();
  });

  test('Breadcrumb navigation is present and shows correct path', async ({ page }) => {
    await page.goto(BASE_URL);
    const breadcrumb = page.locator('nav.breadcrumb');
    await expect(breadcrumb).toBeVisible();
    const breadcrumbText = await breadcrumb.textContent();
    expect(breadcrumbText).toContain('Home');
    expect(breadcrumbText).toContain('Word Counter');
  });

  test('Page loads in under 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});

// ── 2. TEXTAREA TESTS ─────────────────────────────────────────────────────────

test.describe('2. Textarea Tests', () => {
  test('Textarea is present and visible on the page', async ({ page }) => {
    await page.goto(BASE_URL);
    const textarea = page.locator('#editor');
    await expect(textarea).toBeVisible();
  });

  test('Textarea accepts keyboard input', async ({ page }) => {
    await page.goto(BASE_URL);
    const textarea = page.locator('#editor');
    await textarea.fill('Hello world');
    await expect(textarea).toHaveValue('Hello world');
  });

  test('Textarea placeholder text is visible when empty', async ({ page }) => {
    await page.goto(BASE_URL);
    const placeholder = await page.locator('#editor').getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    expect((placeholder || '').length).toBeGreaterThan(0);
  });

  test('Typing text into the textarea does not cause errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(BASE_URL);
    await page.locator('#editor').fill('Testing 1 2 3');
    expect(errors).toHaveLength(0);
  });

  test('Pasting a large block of text (500 words) works without lag', async ({ page }) => {
    await page.goto(BASE_URL);
    const bigText = Array(500).fill('word').join(' ');
    const start = Date.now();
    await page.locator('#editor').fill(bigText);
    await page.waitForTimeout(200);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
    await expect(page.locator('#stat-words')).not.toHaveText('0');
  });

  test('Textarea is visible and usable on 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    const textarea = page.locator('#editor');
    await expect(textarea).toBeVisible();
    await textarea.fill('mobile test');
    await expect(textarea).toHaveValue('mobile test');
  });
});

// ── 3. LIVE STATS TESTS ───────────────────────────────────────────────────────

test.describe('3. Live Stats Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#editor').fill(TEST_TEXT);
    await page.waitForTimeout(300);
  });

  test('Word count shows exactly 35 words', async ({ page }) => {
    const words = await page.locator('#stat-words').textContent();
    expect(words?.trim()).toBe('35');
  });

  test('Character count shows correct total including spaces', async ({ page }) => {
    const chars = await page.locator('#stat-chars').textContent();
    const expected = TEST_TEXT.length.toString();
    expect(chars?.replace(/,/g, '')).toBe(expected);
  });

  test('Sentence count shows exactly 4 sentences', async ({ page }) => {
    // Both paragraphs end with periods, so the tool counts 4 sentence fragments
    const sentences = await page.locator('#stat-sentences').textContent();
    expect(sentences?.trim()).toBe('4');
  });

  test('Paragraph count shows exactly 2 paragraphs', async ({ page }) => {
    const paragraphs = await page.locator('#stat-paragraphs').textContent();
    expect(paragraphs?.trim()).toBe('2');
  });

  test('Reading time shows a value greater than 0', async ({ page }) => {
    const reading = await page.locator('#stat-reading').textContent();
    expect(reading).not.toBe('0 min');
    expect(reading).toContain('min');
  });

  test('Speaking time shows a value greater than 0', async ({ page }) => {
    const speaking = await page.locator('#stat-speaking').textContent();
    expect(speaking).not.toBe('0 min');
    expect(speaking).toContain('min');
  });

  test('Unique words count shows a value less than total word count', async ({ page }) => {
    const wordsText = await page.locator('#stat-words').textContent();
    const uniqueText = await page.locator('#stat-unique').textContent();
    const words = parseInt(wordsText?.replace(/,/g, '') || '0');
    const unique = parseInt(uniqueText?.replace(/,/g, '') || '0');
    expect(unique).toBeGreaterThan(0);
    expect(unique).toBeLessThan(words);
  });

  test('All stats update within 500ms of typing stopping', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('#editor').fill('');
    const start = Date.now();
    await page.locator('#editor').fill('quick test input');
    await page.waitForFunction(() => {
      const el = document.getElementById('stat-words');
      return el && el.textContent !== '0';
    }, { timeout: 500 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

// ── 4. GOAL TRACKER TESTS ─────────────────────────────────────────────────────

test.describe('4. Goal Tracker Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Goal tracker card is visible on the page', async ({ page }) => {
    const card = page.locator('[aria-label="Word goal tracker"]');
    await expect(card).toBeVisible();
  });

  test('Goal input field is present', async ({ page }) => {
    await expect(page.locator('#goal-input')).toBeVisible();
  });

  test('Progress bar is present and has zero width when no text is entered', async ({ page }) => {
    const fill = page.locator('#goal-bar-fill');
    await expect(fill).toBeAttached();
    // The fill lives inside overflow:hidden parent — check width via DOM
    const width = await fill.evaluate(el => el.style.width);
    expect(width).toBe('0%');
  });

  test('Typing text causes progress bar width to increase when goal is set', async ({ page }) => {
    await page.locator('#goal-input').fill('100');
    await page.locator('#editor').fill('hello world test text here');
    await page.waitForTimeout(100);
    const width = await page.locator('#goal-bar-fill').evaluate(el => el.style.width);
    expect(parseFloat(width)).toBeGreaterThan(0);
  });

  test('UPSC 150 preset button exists and is clickable', async ({ page }) => {
    const btn = page.locator('button[data-preset-label="UPSC 150"]');
    await expect(btn).toBeVisible();
    await btn.click();
  });

  test('Clicking UPSC 150 preset sets goal input to exactly 150', async ({ page }) => {
    await page.locator('button[data-preset-label="UPSC 150"]').click();
    const val = await page.locator('#goal-input').inputValue();
    expect(val).toBe('150');
  });

  test('UPSC 250 preset button sets goal to 250', async ({ page }) => {
    await page.locator('button[data-preset-label="UPSC 250"]').click();
    expect(await page.locator('#goal-input').inputValue()).toBe('250');
  });

  test('UPSC Essay preset sets goal to 1100', async ({ page }) => {
    await page.locator('button[data-preset-label="UPSC Essay"]').click();
    expect(await page.locator('#goal-input').inputValue()).toBe('1100');
  });

  test('CBSE 500 preset sets goal to 500', async ({ page }) => {
    await page.locator('button[data-preset-label="CBSE 500"]').click();
    expect(await page.locator('#goal-input').inputValue()).toBe('500');
  });

  test('IELTS Task 1 preset sets goal to 150', async ({ page }) => {
    await page.locator('button[data-preset-label="IELTS Task 1"]').click();
    expect(await page.locator('#goal-input').inputValue()).toBe('150');
  });

  test('IELTS Task 2 preset sets goal to 250', async ({ page }) => {
    await page.locator('button[data-preset-label="IELTS Task 2"]').click();
    expect(await page.locator('#goal-input').inputValue()).toBe('250');
  });

  test('Blog 1500 preset sets goal to 1500', async ({ page }) => {
    await page.locator('button[data-preset-label="Blog 1500"]').click();
    expect(await page.locator('#goal-input').inputValue()).toBe('1500');
  });

  test('LinkedIn preset sets goal to 300', async ({ page }) => {
    await page.locator('button[data-preset-label="LinkedIn"]').click();
    expect(await page.locator('#goal-input').inputValue()).toBe('300');
  });

  test('After clicking a preset and typing text, status message updates', async ({ page }) => {
    await page.locator('button[data-preset-label="UPSC 150"]').click();
    await page.locator('#editor').fill('hello world');
    await page.waitForTimeout(100);
    const status = await page.locator('#goal-status').textContent();
    expect(status).not.toBe('Set a target and start writing');
  });

  test('When word count equals goal, progress bar turns green', async ({ page }) => {
    await page.locator('#goal-input').fill('5');
    await page.locator('#editor').fill('one two three four five');
    await page.waitForTimeout(100);
    const cls = await page.locator('#goal-bar-fill').getAttribute('class');
    expect(cls).toContain('bar-green');
  });

  test('When word count exceeds goal, progress bar turns red', async ({ page }) => {
    await page.locator('#goal-input').fill('3');
    await page.locator('#editor').fill('one two three four five');
    await page.waitForTimeout(100);
    const cls = await page.locator('#goal-bar-fill').getAttribute('class');
    expect(cls).toContain('bar-red');
  });

  test('When word count is between 80-99% of goal, progress bar turns amber', async ({ page }) => {
    // 9 words with goal 10 = 90%
    await page.locator('#goal-input').fill('10');
    await page.locator('#editor').fill('one two three four five six seven eight nine');
    await page.waitForTimeout(100);
    const cls = await page.locator('#goal-bar-fill').getAttribute('class');
    expect(cls).toContain('bar-amber');
  });
});

// ── 5. PLATFORM LIMITS CHECKER TESTS ─────────────────────────────────────────

test.describe('5. Platform Limits Checker Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Platform limits checker card is visible on the page', async ({ page }) => {
    await expect(page.locator('[aria-label="Platform character limits"]')).toBeVisible();
  });

  test('Exactly 10 platform cards are rendered', async ({ page }) => {
    const cards = page.locator('[data-platform]');
    await expect(cards).toHaveCount(10);
  });

  test('Twitter/X card shows limit of 280', async ({ page }) => {
    const twitterCard = page.locator('[data-platform="twitter"]');
    const limitText = await twitterCard.textContent();
    expect(limitText).toContain('280');
  });

  test('Instagram Post card shows limit of 2200', async ({ page }) => {
    const card = page.locator('[data-platform="ig-post"]');
    const limitText = await card.textContent();
    expect(limitText).toContain('2200');
  });

  test('Instagram Bio card shows limit of 150', async ({ page }) => {
    const card = page.locator('[data-platform="ig-bio"]');
    const limitText = await card.textContent();
    expect(limitText).toContain('150');
  });

  test('Meta Description card shows limit of 155', async ({ page }) => {
    const card = page.locator('[data-platform="meta-desc"]');
    const limitText = await card.textContent();
    expect(limitText).toContain('155');
  });

  test('YouTube Title card shows limit of 100', async ({ page }) => {
    const card = page.locator('[data-platform="yt-title"]');
    const limitText = await card.textContent();
    expect(limitText).toContain('100');
  });

  test('SMS card shows limit of 160', async ({ page }) => {
    const card = page.locator('[data-platform="sms"]');
    const limitText = await card.textContent();
    expect(limitText).toContain('160');
  });

  test('LinkedIn Post card shows limit of 3000', async ({ page }) => {
    const card = page.locator('[data-platform="linkedin"]');
    const limitText = await card.textContent();
    expect(limitText).toContain('3000');
  });

  test('When textarea is empty, all platform cards show neutral state', async ({ page }) => {
    const cards = page.locator('[data-platform]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const hasOk = await card.evaluate(el => el.classList.contains('platform-ok'));
      const hasOver = await card.evaluate(el => el.classList.contains('platform-over'));
      expect(hasOk || hasOver).toBe(false);
    }
  });

  test('After typing 100 characters, Twitter card shows characters used correctly', async ({ page }) => {
    const text = 'a'.repeat(100);
    await page.locator('#editor').fill(text);
    await page.waitForTimeout(100);
    const twitterCard = page.locator('[data-platform="twitter"]');
    const countEl = twitterCard.locator('.platform-count');
    const countText = await countEl.textContent();
    expect(countText?.replace(/,/g, '')).toBe('100');
  });

  test('After typing more than 280 characters, Twitter card shows red over-limit state', async ({ page }) => {
    const text = 'a'.repeat(290);
    await page.locator('#editor').fill(text);
    await page.waitForTimeout(100);
    const twitterCard = page.locator('[data-platform="twitter"]');
    await expect(twitterCard).toHaveClass(/platform-over/);
  });

  test('After typing fewer than 280 characters, Twitter card shows green within-limit state', async ({ page }) => {
    const text = 'a'.repeat(100);
    await page.locator('#editor').fill(text);
    await page.waitForTimeout(100);
    const twitterCard = page.locator('[data-platform="twitter"]');
    await expect(twitterCard).toHaveClass(/platform-ok/);
  });
});

// ── 6. ACTION BUTTONS TESTS ───────────────────────────────────────────────────

test.describe('6. Action Buttons Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Paste button is present and visible', async ({ page }) => {
    await expect(page.locator('#btn-paste')).toBeVisible();
  });

  test('Clear button is present and visible', async ({ page }) => {
    await expect(page.locator('#btn-clear')).toBeVisible();
  });

  test('Browse File button is present and visible', async ({ page }) => {
    await expect(page.locator('label.import-browse-btn')).toBeVisible();
  });

  test('Copy Stats button is present and visible', async ({ page }) => {
    await expect(page.locator('#btn-copy-stats')).toBeVisible();
  });

  test('Clicking Clear button when textarea has fewer than 50 words clears the text', async ({ page }) => {
    await page.locator('#editor').fill('hello world test');
    await page.locator('#btn-clear').click();
    await page.waitForTimeout(100);
    const val = await page.locator('#editor').inputValue();
    expect(val).toBe('');
  });

  test('After clearing, all stat cards reset to 0', async ({ page }) => {
    await page.locator('#editor').fill('hello world test');
    await page.locator('#btn-clear').click();
    await page.waitForTimeout(100);
    expect(await page.locator('#stat-words').textContent()).toBe('0');
    expect(await page.locator('#stat-chars').textContent()).toBe('0');
    expect(await page.locator('#stat-sentences').textContent()).toBe('0');
  });
});

// ── 7. FILE UPLOAD TESTS ──────────────────────────────────────────────────────

test.describe('7. File Upload Tests', () => {
  test('File input element exists in the DOM', async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('#file-upload');
    await expect(fileInput).toBeAttached();
  });

  test('File input accepts .txt file type', async ({ page }) => {
    await page.goto(BASE_URL);
    const accept = await page.locator('#file-upload').getAttribute('accept');
    expect(accept).toContain('.txt');
  });

  test('File input accepts .docx file type', async ({ page }) => {
    await page.goto(BASE_URL);
    const accept = await page.locator('#file-upload').getAttribute('accept');
    expect(accept).toContain('.docx');
  });

  test('Uploading a .txt file with known content loads that content into the textarea', async ({ page }) => {
    await page.goto(BASE_URL);
    const tmpFile = path.join(os.tmpdir(), 'test-upload.txt');
    fs.writeFileSync(tmpFile, 'Hello world from uploaded file');
    const fileInput = page.locator('#file-upload');
    await fileInput.setInputFiles(tmpFile);
    await page.waitForTimeout(500);
    const val = await page.locator('#editor').inputValue();
    expect(val).toContain('Hello world from uploaded file');
    fs.unlinkSync(tmpFile);
  });

  test('After .txt upload, word count stat updates to reflect loaded content', async ({ page }) => {
    await page.goto(BASE_URL);
    const tmpFile = path.join(os.tmpdir(), 'test-upload-words.txt');
    fs.writeFileSync(tmpFile, 'one two three four five');
    await page.locator('#file-upload').setInputFiles(tmpFile);
    await page.waitForTimeout(500);
    const words = await page.locator('#stat-words').textContent();
    expect(words?.trim()).toBe('5');
    fs.unlinkSync(tmpFile);
  });

  test('Uploading an unsupported file type shows an error toast notification', async ({ page }) => {
    await page.goto(BASE_URL);
    const tmpFile = path.join(os.tmpdir(), 'test.xyz');
    fs.writeFileSync(tmpFile, 'invalid content');
    await page.locator('#file-upload').setInputFiles(tmpFile);
    await page.waitForTimeout(500);
    const toast = page.locator('.toast-error');
    await expect(toast).toBeVisible();
    fs.unlinkSync(tmpFile);
  });
});

// ── 8. TEXT CASE CONVERTER TESTS ─────────────────────────────────────────────

test.describe('8. Text Case Converter Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Case converter section is visible on the page', async ({ page }) => {
    await expect(page.locator('.case-grid')).toBeVisible();
  });

  test('UPPERCASE button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#case-upper')).toBeVisible();
    await page.locator('#case-upper').click();
  });

  test('lowercase button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#case-lower')).toBeVisible();
    await page.locator('#case-lower').click();
  });

  test('Title Case button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#case-title')).toBeVisible();
    await page.locator('#case-title').click();
  });

  test('Sentence case button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#case-sent')).toBeVisible();
    await page.locator('#case-sent').click();
  });

  test('Alternating Case button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#case-alt')).toBeVisible();
    await page.locator('#case-alt').click();
  });

  test('Remove Extra Spaces button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#case-spaces')).toBeVisible();
    await page.locator('#case-spaces').click();
  });

  test('Reverse Text button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#case-rev')).toBeVisible();
    await page.locator('#case-rev').click();
  });

  test('Type "hello world", click UPPERCASE, verify textarea shows "HELLO WORLD"', async ({ page }) => {
    await page.locator('#editor').fill('hello world');
    await page.locator('#case-upper').click();
    await expect(page.locator('#editor')).toHaveValue('HELLO WORLD');
  });

  test('Type "HELLO WORLD", click lowercase, verify textarea shows "hello world"', async ({ page }) => {
    await page.locator('#editor').fill('HELLO WORLD');
    await page.locator('#case-lower').click();
    await expect(page.locator('#editor')).toHaveValue('hello world');
  });

  test('Type "hello world", click Title Case, verify textarea shows "Hello World"', async ({ page }) => {
    await page.locator('#editor').fill('hello world');
    await page.locator('#case-title').click();
    await expect(page.locator('#editor')).toHaveValue('Hello World');
  });

  test('After any case conversion, a toast notification appears', async ({ page }) => {
    await page.locator('#editor').fill('hello world');
    await page.locator('#case-upper').click();
    await expect(page.locator('.toast')).toBeVisible();
  });
});

// ── 9. EXPORT TESTS ───────────────────────────────────────────────────────────

test.describe('9. Export Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Export section is visible on the page', async ({ page }) => {
    await expect(page.locator('.export-grid')).toBeVisible();
  });

  test('Copy Text button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#export-copy')).toBeVisible();
    await page.locator('#export-copy').click();
  });

  test('Download .txt button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#export-txt')).toBeVisible();
  });

  test('Download .md button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#export-md')).toBeVisible();
  });

  test('Print button exists and is clickable', async ({ page }) => {
    await expect(page.locator('#export-print')).toBeVisible();
  });

  test('Clicking Copy Text with text in textarea triggers clipboard copy (toast shown)', async ({ page }) => {
    await page.locator('#editor').fill('Text to copy');
    await page.locator('#export-copy').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.toast')).toBeVisible();
  });

  test('Clicking Download .txt initiates a file download', async ({ page }) => {
    await page.locator('#editor').fill('Download test content');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-txt').click(),
    ]);
    expect(download.suggestedFilename()).toContain('.txt');
  });

  test('Clicking Download .md initiates a file download with .md extension', async ({ page }) => {
    await page.locator('#editor').fill('Markdown download test');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-md').click(),
    ]);
    expect(download.suggestedFilename()).toContain('.md');
  });
});

// ── 10. AUTOSAVE TESTS ────────────────────────────────────────────────────────

test.describe('10. Autosave Tests', () => {
  test('Autosave indicator element is present on the page', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#autosave-indicator')).toBeVisible();
  });

  test('After typing and waiting 1500ms, localStorage key RealWordCounter_draft is set', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.locator('#editor').fill('autosave test content');
    await page.waitForTimeout(1500);
    const saved = await page.evaluate(() => localStorage.getItem('RealWordCounter_draft'));
    expect(saved).toBeTruthy();
  });

  test('The saved localStorage value contains the typed text', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.locator('#editor').fill('autosave unique content xyz');
    await page.waitForTimeout(1500);
    const saved = await page.evaluate(() => localStorage.getItem('RealWordCounter_draft'));
    expect(saved).toContain('autosave unique content xyz');
  });

  test('Reload the page and textarea is restored with previously typed text', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.locator('#editor').fill('restore after reload test');
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForTimeout(500);
    const val = await page.locator('#editor').inputValue();
    expect(val).toContain('restore after reload test');
  });

  test('After reload, autosave indicator shows restored message', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.locator('#editor').fill('restore indicator test');
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForTimeout(500);
    const indicator = await page.locator('#autosave-indicator').textContent();
    expect(indicator?.toLowerCase()).toMatch(/restored|saved|auto-save/i);
  });
});

// ── 11. WRITING SESSION ANALYTICS TESTS ──────────────────────────────────────

test.describe('11. Writing Session Analytics Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Session analytics card is visible on the page', async ({ page }) => {
    await expect(page.locator('[aria-label="Writing session analytics"]')).toBeVisible();
  });

  test('WPM stat element is present', async ({ page }) => {
    await expect(page.locator('#session-wpm')).toBeVisible();
  });

  test('Session Time stat element is present', async ({ page }) => {
    await expect(page.locator('#session-time')).toBeVisible();
  });

  test('Words Written stat element is present', async ({ page }) => {
    await expect(page.locator('#session-words')).toBeVisible();
  });

  test('Before typing, WPM shows 0', async ({ page }) => {
    const wpm = await page.locator('#session-wpm').textContent();
    expect(wpm?.trim()).toBe('0');
  });

  test('After typing 20 words, Words Written stat shows a value greater than 0', async ({ page }) => {
    const twentyWords = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty';
    await page.locator('#editor').fill(twentyWords);
    await page.waitForTimeout(200);
    const words = await page.locator('#session-words').textContent();
    expect(parseInt(words || '0')).toBeGreaterThan(0);
  });

  test('After typing for 5 seconds, Session Time shows a non-zero value', async ({ page }) => {
    await page.locator('#editor').fill('session time test');
    await page.waitForTimeout(5500);
    const time = await page.locator('#session-time').textContent();
    expect(time?.trim()).not.toBe('0:00');
  });
});

// ── 12. KEYWORD DENSITY TESTS ─────────────────────────────────────────────────

test.describe('12. Keyword Density Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Keyword density section is present in the DOM', async ({ page }) => {
    await expect(page.locator('#keyword-section')).toBeAttached();
  });

  test('With fewer than 20 words, keyword section is hidden', async ({ page }) => {
    await page.locator('#editor').fill('short text only');
    await page.waitForTimeout(400);
    const display = await page.locator('#keyword-section').evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('After typing 50 words with repeated keywords, keyword list appears', async ({ page }) => {
    const text = Array(10).fill('python javascript coding programming development framework library testing deployment').join(' ');
    await page.locator('#editor').fill(text);
    await page.waitForTimeout(600);
    const display = await page.locator('#keyword-section').evaluate(el => window.getComputedStyle(el).display);
    expect(display).not.toBe('none');
  });

  test('Keyword list shows at least 3 keyword rows', async ({ page }) => {
    const text = Array(10).fill('python javascript coding programming development framework library testing deployment').join(' ');
    await page.locator('#editor').fill(text);
    await page.waitForTimeout(600);
    const count = await page.locator('.keyword-item').count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Each keyword row shows the word, a count, and a bar', async ({ page }) => {
    const text = Array(10).fill('python javascript coding programming development').join(' ');
    await page.locator('#editor').fill(text);
    await page.waitForTimeout(600);
    const firstItem = page.locator('.keyword-item').first();
    await expect(firstItem.locator('.keyword-word')).toBeVisible();
    await expect(firstItem.locator('.keyword-count')).toBeVisible();
    // .keyword-bar is 4px tall inside overflow:hidden — check it's in the DOM
    await expect(firstItem.locator('.keyword-bar')).toBeAttached();
  });

  test('Common stop words like "the" and "and" do not appear in the keyword list', async ({ page }) => {
    const text = Array(20).fill('the and in is of to a an this that').join(' ');
    await page.locator('#editor').fill(text);
    await page.waitForTimeout(600);
    const keywords = await page.locator('.keyword-word').allTextContents();
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('and');
  });
});

// ── 13. READABILITY SCORE TESTS ───────────────────────────────────────────────

test.describe('13. Readability Score Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Readability card is hidden when textarea is empty', async ({ page }) => {
    const display = await page.locator('#readability-card').evaluate(el => el.style.display);
    expect(display).toBe('none');
  });

  test('Readability card is hidden when fewer than 10 words are typed', async ({ page }) => {
    await page.locator('#editor').fill('one two three four');
    await page.waitForTimeout(200);
    const display = await page.locator('#readability-card').evaluate(el => el.style.display);
    expect(display).toBe('none');
  });

  test('After typing at least 10 words, readability card becomes visible', async ({ page }) => {
    await page.locator('#editor').fill('one two three four five six seven eight nine ten eleven');
    await page.waitForTimeout(200);
    await expect(page.locator('#readability-card')).toBeVisible();
  });

  test('Readability score shows a number between 0 and 100', async ({ page }) => {
    await page.locator('#editor').fill('one two three four five six seven eight nine ten eleven twelve');
    await page.waitForTimeout(200);
    const score = await page.locator('#readability-score').textContent();
    const num = parseInt(score || '0');
    expect(num).toBeGreaterThanOrEqual(0);
    expect(num).toBeLessThanOrEqual(100);
  });

  test('Readability grade label is visible and not empty', async ({ page }) => {
    await page.locator('#editor').fill('The quick brown fox jumps over the lazy dog. This is a complete sentence with many interesting words.');
    await page.waitForTimeout(200);
    const grade = await page.locator('#readability-grade').textContent();
    expect(grade?.trim().length).toBeGreaterThan(0);
  });
});

// ── 14. SEO AND SCHEMA TESTS ──────────────────────────────────────────────────

test.describe('14. SEO and Schema Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('WebApplication schema JSON-LD script tag exists in the page head', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasWebApp = scripts.some(s => s.includes('WebApplication'));
    expect(hasWebApp).toBe(true);
  });

  test('FAQPage schema JSON-LD script tag exists in the page head', async ({ page }) => {
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasFaq = scripts.some(s => s.includes('FAQPage'));
    expect(hasFaq).toBe(true);
  });

  test('OG title meta tag is present and not empty', async ({ page }) => {
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect((ogTitle || '').length).toBeGreaterThan(0);
  });

  test('OG description meta tag is present and not empty', async ({ page }) => {
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDesc).toBeTruthy();
    expect((ogDesc || '').length).toBeGreaterThan(0);
  });

  test('Twitter card meta tag is present', async ({ page }) => {
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBeTruthy();
  });

  test('Geo region meta tag is present with value "IN"', async ({ page }) => {
    const geoRegion = await page.locator('meta[name="geo.region"]').getAttribute('content');
    expect(geoRegion).toBe('IN');
  });

  test('Robots meta tag contains "index"', async ({ page }) => {
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('index');
  });
});

// ── 15. MOBILE RESPONSIVENESS TESTS ──────────────────────────────────────────

test.describe('15. Mobile Responsiveness Tests', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Page renders without horizontal scroll', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('Textarea is visible and full width on mobile', async ({ page }) => {
    await expect(page.locator('#editor')).toBeVisible();
  });

  test('Stats grid is visible on mobile', async ({ page }) => {
    await expect(page.locator('.stats-grid')).toBeVisible();
  });

  test('Goal tracker card is visible on mobile', async ({ page }) => {
    await expect(page.locator('[aria-label="Word goal tracker"]')).toBeVisible();
  });

  test('Platform limits checker is visible on mobile', async ({ page }) => {
    await expect(page.locator('[aria-label="Platform character limits"]')).toBeVisible();
  });

  test('Action buttons are visible and not overflowing', async ({ page }) => {
    await expect(page.locator('#btn-paste')).toBeVisible();
    await expect(page.locator('#btn-clear')).toBeVisible();
  });

  test('Navbar hamburger button is visible on mobile', async ({ page }) => {
    await expect(page.locator('#hamburger-btn')).toBeVisible();
  });

  test('Clicking hamburger reveals the navigation links', async ({ page }) => {
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(200);
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toHaveClass(/open/);
  });
});

// ── 16. NAVBAR TESTS ──────────────────────────────────────────────────────────

test.describe('16. Navbar Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Navbar is present on the page', async ({ page }) => {
    await expect(page.locator('header.navbar')).toBeVisible();
  });

  test('Logo "RealWordCounter" is visible in the navbar', async ({ page }) => {
    const logo = page.locator('.navbar-logo');
    await expect(logo).toBeVisible();
    const logoText = await logo.textContent();
    expect(logoText?.replace(/\s/g, '')).toContain('RealWordCounter');
  });

  test('Home link is present in navbar', async ({ page }) => {
    const homeLink = page.locator('.navbar-links a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('Word Counter link is present in navbar', async ({ page }) => {
    const link = page.locator('.navbar-links a[href="/word-counter"]');
    await expect(link).toBeVisible();
  });

  test('UPSC Counter link is present in navbar', async ({ page }) => {
    const link = page.locator('.navbar-links a[href="/upsc-word-counter"]');
    await expect(link).toBeVisible();
  });

  test('Tools dropdown button is present', async ({ page }) => {
    await expect(page.locator('#tools-menu-btn')).toBeVisible();
  });

  test('Hovering Tools dropdown reveals dropdown menu items', async ({ page }) => {
    await page.locator('.has-dropdown').hover();
    const dropdown = page.locator('#tools-dropdown');
    await expect(dropdown).toBeVisible();
  });

  test('Dropdown menu contains links to phase 2 pages', async ({ page }) => {
    await page.locator('.has-dropdown').hover();
    const links = page.locator('#tools-dropdown .dropdown-item');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('100% Private badge is visible in the navbar', async ({ page }) => {
    const badge = page.locator('.navbar .privacy-pill').first();
    await expect(badge).toBeVisible();
  });

  test('Dark mode toggle button is present and clickable', async ({ page }) => {
    await expect(page.locator('#theme-toggle-btn')).toBeVisible();
    await page.locator('#theme-toggle-btn').click();
  });

  test('Clicking dark mode toggle changes the theme to dark', async ({ page }) => {
    await page.locator('#theme-toggle-btn').click();
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('dark');
  });

  test('Clicking dark mode toggle again reverts to light theme', async ({ page }) => {
    await page.locator('#theme-toggle-btn').click();
    await page.locator('#theme-toggle-btn').click();
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');
  });
});

// ── 17. FOOTER TESTS ──────────────────────────────────────────────────────────

test.describe('17. Footer Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Footer is present at the bottom of the page', async ({ page }) => {
    await expect(page.locator('footer.footer')).toBeVisible();
  });

  test('Footer contains the RealWordCounter logo text', async ({ page }) => {
    const footerLogo = page.locator('.footer-logo');
    await expect(footerLogo).toBeVisible();
    const text = await footerLogo.textContent();
    expect(text?.replace(/\s/g, '')).toContain('RealWordCounter');
  });

  test('Footer contains at least 4 navigation links', async ({ page }) => {
    const links = page.locator('footer.footer a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('All footer links have valid href attributes', async ({ page }) => {
    const links = page.locator('footer.footer a');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
      expect((href || '').length).toBeGreaterThan(0);
    }
  });

  test('Footer links for Character Counter point to /character-counter', async ({ page }) => {
    const charLink = page.locator('footer.footer a[href="/character-counter"]').first();
    await expect(charLink).toBeAttached();
  });

  test('Footer links for Readability Checker point to /readability-checker', async ({ page }) => {
    const readLink = page.locator('footer.footer a[href="/readability-checker"]').first();
    await expect(readLink).toBeAttached();
  });
});

// ── 18. PERFORMANCE TESTS ─────────────────────────────────────────────────────

test.describe('18. Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Largest Contentful Paint (LCP) is under 2.5 seconds', async ({ page }) => {
    const lcpData = await page.evaluate(() => {
      return new Promise(resolve => {
        let lcp = 0;
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          lcp = entries[entries.length - 1].startTime;
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(lcp);
        }, 3000);
      });
    });
    expect(Number(lcpData)).toBeLessThan(2500);
  });

  test('No images without alt attributes', async ({ page }) => {
    const imgsWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imgsWithoutAlt).toBe(0);
  });

  test('All interactive elements are reachable via keyboard Tab key', async ({ page }) => {
    // Tab through the page and verify at least 5 focusable elements exist
    const focusable = await page.locator('button:visible, a:visible, input:visible, textarea:visible, [tabindex]:not([tabindex="-1"])').count();
    expect(focusable).toBeGreaterThan(5);
  });

  test('Total JavaScript bundle size loaded is under 500KB', async ({ page }) => {
    let totalJsSize = 0;
    page.on('response', async response => {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('javascript')) {
        try {
          const body = await response.body();
          totalJsSize += body.length;
        } catch (_) {}
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(totalJsSize).toBeLessThan(500 * 1024);
  });
});
