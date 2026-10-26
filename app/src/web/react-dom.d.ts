// The one react-dom call the web sides use (components/WebSides.web.tsx); the package
// ships without its own types here.
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';
  export function createPortal(children: ReactNode, container: Element): ReactPortal;
}
