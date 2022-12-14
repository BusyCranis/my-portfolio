<template>
  <section
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      position: 'relative'
    }"
  >
    <slot
      name="controllerBar"
      :reset="reset"
      :sticker-canvas="stickerCanvas"
      :on-input-image="onInputImage"
      :crop="crop"
      :layout="layout"
      :photo-canvas="photoCanvas"
      :export-result-photo="exportResultPhoto"
      :uploadedImageSrc="uploadedImageSrc"
    >
    </slot>

    <div class="imoji-editor-wrapper">
      <div class="imoji-editor-container">
        <div id="sticker-wrapper" :class="[hide ? 'hide' : '']">
          <canvas id="sticker-canvas"></canvas>
        </div>
        <div
          id="uploaded-photo-wrapper"
          :style="{
            width: `${width}px`,
            height: `${height}px`
          }"
        >
          <img id="user-photo" ref="uploadedPhoto" :src="uploadedImageSrc" />
        </div>
      </div>
    </div>
    <div class="all-tool-bar-wrapper">
      <div class="all-tool-bar-buttons-wrapper">
        <slot
          name="toolBar"
          :photo-canvas="photoCanvas"
          :layout="layout"
          :zoom="zoom"
          :rotate="rotate"
          :flip="flip"
        ></slot>
        <slot
          name="stickerToolBar"
          :sticker-canvas="stickerCanvas"
          :layout="layout"
        ></slot>
        <slot
          name="ratioCropToolBar"
          :photo-canvas="photoCanvas"
          :layout="layout"
        ></slot>
        <slot
          name="toolNavigation"
          :open-image-editor="openImageEditor"
          :open-sticker-editor="openStickerEditor"
          :uploadedImageSrc="uploadedImageSrc"
          :layout="layout"
        ></slot>
      </div>
    </div>
  </section>
</template>

<script>
import { PhotoEditor, StickerEditor } from '@/js/ImojiEditor.js';

