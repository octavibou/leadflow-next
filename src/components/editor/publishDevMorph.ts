/**
 * Transición compartida al activar/desactivar modo dev en Publicar (shell + barra + contenido).
 * Colores/bordes/sombras interpolan; tipografía puede cambiar al final del easing sin animación CSS.
 */
export const publishDevMorphTransition =
  "transition-[background-color,background-image,border-color,color,box-shadow,opacity,filter] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:!transition-none motion-reduce:!duration-0";
