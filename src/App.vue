/* eslint-disable prettier/prettier */
<template>
  <imoji-editor />
</template>

<script>
import ImojiEditor from '@/components/ImojiEditor.vue';

export default {
  components: {
    'imoji-editor': ImojiEditor ////
  } ///
};
</script>

<style>
body {
  background-color: black;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
    'Segoe UI Symbol';
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  margin: 0;
}
</style>
