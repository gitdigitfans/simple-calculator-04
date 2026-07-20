import { CONFIG } from './config';

const R2_PUBLIC_URL = CONFIG.R2_PUBLIC_URL;

export interface R2UploadResponse {
  url: string;
}

export interface R2GalleryUploaderOptions {
  images?: string[];
  prefix?: string;
  onImagesChange?: (urls: string[]) => void;
  addLabel?: string;
}

export interface R2ImageUploaderOptions {
  currentUrl?: string;
  prefix?: string;
  onUpload?: (url: string) => void;
  onRemove?: () => void;
  uploadLabel?: string;
  removeLabel?: string;
}

export async function uploadToR2(file: File, key: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const fileName = key + '.' + ext;
  const resp = await fetch('/api/upload', {
    method: 'PUT',
    headers: { 'X-Filename': fileName, 'Content-Type': file.type },
    body: file,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({} as any));
    throw new Error(err.error || 'R2 upload failed: ' + resp.status);
  }
  const data: R2UploadResponse = await resp.json();
  return data.url;
}

export async function deleteFromR2(path: string): Promise<void> {
  const resp = await fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!resp.ok && resp.status !== 404) {
    const err = await resp.json().catch(() => ({} as any));
    throw new Error(err.error || 'R2 delete failed: ' + resp.status);
  }
}

export function getR2PublicUrl(path: string): string {
  return R2_PUBLIC_URL + '/' + path;
}

export async function uploadImages(files: File[], prefix: string): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const key = prefix + '_' + Date.now() + '_' + i;
    const url = await uploadToR2(file, key);
    urls.push(url);
  }
  return urls;
}

export function getR2Path(url: string): string | null {
  if (!url || !url.startsWith(R2_PUBLIC_URL)) return null;
  return url.replace(R2_PUBLIC_URL + '/', '');
}

export async function deleteImagesByUrls(urls: string[]): Promise<void> {
  for (const url of urls) {
    const path = getR2Path(url);
    if (path) await deleteFromR2(path);
  }
}

export function r2FileName(prefix: string, ext: string): string {
  return prefix + '_' + Date.now() + '.' + ext;
}

export function pickAndUpload(prefix: string, accept?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      try {
        const key = (prefix || 'upload') + '_' + Date.now();
        const url = await uploadToR2(file, key);
        resolve(url);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

export function createImageUploader(
  container: HTMLElement,
  opts: R2ImageUploaderOptions
): { preview: HTMLDivElement; uploadBtn: HTMLButtonElement; removeBtn: HTMLButtonElement | null } {
  const currentUrl = opts.currentUrl || '';
  const prefix = opts.prefix || 'img';
  const onUpload = opts.onUpload || function () {};
  const onRemove = opts.onRemove || function () {};

  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-center gap-3 flex-wrap';

  const preview = document.createElement('div');
  preview.className = 'w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50 flex items-center justify-center';
  preview.innerHTML = currentUrl
    ? `<img src="${currentUrl}" class="w-full h-full object-cover">`
    : `<svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
  wrapper.appendChild(preview);

  const btnGroup = document.createElement('div');
  btnGroup.className = 'flex flex-col gap-1';

  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'px-3 py-1.5 text-xs font-semibold bg-brand-navy/10 text-[#1D355E] rounded-lg hover:bg-brand-navy/20 transition whitespace-nowrap';
  uploadBtn.textContent = opts.uploadLabel || 'اختيار صورة';
  uploadBtn.onclick = async () => {
    try {
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'جاري الرفع...';
      const url = await pickAndUpload(prefix);
      preview.innerHTML = `<img src="${url}" class="w-full h-full object-cover">`;
      onUpload(url);
    } catch (err: any) {
      if (err.message !== 'No file selected') alert('خطأ في رفع الصورة: ' + err.message);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = opts.uploadLabel || 'اختيار صورة';
    }
  };

  let removeBtn: HTMLButtonElement | null = null;
  if (currentUrl) {
    removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-xs text-red-500 hover:text-red-600 font-semibold transition';
    removeBtn.textContent = opts.removeLabel || 'حذف';
    removeBtn.onclick = () => {
      preview.innerHTML = `<svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
      onRemove();
    };
  }

  btnGroup.appendChild(uploadBtn);
  if (removeBtn) btnGroup.appendChild(removeBtn);
  wrapper.appendChild(btnGroup);
  container.appendChild(wrapper);

  return { preview, uploadBtn, removeBtn };
}

export function createGalleryUploader(
  container: HTMLElement,
  opts: R2GalleryUploaderOptions
): { grid: HTMLDivElement; addBtn: HTMLButtonElement } {
  const images = opts.images ? [...opts.images] : [];
  const prefix = opts.prefix || 'gallery';
  const onImagesChange = opts.onImagesChange || function () {};

  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-3';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-4 sm:grid-cols-6 gap-2';

  function renderGallery() {
    grid.innerHTML = images
      .map(
        (url, i) => `
        <div class="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src="${url}" class="w-full h-full object-cover">
          <button type="button" data-gallery-index="${i}" class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">&times;</button>
        </div>
      `
      )
      .join('');

    grid.querySelectorAll('[data-gallery-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-gallery-index') || '0', 10);
        images.splice(idx, 1);
        renderGallery();
        onImagesChange([...images]);
      });
    });
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'px-4 py-2 text-xs font-semibold bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition';
  addBtn.textContent = opts.addLabel || '+ إضافة صورة';
  addBtn.onclick = async () => {
    try {
      addBtn.disabled = true;
      addBtn.textContent = 'جاري الرفع...';
      const url = await pickAndUpload(prefix);
      images.push(url);
      renderGallery();
      onImagesChange([...images]);
    } catch (err: any) {
      if (err.message !== 'No file selected') alert('خطأ في رفع الصورة: ' + err.message);
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = opts.addLabel || '+ إضافة صورة';
    }
  };

  renderGallery();
  wrapper.appendChild(grid);
  wrapper.appendChild(addBtn);
  container.appendChild(wrapper);

  return { grid, addBtn };
}
