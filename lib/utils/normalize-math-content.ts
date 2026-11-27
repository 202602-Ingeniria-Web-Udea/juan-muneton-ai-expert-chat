
function isStandaloneMath(expression: string): boolean {
  const content = expression.trim();

  if (!content) {
    return false;
  }

  // Detectar instrucciones Markdown que no deben convertirse en fórmulas.
  const containsMarkdown =
    /(^|\n)\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s)|\*\*|__|`/.test(content);

  if (containsMarkdown) {
    return false;
  }

  // Ignorar el texto que está correctamente contenido dentro de \text{}.
  const textWithoutLatexLabels = content.replace(/\\text\{[^}]*\}/g, "");

  // Detectar expresiones matemáticas reconocibles.
  const containsMath =
    /\\(?:frac|times|cdot|div|sqrt|sum|prod|mathrm|mathbf|begin|end)\b|[=×÷]/.test(
      textWithoutLatexLabels,
    );

  if (!containsMath) {
    return false;
  }

  // Evitar convertir explicaciones escritas en lenguaje natural.
  const containsProse =
    /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(
      textWithoutLatexLabels.replace(/\\[a-zA-Z]+/g, ""),
    );

  return !containsProse;
}

export function normalizeMathContent(content: string): string {
  return (
    content
      // Procesar bloques math/latex sin convertir explicaciones en fórmulas.
      .replace(
        /```(?:math|latex)\s*\n?([\s\S]*?)```/gi,
        (_match, expression: string) => {
          const trimmed = expression.trim();

          if (isStandaloneMath(trimmed)) {
            return `$$\n${trimmed}\n$$`;
          }

          // Si contiene texto explicativo, conservarlo como Markdown normal.
          return trimmed;
        },
      )
      // Convertir delimitadores LaTeX de bloque.
      .replace(
        /\\\[([\s\S]*?)\\\]/g,
        (_match, expression: string) => `$$\n${expression.trim()}\n$$`,
      )
      // Convertir delimitadores LaTeX en línea.
      .replace(
        /\\\(([\s\S]*?)\\\)/g,
        (_match, expression: string) => `$${expression.trim()}$`,
      )
  );
}
