// contractUtils.ts — Utilidades puras para el canvas de contratos

/**
 * Obtiene el texto plano completo de un elemento DOM editable
 */
export function getDocumentText(el: HTMLElement): string {
  return el.innerText || el.textContent || '';
}

/**
 * Obtiene el HTML limpio del documento (sin atributos internos de React)
 */
export function getDocumentHTML(el: HTMLElement): string {
  return el.innerHTML;
}

/**
 * Información sobre la selección actual del usuario
 */
export interface SelectionInfo {
  text: string;
  rangeRect: DOMRect | null;
  range: Range | null;
}

/**
 * Captura la selección actual del usuario dentro de un elemento contenedor
 */
export function captureSelection(container: HTMLElement): SelectionInfo {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
    return { text: '', rangeRect: null, range: null };
  }
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return { text: '', rangeRect: null, range: null };
  }
  return {
    text: sel.toString().trim(),
    rangeRect: range.getBoundingClientRect(),
    range: range.cloneRange(),
  };
}

/**
 * Aplica el nuevo texto sobre el rango dado (edición inline)
 */
export function applyTextToRange(range: Range, newText: string): void {
  range.deleteContents();
  const textNode = document.createTextNode(newText);
  range.insertNode(textNode);
  // Colapsar la selección al final
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    sel.addRange(newRange);
  }
}

/**
 * Limpia el HTML del documento para enviarlo a la IA 
 * (reduce tamaño eliminando atributos internos no esenciales)
 */
export function sanitizeHTMLForAI(html: string): string {
  return html
    .replace(/\s+/g, ' ')
    .replace(/<[^>]+>/g, (tag) => {
      // Conservar solo etiquetas de contenido básico
      const keepTags = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'br', 'span', 'div'];
      const tagName = tag.match(/^<\/?(\w+)/)?.[1]?.toLowerCase();
      if (tagName && keepTags.includes(tagName)) return tag;
      return '';
    })
    .trim()
    .substring(0, 8000); // limitar tamaño para el contexto del modelo
}

/**
 * Construye el system prompt para el asistente de contratos
 */
export function buildContractSystemPrompt(documentText: string, selectedText?: string): string {
  const docContext = documentText.substring(0, 6000);
  const selContext = selectedText ? `\n\nTEXTO ACTUALMENTE SELECCIONADO:\n"${selectedText}"` : '';

  return `Eres un asistente legal especializado en redacción y revisión de contratos, integrado dentro de WormGPT como "Asistente de Contratos".

DOCUMENTO ACTIVO:
${docContext}${selContext}

TUS CAPACIDADES:
- Editar, reescribir y mejorar cláusulas y secciones del contrato
- Cambiar el tono (formal, neutral, estricto, amigable)
- Corregir gramática y ortografía
- Agregar nuevas cláusulas, tablas, anexos o secciones
- Eliminar o reorganizar cláusulas existentes
- Cambiar fechas, montos, partes, plazos
- Traducir el documento o secciones a otro idioma
- Resumir secciones extensas
- Explicar términos legales en lenguaje simple

RESTRICCIONES ABSOLUTAS:
- NO ejecutas código
- NO accedes a sistemas externos ni a internet
- NO modificas nada fuera del documento abierto
- NO instalas paquetes ni abres URLs
- NO lees otros archivos del sistema

FORMATO DE RESPUESTA:
- Cuando el usuario pida una edición, responde primero con el texto modificado entre marcadores:
  [EDIT_START]
  <texto modificado aquí>
  [EDIT_END]
- Luego explica brevemente lo que cambiaste y por qué.
- Si la petición es una pregunta o explicación (no una edición), responde directamente en texto normal.
- Si no hay texto seleccionado pero se pide una edición, pregunta qué sección quiere modificar.

Habla siempre en español, de forma profesional y clara.`;
}

/**
 * Extrae el texto editado de la respuesta del modelo (entre marcadores)
 */
export function extractEditFromResponse(response: string): { editText: string | null; explanation: string } {
  const match = response.match(/\[EDIT_START\]([\s\S]*?)\[EDIT_END\]/);
  if (match) {
    const editText = match[1].trim();
    const explanation = response.replace(/\[EDIT_START\][\s\S]*?\[EDIT_END\]/, '').trim();
    return { editText, explanation };
  }
  return { editText: null, explanation: response };
}

/**
 * Clamp helper
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
