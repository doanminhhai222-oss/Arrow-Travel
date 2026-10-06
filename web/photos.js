// Ảnh chuyến đi do người dùng tự đăng: lưu trong IndexedDB trên thiết bị, không tải lên máy chủ nào.
const DB_NAME = 'arrow-travel-photos', STORE = 'photos';

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Trình duyệt không hỗ trợ lưu ảnh')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { const s = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }); s.createIndex('key', 'key'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Không mở được kho ảnh'));
  });
}
const wrap = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

export async function addPhoto(key, blob) {
  const db = await openPhotoDb();
  return wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).add({ key, blob, at: Date.now() }));
}
export async function listPhotos(key) {
  const db = await openPhotoDb();
  return wrap(db.transaction(STORE).objectStore(STORE).index('key').getAll(key));
}
export async function deletePhoto(id) {
  const db = await openPhotoDb();
  return wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
}
// Đổi khoá ảnh (ví dụ 'draft:ba-na' -> 'tabc:ba-na') khi lịch trình nháp được lưu
export async function movePhotos(fromPrefix, toPrefix) {
  const db = await openPhotoDb();
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
  const all = await wrap(store.getAll());
  await Promise.all(all.filter((p) => p.key.startsWith(fromPrefix)).map((p) => wrap(store.put({ ...p, key: toPrefix + p.key.slice(fromPrefix.length) }))));
}
export async function deleteTripPhotos(prefix) {
  const db = await openPhotoDb();
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
  const all = await wrap(store.getAll());
  await Promise.all(all.filter((p) => p.key.startsWith(prefix)).map((p) => wrap(store.delete(p.id))));
}
export async function clearAllPhotos() {
  const db = await openPhotoDb();
  return wrap(db.transaction(STORE, 'readwrite').objectStore(STORE).clear());
}

// Thu nhỏ ảnh về cạnh dài tối đa `max` px để tiết kiệm bộ nhớ
export async function resizeImage(file, max = 900, quality = 0.8) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Không xử lý được ảnh'))), 'image/jpeg', quality));
}
