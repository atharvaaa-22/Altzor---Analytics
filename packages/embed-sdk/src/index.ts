export interface EmbedTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  darkMode?: boolean;
}

export interface EmbedProps {
  embedToken: string;
  baseUrl: string;
  theme?: EmbedTheme;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function createEmbedIframe(
  containerId: string,
  props: EmbedProps & { type: 'dashboard' | 'chat'; resourceId: string },
): void {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container #${containerId} not found`);

  const params = new URLSearchParams({
    token: props.embedToken,
    ...(props.theme ? { theme: JSON.stringify(props.theme) } : {}),
  });

  const iframe = document.createElement('iframe');
  iframe.src = `${props.baseUrl}/embed/${props.type}/${props.resourceId}?${params}`;
  iframe.style.width = typeof props.width === 'number' ? `${props.width}px` : (props.width ?? '100%');
  iframe.style.height = typeof props.height === 'number' ? `${props.height}px` : (props.height ?? '600px');
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');

  iframe.onload = () => props.onReady?.();
  iframe.onerror = () => props.onError?.(new Error('Failed to load embed'));

  container.innerHTML = '';
  container.appendChild(iframe);
}
