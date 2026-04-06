export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const readFilesAsDataUrls = async (files) => {
  const array = Array.from(files || []);
  return Promise.all(array.map(readFileAsDataUrl));
};
