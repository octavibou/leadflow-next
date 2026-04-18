
El usuario quiere botones idénticos a la captura que envió (azul vibrante estilo Whop, con highlight interno, borde sutil, texto blanco semibold). Voy a revisar el estado actual del botón y el index.css para ver qué se aplicó realmente.

Tras los últimos cambios, el botón quedó en estilo shadcn neutro (negro/zinc, sin borde, sin highlight, `shadow-sm`). Eso explica por qué no se parece a la captura: ni el color (azul vibrante #4F6BFF aprox.), ni el estilo (falta el inset highlight + borde), ni la tipografía (la captura usa `font-medium`/`semibold` blanco sobre azul).

## Plan: replicar exactamente el botón de la captura

### 1. `src/index.css` — ajustar token primario
- `--primary: 230 75% 60%;` (azul vibrante tipo Whop, ~#4F6BFF)
- `--primary-foreground: 0 0% 100%;` (blanco puro)
- Mantener resto de tokens neutros intactos.

### 2. `src/components/ui/button.tsx` — variant `default`
Replicar el look de la captura:
- Fondo `bg-primary`
- Borde sutil `border border-primary/50`
- Highlight interno superior + sombra de profundidad: 
  `shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25),0_1px_2px_0_hsl(230_75%_30%/0.4)]`
- Texto blanco `font-medium` (ya está)
- Hover: `hover:bg-primary/90`
- Active: `active:translate-y-px`

Ningún otro variant cambia. Sin componentes nuevos, todo sigue siendo shadcn estándar con tokens.

### Resultado
Botones primarios en TODA la app pasan automáticamente al estilo azul Whop de la captura (color, borde, highlight, profundidad, tipografía blanca semibold), porque todos consumen el mismo `Button` + token `--primary`.
