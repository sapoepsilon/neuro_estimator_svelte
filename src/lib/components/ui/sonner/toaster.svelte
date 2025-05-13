<script>
  import { Toaster as SonnerToaster } from 'sonner';
  
  export let position = 'bottom-right';
  export let richColors = true;
  export let expand = false;
  export let closeButton = true;
  export let theme = 'light';
</script>

<SonnerToaster
  {position}
  {richColors}
  {expand}
  {closeButton}
  {theme}
/>
