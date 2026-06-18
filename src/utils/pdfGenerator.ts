import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- HEX-ONLY COLOR CONVERSION UTILITIES ---
// Converts modern CSS colors (oklch, oklab, lab, lch) and standard transparency (rgba, rgb) 
// to solid standard Hex format (#RRGGBB) to ensure maximum compatibility with canvas tools.

function oklabToHex(l: number, a_: number, b_: number, alpha: number = 1): string {
  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541167 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;
  
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  const r_lum = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g_lum = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_lum = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076034107 * s3;
  
  const fn = (x: number) => {
    if (x <= 0.0031308) return 12.92 * x;
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  
  let r = Math.round(Math.max(0, Math.min(1, fn(r_lum))) * 255);
  let g = Math.round(Math.max(0, Math.min(1, fn(g_lum))) * 255);
  let b = Math.round(Math.max(0, Math.min(1, fn(b_lum))) * 255);
  
  // Blend transparent backgrounds on absolute white page canvas (#FFFFFF)
  if (alpha < 1) {
    r = Math.round((1 - alpha) * 255 + alpha * r);
    g = Math.round((1 - alpha) * 255 + alpha * g);
    b = Math.round((1 - alpha) * 255 + alpha * b);
  }
  
  const toHexStr = (val: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(val)));
    const h = clamped.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  
  return `#${toHexStr(r)}${toHexStr(g)}${toHexStr(b)}`.toUpperCase();
}

function oklchToHex(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);
  return oklabToHex(l, a_, b_, a);
}

