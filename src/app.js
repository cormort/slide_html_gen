// ==========================================
// Markdown 投影片生成器 - 主程式
// ==========================================

(function() {
    'use strict';

    // ----------------------
    // 常數與配置
    // ----------------------
    const CONFIG = {
        ANIMATION_TYPES: ['fade', 'slide', 'zoom'],
        ALIGNMENT_TYPES: ['left', 'center', 'right'],
        DEFAULT_THEME: 'modern-blue',
        EXPORT_DEFAULTS: { h1: '3.5', h2: '2.5', p: '1.3' }
    };

    const I18N = {
        TOAST_LOADED: '範例內容已載入！',
        TOAST_EXPORTED: '已匯出 HTML 檔案',
        TOAST_FULLSCREEN: '全螢幕模式已啟用',
        TOAST_EXIT_FULLSCREEN: '已退出全螢幕',
        ERROR_NO_CONTENT: '請先輸入 Markdown 內容！',
        PLACEHOLDER_TITLE: '我的簡報標題',
        WELCOME_TITLE: '👋 歡迎使用投影片生成器',
        WELCOME_MESSAGE: '請在左側輸入 Markdown 內容或載入範例'
    };

    // ----------------------
    // 主題配置
    // ----------------------
    const THEMES = {
        'modern-blue':   { primary: '#1e40af', accent: '#3b82f6', background: '#f0f9ff' },
        'warm-sunset':   { primary: '#ea580c', accent: '#f97316', background: '#fff7ed' },
        'forest-green':  { primary: '#15803d', accent: '#22c55e', background: '#f0fdf4' },
        'purple-dream':  { primary: '#6d28d9', accent: '#a855f7', background: '#faf5ff' },
        'dark-mode':     { primary: '#1f2937', accent: '#60a5fa', background: '#111827', textColor: '#f3f4f6' },
        'aqua-fresh':    { primary: '#0891b2', accent: '#22d3ee', background: '#f8fafc' },
        'crimson-focus': { primary: '#dc2626', accent: '#f87171', background: '#1f2937', textColor: '#f9fafb' },
        'sand-classic':  { primary: '#a16207', accent: '#ca8a04', background: '#fefce8' },
        'teal-minimal':  { primary: '#0d9488', accent: '#2dd4bf', background: '#f0fdfa' },
        'amber-night':   { primary: '#d97706', accent: '#f59e0b', background: '#1f2937', textColor: '#f9fafb' }
    };

    // ----------------------
    // 範例 Markdown
    // ----------------------
    const EXAMPLE_MARKDOWN = `# 我的簡報標題

歡迎使用 Markdown 投影片生成器！

---

## 主要功能

- 輕鬆用 Markdown 寫投影片
- 多種主題配色可選
- 可自訂預覽和匯出樣式

---

## 如何使用

1. 在左側編輯器輸入內容
2. 使用 \`- - -\` 分隔每一頁投影片
3. 在右側調整樣式和設定
4. 完成後即可匯出或全螢幕播放！

**就是這麼簡單！**`;

    // ----------------------
    // 狀態管理
    // ----------------------
    const State = {
        slides: [],
        currentSlide: 0,
        currentTheme: { ...THEMES['modern-blue'], name: 'modern-blue' },
        animation: 'fade',
        alignment: 'left',
        titleAlignment: 'left',
        backgroundStyle: 'solid'
    };

    // ----------------------
    // DOM 元素快取
    // ----------------------
    const DOM = {};

    function initDOM() {
        DOM.markdownInput = document.getElementById('markdownInput');
        DOM.slideContainer = document.getElementById('slideContainer');
        DOM.thumbnailBar = document.getElementById('thumbnailBar');
        DOM.prevBtn = document.getElementById('prevBtn');
        DOM.nextBtn = document.getElementById('nextBtn');
        DOM.slideCounter = document.getElementById('slideCounter');
        DOM.progressBar = document.getElementById('progressBar');
        DOM.themeSelector = document.getElementById('themeSelector');
        DOM.toastContainer = document.getElementById('toastContainer');
    }

    // ----------------------
    // 工具函式
    // ----------------------
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        DOM.toastContainer.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatInline(text) {
        text = escapeHtml(text);
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return text;
    }

    function validateFontSize(value, defaultValue) {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0.5 || num > 10) return defaultValue;
        return value;
    }

    // ----------------------
    // Markdown 解析器
    // ----------------------
    function parseMarkdown(markdown) {
        if (!markdown || !markdown.trim()) return [];

        try {
            const slideTexts = markdown.split(/---+/).filter(s => s.trim());
            
            return slideTexts.map((text, index) => {
                const lines = text.trim().split('\n');
                let content = '';
                let inList = false;
                let listType = '';
        
                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return;
                    
                    if (trimmedLine.startsWith('### ')) {
                        if (inList) { 
                            content += (listType === 'ul') ? '</ul>' : '</ol>'; 
                            inList = false; 
                        }
                        content += `<h3>${escapeHtml(trimmedLine.substring(4))}</h3>`;
                    } else if (trimmedLine.startsWith('## ')) {
                        if (inList) { 
                            content += (listType === 'ul') ? '</ul>' : '</ol>'; 
                            inList = false; 
                        }
                        content += `<h2>${escapeHtml(trimmedLine.substring(3))}</h2>`;
                    } else if (trimmedLine.startsWith('# ')) {
                        if (inList) { 
                            content += (listType === 'ul') ? '</ul>' : '</ol>'; 
                            inList = false; 
                        }
                        content += `<h1>${escapeHtml(trimmedLine.substring(2))}</h1>`;
                    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                        if (!inList || listType !== 'ul') {
                            if (inList) content += '</ol>';
                            content += '<ul>';
                            inList = true;
                            listType = 'ul';
                        }
                        content += `<li>${formatInline(trimmedLine.substring(2))}</li>`;
                    } else if (/^\d+\.\s/.test(trimmedLine)) {
                        if (!inList || listType !== 'ol') {
                            if (inList) content += '</ul>';
                            content += '<ol>';
                            inList = true;
                            listType = 'ol';
                        }
                        content += `<li>${formatInline(trimmedLine.replace(/^\d+\.\s/, ''))}</li>`;
                    } else {
                        if (inList) { 
                            content += (listType === 'ul') ? '</ul>' : '</ol>'; 
                            inList = false; 
                        }
                        content += `<p>${formatInline(trimmedLine)}</p>`;
                    }
                });
                
                if (inList) {
                    content += (listType === 'ul') ? '</ul>' : '</ol>';
                }
                return { content };
            });
        } catch (error) {
            console.error('Markdown parse error:', error);
            return [];
        }
    }

    // ----------------------
    // 投影片渲染
    // ----------------------
    function renderSlides() {
        const { slideContainer, thumbnailBar } = DOM;
        slideContainer.innerHTML = '';
        thumbnailBar.innerHTML = '';
        
        if (State.slides.length === 0) {
            slideContainer.innerHTML = `
                <div class="slide active" id="emptySlide" style="justify-content: center; padding-top: 0;">
                    <div class="empty-slide-content">
                        <h2>${I18N.WELCOME_TITLE}</h2>
                        <p style="margin-top: 20px;">${I18N.WELCOME_MESSAGE}</p>
                    </div>
                </div>
            `;
            thumbnailBar.style.display = 'none';
            updateNavigation();
            applyTheme();
            return;
        }
        
        thumbnailBar.style.display = 'flex';
        
        State.slides.forEach((slide, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = `slide ${index === State.currentSlide ? 'active' : ''} ${index === State.currentSlide ? State.animation + '-enter' : ''}`;
            slideDiv.innerHTML = slide.content + `<div class="slide-number">${index + 1} / ${State.slides.length}</div>`;
            slideContainer.appendChild(slideDiv);

            const thumbDiv = document.createElement('div');
            thumbDiv.className = `thumbnail-item ${index === State.currentSlide ? 'active' : ''}`;
            thumbDiv.innerHTML = slide.content;
            thumbDiv.addEventListener('click', () => changeSlide(index));
            thumbnailBar.appendChild(thumbDiv);
        });

        updateNavigation();
        applyTheme();
    }

    function applyTheme() {
        const { slideContainer } = DOM;
        const slideElements = slideContainer.querySelectorAll('.slide:not(#emptySlide)');
        const textColor = State.currentTheme.textColor || '#1f2937';
        
        slideElements.forEach(slide => {
            slide.style.color = textColor;
            slide.querySelectorAll('h1').forEach(h => h.style.color = State.currentTheme.primary);
            slide.querySelectorAll('h2, h3').forEach(h => h.style.color = State.currentTheme.accent);
        });

        slideContainer.style.background = State.backgroundStyle === 'gradient' 
            ? `linear-gradient(135deg, ${State.currentTheme.background} 0%, ${State.currentTheme.accent}22 100%)`
            : State.currentTheme.background;
    }

    function applyPreviewSettings() {
        const slideElements = DOM.slideContainer.querySelectorAll('.slide:not(#emptySlide)');
        
        slideElements.forEach(slide => {
            slide.style.textAlign = State.alignment;
            slide.querySelectorAll('h1, h2, h3').forEach(h => h.style.textAlign = State.titleAlignment);
        });
    }

    // ----------------------
    // 導航控制
    // ----------------------
    function nextSlide() {
        if (State.currentSlide < State.slides.length - 1) {
            changeSlide(State.currentSlide + 1);
        }
    }

    function previousSlide() {
        if (State.currentSlide > 0) {
            changeSlide(State.currentSlide - 1);
        }
    }

    function changeSlide(newIndex) {
        const slideElements = DOM.slideContainer.querySelectorAll('.slide');
        const thumbElements = DOM.thumbnailBar.querySelectorAll('.thumbnail-item');
        
        if (newIndex < 0 || newIndex >= slideElements.length) return;

        State.currentSlide = newIndex;

        slideElements.forEach((slide, index) => {
            slide.classList.remove('active', 'fade-enter', 'slide-enter', 'zoom-enter');
            if (index === newIndex) {
                slide.classList.add('active', `${State.animation}-enter`);
            }
        });

        thumbElements.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === newIndex);
        });

        updateNavigation();
        updateProgressBar();
    }

    function updateNavigation() {
        const { prevBtn, nextBtn, slideCounter } = DOM;
        const total = State.slides.length;
        
        prevBtn.disabled = State.currentSlide === 0;
        nextBtn.disabled = State.currentSlide === total - 1;
        
        if (total > 0) {
            slideCounter.textContent = `${State.currentSlide + 1} / ${total}`;
        } else {
            slideCounter.textContent = '0 / 0';
        }
    }

    function updateProgressBar() {
        const { progressBar } = DOM;
        const total = State.slides.length;
        
        if (total > 0) {
            const progress = ((State.currentSlide + 1) / total) * 100;
            progressBar.style.width = `${progress}%`;
        } else {
            progressBar.style.width = '0%';
        }
    }

    // ----------------------
    // 匯出功能
    // ----------------------
    function exportToHTML() {
        if (State.slides.length === 0) {
            alert(I18N.ERROR_NO_CONTENT);
            return;
        }

        let fileName = 'presentation.html';
        if (State.slides.length > 0) {
            const firstSlideContent = State.slides[0].content;
            const titleMatch = firstSlideContent.match(/<h1>(.*?)<\/h1>/i);
            if (titleMatch && titleMatch[1]) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = titleMatch[1];
                let cleanTitle = (tempDiv.textContent || tempDiv.innerText || '').trim();
                cleanTitle = cleanTitle.replace(/[<>:"/\\|?*]+/g, '_');
                if (cleanTitle) {
                    fileName = `${cleanTitle}.html`;
                }
            }
        }
        
        const exportH1 = validateFontSize(document.getElementById('exportH1Size')?.value, CONFIG.EXPORT_DEFAULTS.h1);
        const exportH2 = validateFontSize(document.getElementById('exportH2Size')?.value, CONFIG.EXPORT_DEFAULTS.h2);
        const exportP = validateFontSize(document.getElementById('exportPSize')?.value, CONFIG.EXPORT_DEFAULTS.p);
        const exportH3 = (parseFloat(exportH2) * 0.72).toFixed(2);
        
        const htmlContent = generateExportHTML(exportH1, exportH2, exportH3, exportP);
        downloadFile(fileName, htmlContent);
        showToast(I18N.TOAST_EXPORTED);
    }

    function generateExportHTML(h1Size, h2Size, h3Size, pSize) {
        const bgStyle = State.backgroundStyle === 'gradient'
            ? `linear-gradient(135deg, ${State.currentTheme.background} 0%, ${State.currentTheme.accent}22 100%)`
            : State.currentTheme.background;
        
        return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的簡報</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
        .slide-container { width: 100vw; height: 100vh; display: flex; align-items: flex-start; justify-content: center; background: ${bgStyle}; padding: 40px; }
        .slide { width: 100%; max-width: 1400px; height: 100%; max-height: 800px; padding: 80px 120px; display: none; flex-direction: column; justify-content: flex-start; font-size: 16px; text-align: ${State.alignment}; color: ${State.currentTheme.textColor || '#1f2937'}; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); overflow-y: auto; }
        .slide.active { display: flex; }
        .slide.fade-enter { animation: fadeIn 0.5s ease-in-out; }
        .slide.slide-enter { animation: slideIn 0.5s ease-in-out; }
        .slide.zoom-enter { animation: zoomIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        h1 { font-size: ${h1Size}em; color: ${State.currentTheme.primary}; margin-bottom: 40px; margin-top: 0; line-height: 1.2; font-weight: 600; text-align: ${State.titleAlignment}; }
        h2 { font-size: ${h2Size}em; color: ${State.currentTheme.accent}; margin-bottom: 35px; margin-top: 0; line-height: 1.2; font-weight: 600; text-align: ${State.titleAlignment}; }
        h3 { font-size: ${h3Size}em; color: ${State.currentTheme.accent}; margin-bottom: 20px; margin-top: 24px; font-weight: 600; text-align: ${State.titleAlignment}; }
        p { font-size: ${pSize}em; line-height: 1.7; margin-bottom: 20px; }
        ul, ol { margin-left: 40px; margin-bottom: 25px; }
        li { font-size: ${pSize}em; line-height: 1.9; margin-bottom: 15px; }
        strong { font-weight: 600; }
        .nav { position: fixed; bottom: 30px; right: 30px; z-index: 100; display: flex; align-items: center; gap: 15px; background: rgba(255, 255, 255, 0.95); padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); }
        button { padding: 12px 24px; cursor: pointer; border: none; border-radius: 8px; background: #f3f4f6; color: #1f2937; font-weight: 500; font-size: 14px; transition: background 0.2s; }
        button:hover { background: #e5e7eb; }
        .slide-num { position: fixed; bottom: 30px; left: 30px; color: #9ca3af; font-size: 14px; }
    </style>
</head>
<body>
    <div class="slide-container">
        ${State.slides.map((slide, i) => `
        <div class="slide ${i === 0 ? 'active' : ''} ${State.animation}-enter">
            ${slide.content}
            <div class="slide-num">${i + 1} / ${State.slides.length}</div>
        </div>`).join('')}
    </div>
    <div class="nav">
        <button onclick="prev()">← 上一頁</button>
        <button onclick="next()">下一頁 →</button>
        <button onclick="toggleFullscreen()">全螢幕</button>
    </div>
    <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const animation = "${State.animation}";
        
        function updateButtons() {
            document.querySelectorAll('.nav button')[0].disabled = currentSlide === 0;
            document.querySelectorAll('.nav button')[1].disabled = currentSlide === slides.length - 1;
        }
        
        function show(n) {
            slides.forEach(s => s.classList.remove('active', animation + '-enter'));
            slides[currentSlide].classList.add('active', animation + '-enter');
            document.getElementById('current-page').textContent = (currentSlide + 1) + ' / ' + slides.length;
            updateButtons();
        }
        
        function next() { if (currentSlide < slides.length - 1) { currentSlide++; show(currentSlide); } }
        function prev() { if (currentSlide > 0) { currentSlide--; show(currentSlide); } }
        
        function toggleFullscreen() {
            if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); }
            else { document.exitFullscreen(); }
        }
        
        document.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight' || e.key === ' ') next();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
        });
        
        updateButtons();
    <\/script>
