# CLAUDE.md — Salud Auto Front

## Componentización (obligatorio)

Antes de implementar cualquier UI o funcionalidad pedida:

1. **Buscar primero** en `src/app/` si ya existe un componente, pipe, directiva o servicio que cubra (total o parcialmente) lo solicitado.
2. **Si existe** → reutilizarlo. Extenderlo solo si hace falta (inputs/outputs, slots, variantes), sin duplicar markup ni lógica.
3. **Si no existe** → crear un componente nuevo, standalone, con una sola responsabilidad.
4. **No meter UI grande** en páginas/containers: extraer secciones, formularios, listas, modales, cards y bloques repetibles a componentes propios.
5. **Nombres y ubicación** coherentes con el proyecto (`src/app/shared/`, `src/app/features/<feature>/`, etc.).

### Checklist rápido

- [ ] ¿Ya hay un componente similar? → reutilizar / componer
- [ ] ¿La plantilla crece o se repite? → extraer a componente
- [ ] ¿Lógica reutilizable? → servicio, pipe o utilidad tipada (sin `any`)

### Evitar

- Copiar-pegar HTML/TS entre vistas
- Componentes “god” con muchas responsabilidades
- Crear uno nuevo cuando ya hay uno equivalente

## Angular / TypeScript (contexto del repo)

- Standalone components (no poner `standalone: true`; es el default en Angular 21+)
- `input()` / `output()`, signals, `ChangeDetectionStrategy.OnPush`
- Tipado estricto; preferir inferencia cuando el tipo es obvio
