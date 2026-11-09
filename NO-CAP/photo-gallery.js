export function initializePhotoGallery() {
  const dialog = document.querySelector("#photo-lightbox");
  const image = document.querySelector("#photo-lightbox-image");
  const caption = document.querySelector("#photo-lightbox-caption");
  const count = document.querySelector("#photo-lightbox-count");
  const closeButton = document.querySelector("#photo-lightbox-close");
  const previousButton = document.querySelector("#photo-lightbox-previous");
  const nextButton = document.querySelector("#photo-lightbox-next");

  if (!dialog || !image || !caption || !count || !closeButton || !previousButton || !nextButton) return;

  let activePhoto = 0;
  let lastTrigger = null;

  function photos() {
    return [...document.querySelectorAll(".stall-gallery [data-gallery-photo]")].filter((photo) => {
      const source = photo.querySelector("img")?.currentSrc || photo.querySelector("img")?.src;
      return Boolean(source);
    });
  }

  function showPhoto(index) {
    const availablePhotos = photos();
    if (!availablePhotos.length) return;

    activePhoto = (index + availablePhotos.length) % availablePhotos.length;
    const trigger = availablePhotos[activePhoto];
    const photoImage = trigger.querySelector("img");
    image.src = photoImage.currentSrc || photoImage.src;
    image.alt = photoImage.alt || "Stall photo";
    caption.textContent = trigger.dataset.caption || photoImage.alt || "";
    count.textContent = `${activePhoto + 1} / ${availablePhotos.length}`;
    previousButton.disabled = availablePhotos.length < 2;
    nextButton.disabled = availablePhotos.length < 2;
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".stall-gallery [data-gallery-photo]");
    if (!trigger) return;

    const availablePhotos = photos();
    const index = availablePhotos.indexOf(trigger);
    if (index < 0) return;

    lastTrigger = trigger;
    showPhoto(index);
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  });

  previousButton.addEventListener("click", () => showPhoto(activePhoto - 1));
  nextButton.addEventListener("click", () => showPhoto(activePhoto + 1));
  closeButton.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPhoto(activePhoto - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(activePhoto + 1);
    }
  });

  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    if (lastTrigger?.isConnected) lastTrigger.focus();
    lastTrigger = null;
  });
}

initializePhotoGallery();
