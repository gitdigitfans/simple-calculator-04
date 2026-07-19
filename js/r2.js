const R2 = {
  publicUrl: 'https://pub-d67e1ad194f24e2a95a4606ccadb7b07.r2.dev',
};

async function uploadToR2(file, key) {
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = key + '.' + ext;
  const resp = await fetch('/api/upload', {
    method: 'PUT',
    headers: { 'X-Filename': fileName, 'Content-Type': file.type },
    body: file,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'R2 upload failed: ' + resp.status);
  }
  const data = await resp.json();
  return data.url;
}

async function deleteFromR2(path) {
  const resp = await fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!resp.ok && resp.status !== 404) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'R2 delete failed: ' + resp.status);
  }
}

function getR2PublicUrl(path) {
  return R2.publicUrl + '/' + path;
}

async function uploadImages(files, prefix) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const key = prefix + '_' + Date.now() + '_' + i;
    const url = await uploadToR2(file, key);
    urls.push(url);
  }
  return urls;
}

function getR2Path(url) {
  if (!url || !url.startsWith(R2.publicUrl)) return null;
  return url.replace(R2.publicUrl + '/', '');
}

async function deleteImagesByUrls(urls) {
  for (const url of urls) {
    const path = getR2Path(url);
    if (path) await deleteFromR2(path);
  }
}

function r2FileName(prefix, ext) {
  return prefix + '_' + Date.now() + '.' + ext;
}

function pickAndUpload(prefix, accept) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      try {
        const key = (prefix || 'upload') + '_' + Date.now();
        const url = await uploadToR2(file, key);
        resolve(url);
      } catch (err) { reject(err); }
    };
    input.click();
  });
}

function createImageUploader(container, opts) {
  const currentUrl = opts.currentUrl || '';
  const prefix = opts.prefix || 'img';
  const onUpload = opts.onUpload || function(url) {};
  const onRemove = opts.onRemove || function() {};
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
    } catch (err) {
      if (err.message !== 'No file selected') alert('خطأ في رفع الصورة: ' + err.message);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = opts.uploadLabel || 'اختيار صورة';
    }
  };

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'text-xs text-red-500 hover:text-red-600 font-semibold transition';
  removeBtn.textContent = opts.removeLabel || 'حذف';
  removeBtn.onclick = () => {
    preview.innerHTML = `<svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
    onRemove();
  };

  btnGroup.appendChild(uploadBtn);
  if (currentUrl) btnGroup.appendChild(removeBtn);
  wrapper.appendChild(btnGroup);
  container.appendChild(wrapper);
  return { preview, uploadBtn, removeBtn };
}

function createGalleryUploader(container, opts) {
  const images = opts.images || [];
  const prefix = opts.prefix || 'gallery';
  const onImagesChange = opts.onImagesChange || function(urls) {};

  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-3';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-4 sm:grid-cols-6 gap-2';
  grid.id = 'galleryGrid';

  function renderGallery() {
    grid.innerHTML = images.map((url, i) => `
      <div class="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <img src="${url}" class="w-full h-full object-cover">
        <button type="button" onclick="removeGalleryImage(${i})" class="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">&times;</button>
      </div>
    `).join('');
  }

  window.removeGalleryImage = (i) => {
    images.splice(i, 1);
    renderGallery();
    onImagesChange([...images]);
  };

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
    } catch (err) {
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

window.R2 = R2;
window.uploadToR2 = uploadToR2;
window.deleteFromR2 = deleteFromR2;
window.getR2PublicUrl = getR2PublicUrl;
window.uploadImages = uploadImages;
window.deleteImagesByUrls = deleteImagesByUrls;
window.getR2Path = getR2Path;
window.r2FileName = r2FileName;
window.pickAndUpload = pickAndUpload;
window.createImageUploader = createImageUploader;
window.createGalleryUploader = createGalleryUploader;
