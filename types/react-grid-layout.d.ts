declare module 'react-grid-layout' {
  import React from 'react';

  interface Layout {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    [key: string]: any;
  }

  interface GridLayoutProps {
    layout: Layout[];
    cols?: number;
    rowHeight?: number;
    width?: number;
    isDraggable?: boolean;
    isResizable?: boolean;
    isBounded?: boolean;
    preventCollision?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    onLayoutChange?: (layout: Layout[]) => void;
    [key: string]: any;
  }

  export function WidthProvider<T extends React.ComponentType<any>>(component: T): T;

  export default class GridLayout extends React.Component<GridLayoutProps> {}
}

declare module 'react-resizable' {
  import React from 'react';

  export class ResizeHandle extends React.Component<any> {}
  export class Resizable extends React.Component<any> {}
}
