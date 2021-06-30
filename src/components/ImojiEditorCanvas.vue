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
      :change-photo="changePhoto"
      :crop="crop"
      :layout="layout"
      :photo-canvas="photoCanvas"
      :export-result-photo="exportResultPhoto"
    >
    </slot>
    <div class="imoji-editor-wrapper">
      <div class="imoji-editor-container">
        <div id="sticker-wrapper" :class="[hide ? 'hide' : '']">
          <canvas id="sticker-canvas"></canvas>
        </div>
        <div id="uploaded-photo-wrapper">
          <img id="user-photo" ref="uploadedPhoto" :src="uploadedPhotoSrc" />
        </div>
      </div>
    </div>
    <div class="all-tool-bar-wrapper">
      <slot
        name="toolBar"
        :photo-canvas="photoCanvas"
        :layout="layout"
        :zoom="zoom"
        :rotate="rotate"
        :clear-crop="clearCrop"
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
        :open-photo-editor="openPhotoEditor"
        :open-sticker-editor="openStickerEditor"
      ></slot>
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
    errorMessage: {
      type: String,
      required: false,
      default: '편집할 사진을 선택해주세요'
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
      uploadedPhotoSrc: '',
      initImageSrc: '',
      zoomCount: 0,
      layout: '',
      hide: true
    };
  },
  watch: {
    defaultImage: {
      deep: true,
      immediate: true,
      handler() {
        if (this.defaultImage) {
          this.importPhoto();
        }
      }
    }
  },
  methods: {
    //Settings
    importPhoto() {
      this.uploadedPhotoSrc = this.defaultImage.src;
      this.initImageSrc = this.defaultImage.src;

      if (!this.photoCanvas) {
        this.photoCanvas = new PhotoEditor('user-photo', {
          minContainerHeight: this.height,
          minContainerWidth: this.width
        });
      }
    },
    changePhoto(e) {
      this.uploadedPhotoSrc = URL.createObjectURL(e.target.files[0]);
      this.initImageSrc = URL.createObjectURL(e.target.files[0]);

      if (!this.photoCanvas) {
        this.photoCanvas = new PhotoEditor('user-photo', {
          minContainerHeight: this.height,
          minContainerWidth: this.width
        });
      }

      if (this.photoCanvas) {
        this.photoCanvas.changePhoto(this.uploadedPhotoSrc);
      }

      this.setPhotoCanvasSize();
    },
    async setPhotoCanvasSize(isFirstLoading = true) {
      const [width, height] = await this.photoCanvas.getPhotoCanvasSize(
        isFirstLoading
      );

      this.$set(this.photoCanvasSize, 0, width);
      this.$set(this.photoCanvasSize, 1, height);
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
      this.zoomCount += x;
      this.photoCanvas.zoom(x);
    },
    rotate(sign) {
      this.photoCanvas.rotate(sign);
      const [width, height] = this.photoCanvas.getRotatedCanvasSize();
      this.$set(this.photoCanvasSize, 0, width);
      this.$set(this.photoCanvasSize, 1, height);
      this.resizeStickerCanvas();
      this.clearCrop();
    },
    reset() {
      if (this.photoCanvas) {
        this.photoCanvas.changePhoto(this.initImageSrc);

        if (this.photoCanvas) {
          this.clearCrop();
        }

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
      this.photoCanvas.finishCrop();
      this.setPhotoCanvasSize();
    },
    async exportResultPhoto() {
      // case 1. only Edit
      if (!this.stickerCanvas && this.photoCanvas) {
        return this.photoCanvas.exportResultPhoto();
      }

      // case 2. only Sticker
      if (!this.photoCanvas && this.stickerCanvas) {
        const width = this.photoCanvas.getNaturalSize()[0];
        return await this.photoCanvas.exportResultPhoto(
          this.stickerCanvas.saveStickerImage(width)
        );
      }

      // case 3. Edit & Sticker
      if (this.photoCanvas && this.stickerCanvas) {
        const width = this.photoCanvas.getNaturalSize()[0];
        return await this.photoCanvas.exportResultPhoto(
          this.stickerCanvas.saveStickerImage(width)
        );
      }
    },
    // Tool navigation (set mode)
    openPhotoEditor() {
      if (!this.uploadedPhotoSrc) {
        alert(this.errorMessage);
        throw new Error('Please pick photo.');
      }

      this.hide = true;
      this.layout = 'tool-bar';

      this.setPhotoCanvasSize();
    },
    openStickerEditor() {
      if (!this.uploadedPhotoSrc) {
        alert(this.errorMessage);
        throw new Error('Please pick photo.');
      }

      this.$parent.$data.isCropMode = false;
      this.hide = false;
      this.layout = 'sticker-tool-bar';

      this.crop();
      this.photoCanvas.setDragMode('none');

      if (!this.stickerCanvas) {
        this.setPhotoCanvasSize();
        const [width, height] = this.photoCanvasSize;
        this.stickerCanvas = new StickerEditor('sticker-canvas', width, height);
      }

      if (this.photoCanvas) {
        if (this.zoomCount > 0) {
          this.photoCanvas.zoom(-1 * this.zoomCount);
        }
        if (this.zoomCount < 0) {
          this.photoCanvas.zoom(Math.abs(this.zoomCount));
        }
        this.zoomCount = 0;
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
  bottom: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.1);
  z-index: 2;
}
</style>