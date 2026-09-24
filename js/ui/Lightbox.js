/** Native <dialog> lightbox: modal focus, Esc to close, focus returns to the opener. */
export class Lightbox {
  constructor(dialog) {
    this.dialog = dialog;
    this.img = dialog.querySelector('.lightbox-img');
    this.caption = dialog.querySelector('.lightbox-caption');
    this.opener = null;

    dialog.querySelector('.lightbox-close').addEventListener('click', () => this.close());
    // Click on the backdrop (the dialog element itself, outside the figure) closes.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.close();
    });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('lightbox-open');
      this.img.removeAttribute('src');
      this.opener?.focus?.({ preventScroll: true });
    });
  }

  open(src, caption, opener = document.activeElement) {
    this.opener = opener;
    this.img.src = src;
    this.img.alt = caption;
    this.caption.textContent = caption;
    document.documentElement.classList.add('lightbox-open');
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else window.open(src, '_blank', 'noopener');
  }

  close() {
    if (this.dialog.open) this.dialog.close();
  }
}
