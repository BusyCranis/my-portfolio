import Cropper from 'cropperjs';
import { fabric } from 'fabric';
import { Promise } from 'core-js';
import 'cropperjs/dist/cropper.css';

export class PhotoEditor {
  constructor(selector, options) {
    /**
     * Create a new Cropper for edit Photo
     * @param {string} selector - Id of img or canvas element(The target element for cropping.)
     * @param {Object} options - The configuration options.
     */
    if (!selector) throw new Error('Please provide a selector.');
    this.userImage = document.getElementById(selector);
    this.cropper = new Cropper(this.userImage, {
      viewMode: 1,
      background: false,
      autoCrop: false,
      dragMode: 'none',
      zoomOnWheel: false,
      ...options
    });
  }

  changePhoto(src) {
    this.cropper.replace(src);
  }

  setDragMode(mode) {
    this.cropper.setDragMode(mode);
  }

  getPhotoSize(isFirstLoading = true) {
    return new Promise((resolve, reject) => {
      try {
        if (!isFirstLoading) {
          const target = document.getElementsByClassName('cropper-canvas');
          const width = target[0].style.width;
          const height = target[0].style.height;
          resolve([parseInt(width), parseInt(height)]);
          return;
        }

        this.userImage.addEventListener(
          'ready',
          () => {
            const { width, height } = this.cropper.getCanvasData();
            resolve([width, height]);
          },
          { once: true }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  getRotatedCanvasSize() {
    const { width, height } = this.cropper.getCanvasData();
    return [width, height];
  }

  getInitZoomLevel() {
    const image = this.cropper.getImageData();
    const zoomLevel = (image.naturalWidth - image.width) / image.width;
    return zoomLevel;
  }

  /**
   * Reset zoom to init state
   * @param {number} initZoomLevel
   */
  resetZoomLevel(initZoomLevel) {
    this.cropper.zoomTo(initZoomLevel);
  }

  reset() {
    this.cropper.reset();
  }

  clear() {
    this.cropper.clear();
  }

  disable() {
    const stickerCanvas = document.querySelector('.canvas-container');
    stickerCanvas && this.cropper.disable();
  }

  destroy() {
    this.cropper.destroy();
  }

  finishCrop() {
    const canvas = this.cropper.getCroppedCanvas();
    const croppedImgSrc = canvas.toDataURL();
    this.cropper.replace(croppedImgSrc);
  }

  /**
   * Set two number for calculate ratio (x/y) of crop box
   * @param {number} x - numerator
   * @param {number} y - denominator
   */
  setCropRatio(x, y) {
    if (!x && !y) throw new Error('Please provide a ratio of crop box.');
    this.cropper.setDragMode('crop');
    this.cropper.crop();
    this.cropper.setAspectRatio(x / y);
  }

  setFreeCrop() {
    this.cropper.setDragMode('crop');
    this.cropper.crop();
    this.cropper.setAspectRatio(NaN);
  }

  /**
   * Set sign of rotate direction
   * @param {string} sign - '+' or '-'
   */
  rotate(sign) {
    this.cropper.clear();
    if (sign === '+') this.cropper.rotate(90);
    if (sign === '-') this.cropper.rotate(-90);
  }

  /**
   * Set direction of flip canvas
   * @param {string} direction - 'X' or 'Y'
   */
  flip(direction) {
    this.cropper.clear();
    if (direction === direction.toLowerCase())
      direction = direction.toUpperCase();
    if (direction === 'X')
      this.cropper.scaleX(-this.cropper.getData().scaleX || -1);
    if (direction === 'Y')
      this.cropper.scaleY(-this.cropper.getData().scaleY || -1);
  }

  /**
   * Set ratio of zoom in or zoom out
   * @param {number} x - positive for zoom in, negative for zoom out
   */
  zoom(x) {
    this.cropper.zoom(x);
  }

  /**
   * Edited Photo Image Object without sticker
   * @returns Image Object
   */
  saveEditedPhoto(stickerImage) {
    const canvas = this.cropper.getCroppedCanvas();
    const editedPhotoSrc = canvas.toDataURL('image/png');
    const editedPhoto = new Image();
    editedPhoto.src = editedPhotoSrc;
    if (!stickerImage) return [editedPhoto, editedPhotoSrc];

    //스티커 이미지 올리기
    const context = canvas.getContext('2d');
    stickerImage.onload = () => {
      context.drawImage(stickerImage, 0, 0);
    };

    return canvas;
  }

  getNatureSize() {
    const canvas = this.cropper.getCroppedCanvas();
    return [canvas.width, canvas.height];
  }
}

export class StickerEditor {
  /**
   * Create a new fabric Canvas for add Sticker
   * @param {Element} canvasID - The id of canvas element
   * @param {Object} options - The option of image
   */
  constructor(canvasID, width, height) {
    if (!canvasID)
      throw new Error('Please provide a canvas element with id canvas.');

    this.stickerCanvas = new fabric.Canvas(canvasID);

    if (width && height) {
      this.resizeStickerCanvas(width, height);
    }

    this.stickerCanvas.backgroundColor = null;

    this.stickerCanvas.renderAll.bind(this.stickerCanvas)();
  }

  /**
   * Add sticker image on canvas
   * @param {string} src - The src of sticker image
   * @param {Object} options - The options of sticker image
   */
  addSticker(src, options) {
    fabric.Image.fromURL(
      src,
      sticker => {
        sticker.scaleToWidth(this.stickerCanvas.width * 0.2);
        sticker.scaleToHeight(this.stickerCanvas.width * 0.2);
        this.stickerCanvas.add(sticker).renderAll();
      },
      {
        borderColor: '#39f',
        cornerColor: '#39f',
        cornerSize: 5,
        transparentCorners: false,
        ...options
      }
    );
  }

  /**
   * Resize sticker canvas's width to natural width of the original image
   * @param {number} naturalWidth
   */
  resizeStickerToNatural(naturalWidth) {
    if (this.stickerCanvas.width != naturalWidth) {
      const scaleMultiplier = naturalWidth / this.stickerCanvas.width;
      const objects = this.stickerCanvas.getObjects();
      for (const i in objects) {
        objects[i].scaleX = objects[i].scaleX * scaleMultiplier;
        objects[i].scaleY = objects[i].scaleY * scaleMultiplier;
        objects[i].left = objects[i].left * scaleMultiplier;
        objects[i].top = objects[i].top * scaleMultiplier;
        objects[i].setCoords();
      }

      this.stickerCanvas.discardActiveObject();
      this.stickerCanvas.setWidth(
        this.stickerCanvas.getWidth() * scaleMultiplier
      );
      this.stickerCanvas.setHeight(
        this.stickerCanvas.getHeight() * scaleMultiplier
      );
      this.stickerCanvas.renderAll();
      this.stickerCanvas.calcOffset();
    }
  }

  /**
   * Return result sticker image
   * @param {number} naturalWidth
   * @returns Image Object png
   */
  saveStickerImage(naturalWidth) {
    //편집된 이미지 크기에 맞게 스티커를 재조정 후
    this.resizeStickerToNatural(naturalWidth);
    //이미지로 내보내서 cropper js canvas에 올릴 것임
    const stickerImage = new Image();
    stickerImage.src = this.stickerCanvas.toDataURL('image/png');
    return stickerImage;
  }

  /**
   * Resize Sticker Canvas (ex. after crop)
   * @param {number | string} width
   * @param {number | string} height
   */
  resizeStickerCanvas(width, height) {
    this.stickerCanvas.setDimensions({
      width,
      height
    });
  }

  removeAllSticker() {
    this.stickerCanvas.clear();
  }

  removeSticker() {
    const selectedSticker = this.stickerCanvas.getActiveObject();
    this.stickerCanvas.remove(selectedSticker);
  }
}