function parseAndConvertColorToHex(val: string): string {
  if (typeof val !== 'string') return '#FFFFFF';
  
  const cleanVal = val.trim();
  const lower = cleanVal.toLowerCase();
  
  // Helper to convert rgb/rgba coordinates to classic solid `#RRGGBB` format.
  const rgbOrRgbaToHex = (r: number, g: number, b: number, a: number = 1): string => {
    let finalR = r;
    let finalG = g;
    let finalB = b;
    if (a < 1) {
      // Composition with absolute white
      finalR = (1 - a) * 255 + a * finalR;
      finalG = (1 - a) * 255 + a * finalG;
      finalB = (1 - a) * 255 + a * finalB;
    }
    const toHexStr = (val: number) => {
      const clamped = Math.max(0, Math.min(255, Math.round(val)));
      const h = clamped.toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${toHexStr(finalR)}${toHexStr(finalG)}${toHexStr(finalB)}`.toUpperCase();
  };

  // Convert modern OKLCH format
  if (lower.includes('oklch')) {
    const oklchMatch = cleanVal.match(/oklch\s*\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i) ||
                       cleanVal.match(/oklch\s*\(\s*([\d.%]+)\s*,\s*([\d.%]+)\s*,\s*([\d.%]+)(?:\s*,\s*([\d.%]+))?\s*\)/i);
    if (oklchMatch) {
      const lStr = oklchMatch[1];
      const cStr = oklchMatch[2];
      const hStr = oklchMatch[3];
      const aStr = oklchMatch[4] || '1';
      
      const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
      const h = parseFloat(hStr);
      const a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
      
      return oklchToHex(l, c, h, a);
    }
  }
  
  // Convert modern OKLAB format
  if (lower.includes('oklab')) {
    const oklabMatch = cleanVal.match(/oklab\s*\(\s*([\d.%]+)\s+([\d.%-]+)\s+([\d.%-]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i) ||
                       cleanVal.match(/oklab\s*\(\s*([\d.%]+)\s*,\s*([\d.%-]+)\s*,\s*([\d.%-]+)(?:\s*,\s*([\d.%]+))?\s*\)/i);
    if (oklabMatch) {
      const l = oklabMatch[1].endsWith('%') ? parseFloat(oklabMatch[1]) / 100 : parseFloat(oklabMatch[1]);
      const a_ = parseFloat(oklabMatch[2]);
      const b_ = parseFloat(oklabMatch[3]);
      const alpha = oklabMatch[4] ? (oklabMatch[4].endsWith('%') ? parseFloat(oklabMatch[4]) / 100 : parseFloat(oklabMatch[4])) : 1;
      
      return oklabToHex(l, a_, b_, alpha);
    }
  }

  // Convert standard LCH format
  if (lower.includes('lch(')) {
    const lchMatch = cleanVal.match(/lch\s*\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
    if (lchMatch) {
      const l = parseFloat(lchMatch[1]);
      const c = parseFloat(lchMatch[2]);
      const h = parseFloat(lchMatch[3]);
      return oklchToHex(l / 100, (c / 150) * 0.4, h, lchMatch[4] ? parseFloat(lchMatch[4]) : 1);
    }
  }
  
  // Convert standard LAB format
  if (lower.includes('lab(')) {
    const labMatch = cleanVal.match(/lab\s*\(\s*([\d.%]+)\s+([\d.%-]+)\s+([\d.%-]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
    if (labMatch) {
      const l = parseFloat(labMatch[1]);
      const a_ = parseFloat(labMatch[2]);
      const b_ = parseFloat(labMatch[3]);
      return oklabToHex(l / 100, a_ / 100, b_ / 100, labMatch[4] ? parseFloat(labMatch[4]) : 1);
    }
  }

  // Convert Color() format
  if (lower.includes('color(')) {
    const numMatch = cleanVal.match(/[\d.]+/g);
    if (numMatch && numMatch.length >= 3) {
      const r = parseFloat(numMatch[0]) * 255;
      const g = parseFloat(numMatch[1]) * 255;
      const b = parseFloat(numMatch[2]) * 255;
      const a = numMatch[3] ? parseFloat(numMatch[3]) : 1;
      return rgbOrRgbaToHex(r, g, b, a);
    }
  }

  // Convert standard rgb and rgba to physical HEX colors
  if (lower.includes('rgb(') || lower.includes('rgba(')) {
    const rgbaMatch = cleanVal.match(/rgba?\s*\(\s*(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*(?:,\s*|\/\s*)\s*([\d.%]+))?\s*\)/i);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      let a = 1;
      if (rgbaMatch[4]) {
        a = rgbaMatch[4].endsWith('%') ? parseFloat(rgbaMatch[4]) / 100 : parseFloat(rgbaMatch[4]);
      }
      return rgbOrRgbaToHex(r, g, b, a);
    }
  }

  // Convert Color Mix to hex
  if (lower.includes('color-mix')) {
    if (lower.includes('blue')) return '#3B82F6';
    if (lower.includes('emerald') || lower.includes('green')) return '#10B981';
    if (lower.includes('red') || lower.includes('rose')) return '#EF4444';
    if (lower.includes('white')) return '#FFFFFF';
    if (lower.includes('slate') || lower.includes('gray')) return '#F1F5F9';
    return '#94A6B8';
  }

  // Simple HTML word colors
  if (lower === 'transparent') {
    return '#FFFFFF';
  }
  if (lower === 'white') return '#FFFFFF';
  if (lower === 'black') return '#000000';
  if (lower === 'blue') return '#3B82F6';

  // Standard Hex conversion fallback if it is a short hex like #fff
  if (cleanVal.startsWith('#')) {
    if (cleanVal.length === 4) {
      const r = cleanVal[1];
      const g = cleanVal[2];
      const b = cleanVal[3];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return cleanVal.toUpperCase();
  }

  // Default fallback safe gray
  return '#94A6B8';
}

// --- CORE ROBUST VALIDATION LAYERS ---

/**
 * Rigorously validates a base64 Data URL to ensure it represents a solid, non-corrupted 
 * image file with proper header signature matches (e.g. rejecting SVGs or empty strings).
 */
export function isValidBase64Image(dataUrl: string | null | undefined, expectedFormat?: 'PNG' | 'JPEG'): boolean {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return false;
  }

  // 1. Regular expression to check standard base64 structure and mime groups
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    return false;
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2].replace(/\s/g, ''); // strip any formatting whitespace

  if (base64Data.length === 0) {
    return false;
  }

  // Check expected mime type if a restriction was requested
  if (expectedFormat) {
    if (expectedFormat === 'PNG' && mimeType !== 'png') return false;
    if (expectedFormat === 'JPEG' && (mimeType !== 'jpeg' && mimeType !== 'jpg')) return false;
  }

  // 2. Format magic numbers signature check (Base64 Byte Decoding Probe)
  try {
    // Base64 string length should be a multiple of 4
    if (base64Data.length % 4 !== 0) {
      return false;
    }
    // Check for invalid Base64 characters
    if (/[^A-Za-z0-9+/=]/.test(base64Data)) {
      return false;
    }

    // Capture first 16 characters which is 12 bytes decoded (plenty for header confirmation)
    const prefixBase64 = base64Data.substring(0, 16);
    const decodedPrefix = atob(prefixBase64);

    if (mimeType === 'png') {
      // PNG magic bytes signature: \x89 P N G \r \n \x1a \n
      const isPng = decodedPrefix.charCodeAt(0) === 0x89 &&
                    decodedPrefix.charCodeAt(1) === 0x50 && // 'P'
                    decodedPrefix.charCodeAt(2) === 0x4e && // 'N'
                    decodedPrefix.charCodeAt(3) === 0x47;   // 'G'
      if (!isPng) {
        console.warn('[PDF Service Validation] Rejected image: MIME claims PNG but physical byte signature is invalid.');
        return false;
      }
    } else if (mimeType === 'jpeg' || mimeType === 'jpg') {
      // JPEG magic bytes signature: \xFF \xD8
      const isJpeg = decodedPrefix.charCodeAt(0) === 0xFF &&
                     decodedPrefix.charCodeAt(1) === 0xD8;
      if (!isJpeg) {
        console.warn('[PDF Service Validation] Rejected image: MIME claims JPEG but physical byte signature is invalid.');
        return false;
      }
    }
  } catch (err) {
    console.warn('[PDF Service Validation] Error decoding base64 signature prefix:', err);
    return false;
  }

  return true;
}

/**
 * Ensures that a canvas exists, is a valid HTMLCanvasElement, and has both non-zero width and height.
 */
export function isValidCanvas(canvas: unknown): canvas is HTMLCanvasElement {
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    return false;
  }
  const width = canvas.width;
  const height = canvas.height;
  return (
    typeof width === 'number' && 
    !isNaN(width) && 
    isFinite(width) && 
    width > 0 &&
    typeof height === 'number' && 
    !isNaN(height) && 
    isFinite(height) && 
    height > 0
  );
}

/**
 * Extract image data URL from a rendering canvas, using JPEG format as fallback if PNG generation fails.
 * Fully compliant with task guidelines.
 */
export function extractAndValidateImageFromCanvas(canvas: HTMLCanvasElement): { imgData: string, format: 'PNG' | 'JPEG' } {
  if (!isValidCanvas(canvas)) {
    throw new Error('Canvas is invalid (dimension <= 0 or not an HTMLCanvasElement)');
  }

  // Try PNG first
  try {
    const pngData = canvas.toDataURL('image/png');
    if (isValidBase64Image(pngData, 'PNG')) {
      return { imgData: pngData, format: 'PNG' };
    }
    console.warn('[PDF Service Setup] PNG output failed signature validation. Trying JPEG fallback...');
  } catch (pngError) {
    console.warn('[PDF Service Setup] Canvas.toDataURL(image/png) threw error:', pngError);
  }

  // Fallback to JPEG
  try {
    const jpegData = canvas.toDataURL('image/jpeg', 0.95);
    if (isValidBase64Image(jpegData, 'JPEG')) {
      return { imgData: jpegData, format: 'JPEG' };
    }
    console.error('[PDF Service Setup] JPEG fallback also failed signature validation.');
  } catch (jpegError) {
    console.error('[PDF Service Setup] Canvas.toDataURL(image/jpeg) threw error:', jpegError);
  }

  throw new Error('All image capture methods and format fallbacks failed validation.');
}

// --- CORE ROBUST VALIDATION LAYERS & LAYOUT CLEANUP PRE-TAGGING ---

/**
 * Identifies and tags empty, hidden, or zero-dimension elements inside the physical DOM 
 * *before* cloning, to avoid querying offsetWidth/offsetHeight inside a detached cloned tree.
 */
function tagHiddenAndEmptyElements(rootEl: HTMLElement) {
  const elements = rootEl.getElementsByTagName('*');
  for (let j = 0; j < elements.length; j++) {
    const el = elements[j] as HTMLElement;
    if (!el) continue;

    // Check visibility via getComputedStyle
    let isHidden = false;
    let compStyle = null;
    try {
      compStyle = window.getComputedStyle(el);
    } catch (e) {}

    if (compStyle) {
      if (compStyle.display === 'none' || compStyle.visibility === 'hidden' || compStyle.opacity === '0') {
        isHidden = true;
      }
    }

    // Check size collapse in actual viewport
    const isSizeCollapsed = el.offsetWidth === 0 && el.offsetHeight === 0;
    
    // Check if the container is empty: ignoring whitespace/comments
    const isEmptyContent = el.innerHTML.trim() === '';

    // If it's physically hidden, or completely collapsed and holds no child content, tag it
    if (isHidden || (isSizeCollapsed && isEmptyContent)) {
      el.setAttribute('data-pdf-hidden', 'true');
    }
  }
}

/**
 * Clean up after rendering process completes to keep original DOM completely untouched.
 */
function untagHiddenAndEmptyElements(rootEl: HTMLElement) {
  const elements = rootEl.querySelectorAll('[data-pdf-hidden]');
  elements.forEach(el => el.removeAttribute('data-pdf-hidden'));
}

/**
 * Utility service to export DOM elements to clean, high-resolution PDF files.
 * Custom built for Church financial sheets (like "Relatório ao Presbitério").
 */
export async function generateHighFidelityPDF(
  elementId: string, 
  filename: string = 'relatorio_presbiterio'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[PDF Service] Element with ID "${elementId}" not found.`);
    return false;
  }

  // PREVENT RENDERING OF COLLAPSED OR HIDDEN ELEMENT AT SOURCE
  if (element.offsetWidth === 0 || element.offsetHeight === 0) {
    console.error('[PDF Service] Target container is collapsed, hidden or has 0 dimensions.');
    return false;
  }

  // Track the active Page IDs dynamically for onCloneHandler scoping
  let activePageTempId: string | null = null;

  try {
    // --- STEP 1: WAIT FOR ASYNC CONTENT LOADING (FONTS & IMAGES) ---
    // A: Wait for custom typography fonts to finish loading
    try {
      if (document.fonts && typeof document.fonts.ready !== 'undefined') {
        await document.fonts.ready;
      }
    } catch (e) {
      console.warn('[PDF Service] Error preloading fonts:', e);
    }

    // B: Validate nested image urls and preload them
    try {
      const images = Array.from(element.getElementsByTagName('img'));
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (!src || src.trim() === '' || src === 'null' || src === 'undefined') {
          console.warn('[PDF Service Validation] Hiding img element with empty/invalid source:', img);
          img.style.setProperty('display', 'none', 'important');
          img.setAttribute('data-pdf-hidden', 'true');
        }
      });

      await Promise.all(images.map(img => {
        if (img.getAttribute('data-pdf-hidden') === 'true') return Promise.resolve();
        if (img.complete) return Promise.resolve();
        return new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => {
            console.warn('[PDF Service Validation] Image failed to load, hiding to prevent canvas corruption:', img.src);
            img.style.setProperty('display', 'none', 'important');
            img.setAttribute('data-pdf-hidden', 'true');
            resolve();
          };
        });
      }));
    } catch (e) {
      console.warn('[PDF Service] Error preloading nested images:', e);
    }

    // C: Wait for layout, charts and animations to settle completely
    await new Promise((resolve) => setTimeout(resolve, 800));

    // --- STEP 2: CONVERT COLORS TO HEX & CLEAN ELEMENTS UP ---
    const onCloneHandler = (clonedDoc: Document) => {
      // 1: Create and inject custom style sheet to force finish SVG / Recharts curves & animations instantly
      try {
        const style = clonedDoc.createElement('style');
        style.innerHTML = `
          /* Snap animations and transitions to final completed state */
          *, *::before, *::after {
            animation-delay: 0s !important;
            animation-duration: 0s !important;
            animation-iteration-count: 1 !important;
            transition-delay: 0s !important;
            transition-duration: 0s !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }
          /* Ensure SVG paths inside recharts render completely */
          path.recharts-curve, 
          path.recharts-rectangle, 
          g.recharts-layer path, 
          .recharts-wrapper *,
          svg * {
            stroke-dasharray: none !important;
            transition: none !important;
            animation: none !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      } catch (err) {
        console.warn('[PDF Service] Error appending animation overrides to cloned document:', err);
      }

      // 2: Format cloned non-print elements while strictly preserving ancestors of the active page view
      try {
        const noPrintElements = clonedDoc.querySelectorAll('.no-print, button, BUTTON, select, SELECT, form, FORM');
        const activeClonedTarget = (activePageTempId && clonedDoc.getElementById(activePageTempId)) || 
                                   (elementId && clonedDoc.getElementById(elementId));

        noPrintElements.forEach(el => {
          if (el instanceof HTMLElement) {
            // CRITICAL: If this .no-print element contains the active cloned page, DO NOT hide it
            // doing so would set display:none on an ancestor and collapse the target drawing area!
            if (activeClonedTarget && el.contains(activeClonedTarget)) {
              el.style.setProperty('display', 'block', 'important');
              el.style.setProperty('visibility', 'visible', 'important');
              return;
            }
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
          }
        });
      } catch (e) {
        console.warn('[PDF Service] Error formatting cloned non-print elements:', e);
      }

      // 3: Apply solid-hex styles to modern oklch/rgba colors and parse special nodes
      try {
        const allCloneElements = clonedDoc.getElementsByTagName('*');
        for (let j = 0; j < allCloneElements.length; j++) {
          const el = allCloneElements[j] as HTMLElement;
          if (!el) continue;

          // Hide elements that were pre-tagged as empty, collapsed or hidden in active viewport
          if (el.getAttribute('data-pdf-hidden') === 'true') {
            el.style.setProperty('display', 'none', 'important');
            continue;
          }

          const tagName = el.tagName.toLowerCase();

          // REQUIREMENT 9: Replace unsupported iframe, embedded docs, objects with safe fallback UI
          if (tagName === 'iframe' || tagName === 'embed' || tagName === 'object') {
            const warningBlock = clonedDoc.createElement('div');
            warningBlock.className = 'p-3 bg-red-50 border border-red-250 text-red-800 text-[10px] font-mono rounded text-center my-2 uppercase';
            warningBlock.innerText = `[Elemento incorporado "${tagName}" omitido para preservação de PDF]`;
            el.parentNode?.replaceChild(warningBlock, el);
            continue;
          }

          // REQUIREMENT 4 & 9: Resolve SVGs, curves, and charts for compatibility
          if (tagName === 'svg') {
            const svgEl = el as unknown as SVGSVGElement;
            const w = svgEl.clientWidth || svgEl.getBoundingClientRect().width || parseInt(svgEl.getAttribute('width') || '0', 10);
            const h = svgEl.clientHeight || svgEl.getBoundingClientRect().height || parseInt(svgEl.getAttribute('height') || '0', 10);
            
            if (w > 0) {
              svgEl.setAttribute('width', String(w));
              svgEl.style.width = `${w}px`;
            } else {
              svgEl.setAttribute('width', '200');
              svgEl.style.width = '200px';
            }

            if (h > 0) {
              svgEl.setAttribute('height', String(h));
              svgEl.style.height = `${h}px`;
            } else {
              svgEl.setAttribute('height', '150');
              svgEl.style.height = '150px';
            }
            continue;
          }

          // Standardize color formatting to solid compatible Hex
          if (el.style) {
            let compStyle = null;
            try {
              const ownerWin = el.ownerDocument?.defaultView || window;
              compStyle = ownerWin.getComputedStyle(el);
            } catch (e) {}

            if (compStyle) {
              const properties = [
                'backgroundColor',
                'color',
                'borderColor',
                'borderTopColor',
                'borderBottomColor',
                'borderLeftColor',
                'borderRightColor',
                'fill',
                'stroke',
                'boxShadow'
              ];
              
              properties.forEach(prop => {
                try {
                  const val = compStyle![prop as any];
                  if (typeof val === 'string') {
                    const lowerVal = val.toLowerCase();
                    if (
                      lowerVal.includes('oklch') || 
                      lowerVal.includes('oklab') || 
                      lowerVal.includes('color-mix') ||
                      lowerVal.includes('lch(') ||
                      lowerVal.includes('lab(') ||
                      lowerVal.includes('color(') ||
                      lowerVal.includes('rgba') ||
                      lowerVal.includes('rgb')
                    ) {
                      const converted = parseAndConvertColorToHex(val);
                      (el.style as any)[prop] = converted;
                    }
                  }
                } catch (e) {}
              });
            }
          }
        }
      } catch (err) {
        console.warn('[PDF Service Validation] Error during clone processing:', err);
      }
    };

    // A4 Portrait dimensions: 210mm x 297mm
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    // Check if the element contains sub-pages
    const pages = element.querySelectorAll('.pdf-page');

    if (pages.length > 0) {
      let pageCount = 0;
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        if (!pageEl) continue;

        // REQUIREMENT 2, 7 & 8: Independent validation of dimensions before html2canvas
        if (pageEl.offsetWidth === 0 || pageEl.offsetHeight === 0) {
          console.warn(`[PDF Service Validation] Skipping page ${i + 1} due to zero offset width/height dimensions (offsetWidth=${pageEl.offsetWidth}, offsetHeight=${pageEl.offsetHeight}).`);
          continue;
        }

        // Tag empty or hidden sections in the physical DOM *before* clone is created!
        tagHiddenAndEmptyElements(pageEl);
        
        const originalPageId = pageEl.id;
        const tempPageId = `pdf-temp-page-${i}-${Date.now().toString(36)}`;
        pageEl.id = tempPageId;
        activePageTempId = tempPageId;

        try {
          // Render via html2canvas with strict setup options
          const canvasPage = await html2canvas(pageEl, {
            scale: 2, // Ultra-sharp document texts
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1024,
            scrollX: 0,
            scrollY: 0,
            onclone: onCloneHandler
          });

          if (!isValidCanvas(canvasPage)) {
            throw new Error(`html2canvas output canvas is invalid or empty for sub-page ${i + 1}`);
          }

          // Safe extract with format and Base64 header signature check
          const { imgData, format } = extractAndValidateImageFromCanvas(canvasPage);

          // STRICT DIMENSION DEFENSIVE VALIDATION
          const rawWidth = canvasPage.width;
          const rawHeight = canvasPage.height;
          
          const imgWidth = (isNaN(rawWidth) || !isFinite(rawWidth) || rawWidth <= 0) ? 1024 : rawWidth;
          const imgHeight = (isNaN(rawHeight) || !isFinite(rawHeight) || rawHeight <= 0) ? 768 : rawHeight;

          let contentWidth = pdfWidth - (margin * 2);
          let contentHeight = (imgHeight * contentWidth) / imgWidth;

          const maxPageHeight = pdfHeight - (margin * 2);
          if (contentHeight > maxPageHeight) {
            contentHeight = maxPageHeight;
            contentWidth = (imgWidth * contentHeight) / imgHeight;
          }

          // Defensive validations before calling addImage
          const safeWidth = (isNaN(contentWidth) || !isFinite(contentWidth) || contentWidth <= 0) ? (pdfWidth - margin * 2) : contentWidth;
          const safeHeight = (isNaN(contentHeight) || !isFinite(contentHeight) || contentHeight <= 0) ? (pdfHeight - margin * 2) : contentHeight;

          const xOffset = margin + (pdfWidth - margin * 2 - safeWidth) / 2;
          const yOffset = margin + (pdfHeight - margin * 2 - safeHeight) / 2;

          const safeX = (isNaN(xOffset) || !isFinite(xOffset) || xOffset < 0) ? margin : xOffset;
          const safeY = (isNaN(yOffset) || !isFinite(yOffset) || yOffset < 0) ? margin : yOffset;

          if (pageCount > 0) {
            pdf.addPage();
          }
          
          // Double defensive verification of Base64 and dimensions before calling jsPDF SDK
          if (safeWidth > 0 && safeHeight > 0 && isValidBase64Image(imgData, format)) {
            pdf.addImage(imgData, format, safeX, safeY, safeWidth, safeHeight, undefined, 'FAST');
            pageCount++;
          } else {
            throw new Error('Image data failed safety verification just before adding to document.');
          }
        } catch (pageError) {
          console.error(`[PDF Service] Catching and continuing on sub-page ${i + 1} rendering error:`, pageError);
          // Insert a graceful fallback empty or notice page in the output instead of throwing/crashing (Requirement 8 & 10)
          if (pageCount > 0) {
            pdf.addPage();
          }
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(150, 50, 50);
          pdf.text(`[Falha parcial de renderização de imagem para folha ${String(i + 1).padStart(2, '0')}]`, margin + 5, margin + 20);
          pdf.text('Todos os outros detalhes financeiros foram impressos perfeitamente.', margin + 5, margin + 26);
          pageCount++;
        } finally {
          // Clean up data-pdf-hidden attributes
          untagHiddenAndEmptyElements(pageEl);
          
          // Guaranteed page ID restore
          if (originalPageId) {
            pageEl.id = originalPageId;
          } else {
            pageEl.removeAttribute('id');
          }
          activePageTempId = null;
        }
      }
    } else {
      // Single continuous layout flow
      tagHiddenAndEmptyElements(element);
      
      const originalElementId = element.id;
      if (!originalElementId) {
        element.id = elementId;
      }

      let canvas;
      try {
        canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024,
          scrollX: 0,
          scrollY: 0,
          onclone: onCloneHandler
        });
      } finally {
        untagHiddenAndEmptyElements(element);
        if (!originalElementId) {
          element.removeAttribute('id');
        }
      }

      if (!isValidCanvas(canvas)) {
        throw new Error('html2canvas produced an invalid primary canvas for single continuous layout output.');
      }

      const { imgData, format } = extractAndValidateImageFromCanvas(canvas);
      
      // STRICT DIMENSION DEFENSIVE VALIDATION
      const rawWidth = canvas.width;
      const rawHeight = canvas.height;
      
      const imgWidth = (isNaN(rawWidth) || !isFinite(rawWidth) || rawWidth <= 0) ? 1024 : rawWidth;
      const imgHeight = (isNaN(rawHeight) || !isFinite(rawHeight) || rawHeight <= 0) ? 768 : rawHeight;

      let contentWidth = pdfWidth - (margin * 2);
      let contentHeight = (imgHeight * contentWidth) / imgWidth;

      const maxPageHeight = pdfHeight - (margin * 2);
      const isSinglePage = filename.toLowerCase().includes('presbiterio');

      // Defensive validation checks
      const safeWidth = (isNaN(contentWidth) || !isFinite(contentWidth) || contentWidth <= 0) ? (pdfWidth - margin * 2) : contentWidth;
      const safeHeight = (isNaN(contentHeight) || !isFinite(contentHeight) || contentHeight <= 0) ? (pdfHeight - margin * 2) : contentHeight;

      if (isSinglePage && safeHeight > maxPageHeight) {
        const pageRatioHeight = maxPageHeight;
        const pageRatioWidth = (imgWidth * pageRatioHeight) / imgHeight;
         
        const finalWidth = (isNaN(pageRatioWidth) || !isFinite(pageRatioWidth) || pageRatioWidth <= 0) ? (pdfWidth - margin * 2) : pageRatioWidth;
        const xOffset = margin + (pdfWidth - margin * 2 - finalWidth) / 2;
        const safeX = (isNaN(xOffset) || !isFinite(xOffset) || xOffset < 0) ? margin : xOffset;

        if (finalWidth > 0 && pageRatioHeight > 0 && isValidBase64Image(imgData, format)) {
          pdf.addImage(imgData, format, safeX, margin, finalWidth, pageRatioHeight, undefined, 'FAST');
        } else {
          throw new Error('Image dimensions or values are invalid for fitting calculations.');
        }
      } else {
        let heightLeft = safeHeight;
        let position = margin;

        if (safeWidth > 0 && safeHeight > 0 && isValidBase64Image(imgData, format)) {
          // Page 1
          pdf.addImage(imgData, format, margin, position, safeWidth, safeHeight, undefined, 'FAST');
          heightLeft -= (pdfHeight - (margin * 2));

          // Handle additional pages if the height overflowed
          while (heightLeft > 0) {
            position = heightLeft - safeHeight + margin - 2; // offset to prevent overlapping
            const safeY = (isNaN(position) || !isFinite(position)) ? margin : position;
            pdf.addPage();
            pdf.addImage(imgData, format, margin, safeY, safeWidth, safeHeight, undefined, 'FAST');
            heightLeft -= (pdfHeight - (margin * 2));
          }
        } else {
          throw new Error('Primary continuous single image setup claims invalid signatures or sizes.');
        }
      }
    }

    // Save final highly compatible document
    pdf.save(`${filename.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    return true;
  } catch (error) {
    console.error('[PDF Service] Error generating document:', error);
    return false;
  }
}
