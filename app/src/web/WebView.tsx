// Web stand-in for react-native-webview: an iframe on srcDoc (same origin).
// Page -> app: a bridge script injected into <head> defines window.ReactNativeWebView,
// whose postMessage goes to the parent as { __rnw, d } and comes out of onMessage.
// App -> page: injectJavaScript evals in the iframe's window.
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

// Only the props the app uses; the native-only ones (cacheMode, bounces, ...) are ignored.
type Props = {
  source?: { html?: string; uri?: string; baseUrl?: string };
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onMessage?: (e: { nativeEvent: { data: string } }) => void;
  onLoadEnd?: () => void;
};

export type WebViewHandle = { injectJavaScript: (js: string) => void };

const BRIDGE =
  '<script>window.ReactNativeWebView={postMessage:function(d){parent.postMessage({__rnw:1,d:d},"*")}}</script>';

function withBridge(html: string) {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (h) => h + BRIDGE);
  return BRIDGE + html;
}

export const WebView = forwardRef<WebViewHandle, Props>(function WebView({ source, style, containerStyle, onMessage, onLoadEnd }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useImperativeHandle(ref, () => ({
    injectJavaScript: (js: string) => {
      const w = frame.current?.contentWindow as (Window & { eval: (s: string) => unknown }) | null;
      try {
        w?.eval(js);
      } catch {}
    },
  }));

  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || e.data.__rnw !== 1) return;
      handler.current?.({ nativeEvent: { data: String(e.data.d) } });
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  const iframe = createElement('iframe', {
    ref: frame,
    srcDoc: source?.html !== undefined ? withBridge(source.html) : undefined,
    src: source?.html === undefined ? source?.uri : undefined,
    sandbox: 'allow-scripts allow-same-origin',
    allow: 'autoplay',
    onLoad: () => onLoadEnd?.(),
    style: { border: 0, width: '100%', height: '100%', display: 'block' },
  });
  return <View style={[styles.box, containerStyle, style]}>{iframe}</View>;
});

export default WebView;

const styles = StyleSheet.create({ box: { flex: 1, overflow: 'hidden' } });