export default {
  props: {
    isCropMode: {
      type: Boolean,
      required: true
    },
    stickerResetMessage: {
      type: String,
      required: true
    },
    width: {
      type: Number,
      required: false,
      default: document.documentElement.clientWidth
    },
    height: {
      type: Number,
      required: false,
      default: document.documentElement.clientHeight
    },
    // eslint-disable-next-line vue/require-default-prop
    defaultImage: {
      type: [Image, undefined],
      required: false
    }
  },
  data() {
    return {
      stickerCanvas: undefined,
      photoCanvas: undefined,
      photoCanvasSize: [0, 0],
      uploadedImageSrc: '',
      initImageSrc: '',
      isZoomed: false,
      isRotated: false,
      layout: '',
      hide: true,
      imgType: ''
    };
  },
  watch: {
    defaultImage: {
      deep: true,
      immediate: true,
      handler(newImg, preImg) {
        if (!this.defaultImage) return;
        if (newImg !== preImg) {
          this.uploadedImageSrc = newImg.src;
          this.initImageSrc = newImg.src;
          this.onImportImage();
        }
      }
    }
  },
  methods: {
    // Settings
    onImportImage() {
      let loadImportedImage;

      if (this.defaultImage.complete) {
        loadImportedImage = new Promise(resolve => resolve());
      } else {
        loadImportedImage = new Promise(resolve =>
          this.defaultImage.addEventListener('load', resolve, { once: true })
        );
      }

      loadImportedImage.then(() => {
        if (!this.photoCanvas) {
          this.photoCanvas = new PhotoEditor('#user-photo', {
            minContainerHeight: this.height,
            minContainerWidth: this.width
          });
        }

        if (this.photoCanvas) {
          this.photoCanvas.changeImage(this.uploadedImageSrc);
          this.setPhotoCanvasSize();
        }
      });
    },
    onInputImage(e) {
      const { files } = e.target;

      this.uploadedImageSrc = URL.createObjectURL(files[0]);
      this.initImageSrc = URL.createObjectURL(files[0]);
      this.imgType = files[0].type;

      if (!this.photoCanvas) {
        this.photoCanvas = new PhotoEditor('#user-photo', {
          minContainerHeight: this.height,
          minContainerWidth: this.width
        });
      }

      this.changeImage();
    },
    changeImage() {
      this.photoCanvas.changeImage(this.uploadedImageSrc);
      this.setPhotoCanvasSize();
    },
    async setPhotoCanvasSize() {
      const [width, height] = await this.photoCanvas.getPhotoCanvasSize();
      this.photoCanvasSize = [width, height];
      this.resizeStickerCanvas();
    },
    resizeStickerCanvas() {
      const [width, height] = this.photoCanvasSize;

      if (this.stickerCanvas) {
        this.stickerCanvas.resizeStickerCanvas(width, height);
      }
    },
    clearCrop() {
      this.photoCanvas.clear();
      this.$emit('off-croppable', false);
    },
    //Tool Features
    zoom(x) {
      this.isZoomed = true;
      this.photoCanvas.zoom(x);
    },
    rotate(sign) {
      this.photoCanvas.setDragMode('none');
      this.photoCanvas.rotate(sign);
      this.isRotated = true;
      this.clearCrop();
    },
    flip(direction) {
      this.photoCanvas.setDragMode('none');
      this.photoCanvas.flip(direction);
      this.clearCrop();
    },
    reset() {
      if (this.photoCanvas) {
        this.photoCanvas.changeImage(this.initImageSrc);
        this.photoCanvas.setDragMode('none');
        this.clearCrop();
        this.$refs.uploadedPhoto.addEventListener(
          'load',
          () => {
            this.setPhotoCanvasSize();
            this.resizeStickerCanvas();
          },
          { once: true }
        );
      }

      if (this.stickerCanvas) {
        this.stickerCanvas.removeAllSticker();
      }
    },
    crop() {
      this.photoCanvas.finishCrop(this.imgType);
      this.setPhotoCanvasSize();
    },
    async exportResultPhoto() {
      // case 1. only Edit
      if (!this.stickerCanvas && this.photoCanvas) {
        return this.photoCanvas.exportOnlyImage(this.imgType);
      }

      // case 2. only Sticker
      if (!this.photoCanvas && this.stickerCanvas) {
        const width = this.photoCanvas.getNaturalSize()[0];
        return await this.photoCanvas.exportWithSticker(
          this.stickerCanvas.saveStickerImage(width),
          this.imgType
        );
      }

      // case 3. Edit & Sticker
      if (this.photoCanvas && this.stickerCanvas) {
        const width = this.photoCanvas.getNaturalSize()[0];
        return await this.photoCanvas.exportWithSticker(
          this.stickerCanvas.saveStickerImage(width),
          this.imgType
        );
      }
    },
    // Tool navigation (set mode)
    openImageEditor() {
      if (this.stickerCanvas) {
        let resetStickerCanvas = confirm(this.stickerResetMessage);

        if (!resetStickerCanvas) return;

        this.stickerCanvas.removeAllSticker();
      }

      this.hide = true;
      this.layout = 'tool-bar';

      this.setPhotoCanvasSize();
    },
    openStickerEditor() {
      this.$parent.$data.isCropMode = false;
      this.hide = false;
      this.layout = 'sticker-tool-bar';

      if (!this.stickerCanvas) {
        this.setPhotoCanvasSize();
        const [width, height] = this.photoCanvasSize;
        this.stickerCanvas = new StickerEditor('sticker-canvas', width, height);
      }

      if (this.photoCanvas) {
        if (this.isZoomed || this.isRotated) {
          this.crop();
          this.isZoomed = false;
          this.isRotated = false;
        }

        this.photoCanvas.setDragMode('none');
        this.clearCrop();
      }

      if (!this.photoCanvas) {
        this.setPhotoCanvasSize();
      }
    }
  }
};
</script>

<style scoped>
.imoji-editor-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.imoji-editor-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

#sticker-wrapper {
  position: absolute;
  z-index: 1;
}

#user-photo {
  display: block;
  max-width: 100%;
  max-height: 100vh;
}

.hide {
  display: none;
}

#uploaded-photo-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.all-tool-bar-wrapper {
  position: absolute;
  z-index: 2;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
}

.all-tool-bar-buttons-wrapper {
  position: relative;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 800px;
  margin: 0 auto;
}
</style>
