declare module 'blessed' {
  export interface IScreenOptions {
    smartCSR?: boolean;
    title?: string;
    [key: string]: any;
  }

  export interface IBoxOptions {
    parent?: any;
    top?: number | string;
    left?: number | string;
    width?: number | string;
    height?: number | string;
    content?: string;
    label?: string;
    border?: {
      type?: string;
      fg?: string;
    };
    style?: {
      fg?: string;
      bg?: string;
      bold?: boolean;
      border?: {
        fg?: string;
      };
      selected?: {
        bg?: string;
      };
    };
    tags?: boolean;
    scrollable?: boolean;
    alwaysScroll?: boolean;
    mouse?: boolean;
    keys?: boolean;
    [key: string]: any;
  }

  export function screen(options?: IScreenOptions): any;
  export function box(options?: IBoxOptions): any;
  export function list(options?: IBoxOptions): any;
  export function log(options?: IBoxOptions): any;
  export function message(options?: IBoxOptions): any;
}