</body>
</html>`;
    }

    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ----------------------
    // 全螢幕播放
    // ----------------------
    function toggleFullscreen() {
        const container = document.querySelector('.slide-container');
        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => showToast(I18N.TOAST_FULLSCREEN));
        } else {
            document.exitFullscreen().then(() => showToast(I18N.TOAST_EXIT_FULLSCREEN));
        }
    }

    function setupPresentationMode() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
            if (e.key === 'ArrowLeft') previousSlide();
            if (e.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen();
            }
        });
    }

    // ----------------------
    // 主題管理
    // ----------------------
    function setupThemeSelector() {
        const options = DOM.themeSelector.querySelectorAll('.theme-option');
        
        options.forEach(option => {
            option.addEventListener('click', function() {
                const themeName = this.dataset.theme;
                const theme = THEMES[themeName];
                
                if (theme) {
                    State.currentTheme = { ...theme, name: themeName };
                    
                    options.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    
                    applyTheme();
                }
            });
        });
    }

    // ----------------------
    // 事件綁定
    // ----------------------
    function bindEvents() {
        // Markdown 輸入
        DOM.markdownInput?.addEventListener('input', (e) => {
            State.slides = parseMarkdown(e.target.value);
            State.currentSlide = 0;
            renderSlides();
        });

        // 導航按鈕
        DOM.prevBtn?.addEventListener('click', previousSlide);
        DOM.nextBtn?.addEventListener('click', nextSlide);

        // 匯出按鈕
        document.getElementById('exportBtn')?.addEventListener('click', exportToHTML);

        // 全螢幕按鈕
        document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);

        // 範例載入
        document.getElementById('loadExampleBtn')?.addEventListener('click', () => {
            DOM.markdownInput.value = EXAMPLE_MARKDOWN;
            DOM.markdownInput.dispatchEvent(new Event('input', { bubbles: true }));
            showToast(I18N.TOAST_LOADED);
        });

        // 插入分頁符
        document.getElementById('insertPageBreakBtn')?.addEventListener('click', () => {
            const input = DOM.markdownInput;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const text = input.value;
            
            const before = text.substring(0, start);
            const after = text.substring(end);
            
            const needsNewlineBefore = !before.endsWith('\n') && before.length > 0;
            const needsNewlineAfter = !after.startsWith('\n') && after.length > 0;
            
            const separator = (needsNewlineBefore ? '\n' : '') + '---' + (needsNewlineAfter ? '\n' : '');
            
            input.value = before + separator + after;
            
            const newPos = start + separator.length;
            input.setSelectionRange(newPos, newPos);
            input.focus();
            
            input.dispatchEvent(new Event('input', { bubbles: true }));
            showToast('已插入分頁符');
        });

        // 動畫選擇
        document.getElementById('animationSelect')?.addEventListener('change', (e) => {
            State.animation = e.target.value;
            renderSlides();
        });

        // 對齊選擇
        document.getElementById('alignmentSelect')?.addEventListener('change', (e) => {
            State.alignment = e.target.value;
            applyPreviewSettings();
        });

        // 標題對齊選擇
        document.getElementById('titleAlignmentSelect')?.addEventListener('change', (e) => {
            State.titleAlignment = e.target.value;
            applyPreviewSettings();
        });

        // 背景樣式
        document.getElementById('backgroundStyleSelect')?.addEventListener('change', (e) => {
            State.backgroundStyle = e.target.value;
            applyTheme();
        });

        // 預覽設定變更
        ['exportH1Size', 'exportH2Size', 'exportPSize'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', applyPreviewSettings);
        });
    }

    // ----------------------
    // 初始化
    // ----------------------
    function init() {
        initDOM();
        bindEvents();
        setupThemeSelector();
        setupPresentationMode();
        
        // 載入範例
        DOM.markdownInput.value = EXAMPLE_MARKDOWN;
        State.slides = parseMarkdown(EXAMPLE_MARKDOWN);
        renderSlides();
    }

    // 啟動
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();