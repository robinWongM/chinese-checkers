import { Button, Control } from '@babylonjs/gui';

export interface UIButtonOptions {
  width?: number;
  height?: number;
  backgroundColor?: number;
  hoverColor?: number;
  activeColor?: number;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  toggle?: boolean;
  cornerRadius?: number;
}

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 52;
const DEFAULT_FONT_FAMILY = 'sans-serif';
const DEFAULT_FONT_SIZE = 20;
const DEFAULT_BASE_COLOR = 0x2563eb;
const DEFAULT_HOVER_COLOR = 0x3b82f6;
const DEFAULT_ACTIVE_COLOR = 0x1d4ed8;

const toHex = (value: number): string =>
  `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`;

let buttonId = 0;

export class UIButton {
  public readonly control: Button;
  private readonly useToggle: boolean;
  private baseColor: string;
  private hoverColor: string;
  private activeColor: string;
  private buttonWidth: number;
  private buttonHeight: number;
  private enabled = true;
  private toggleState = false;
  private clickHandler: (() => void) | null = null;

  constructor(
    text: string,
    options: UIButtonOptions = {},
    onClick?: () => void
  ) {
    this.buttonWidth = options.width ?? DEFAULT_WIDTH;
    this.buttonHeight = options.height ?? DEFAULT_HEIGHT;
    this.baseColor = toHex(options.backgroundColor ?? DEFAULT_BASE_COLOR);
    this.hoverColor = toHex(options.hoverColor ?? DEFAULT_HOVER_COLOR);
    this.activeColor = toHex(options.activeColor ?? DEFAULT_ACTIVE_COLOR);
    this.useToggle = options.toggle ?? false;

    const id = `ui-button-${buttonId++}`;
    this.control = Button.CreateSimpleButton(id, text);
    this.control.width = `${this.buttonWidth}px`;
    this.control.height = `${this.buttonHeight}px`;
    this.control.color = options.textColor ?? '#ffffff';
    this.control.fontSize = `${options.fontSize ?? DEFAULT_FONT_SIZE}px`;
    this.control.fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY;
    this.control.background = this.baseColor;
    this.control.thickness = 0;
    this.control.cornerRadius = options.cornerRadius ?? 12;
    this.control.paddingTop = '0px';
    this.control.paddingBottom = '0px';
    this.control.paddingLeft = '0px';
    this.control.paddingRight = '0px';
    this.control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.control.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    this.setOnClick(onClick ?? null);

    this.control.onPointerEnterObservable.add(() => {
      if (!this.enabled) {
        return;
      }
      if (this.useToggle && this.toggleState) {
        return;
      }
      this.control.background = this.hoverColor;
    });

    this.control.onPointerOutObservable.add(() => {
      if (!this.enabled) {
        return;
      }
      this.refreshBackground();
    });

    this.control.onPointerClickObservable.add(() => {
      if (!this.enabled) {
        return;
      }
      if (this.useToggle) {
        this.setChecked(true);
      }
      this.clickHandler?.();
    });
  }

  public setOnClick(handler: (() => void) | null): void {
    this.clickHandler = handler;
  }

  public setText(text: string): void {
    this.control.textBlock!.text = text;
  }

  public setTextColor(color: string): void {
    this.control.color = color;
  }

  public setColors(options: {
    backgroundColor?: number;
    hoverColor?: number;
    activeColor?: number;
  }): void {
    if (typeof options.backgroundColor === 'number') {
      this.baseColor = toHex(options.backgroundColor);
    }
    if (typeof options.hoverColor === 'number') {
      this.hoverColor = toHex(options.hoverColor);
    }
    if (typeof options.activeColor === 'number') {
      this.activeColor = toHex(options.activeColor);
    }
    this.refreshBackground();
  }

  public setChecked(flag: boolean): void {
    if (!this.useToggle) {
      return;
    }
    this.toggleState = flag;
    this.refreshBackground();
  }

  public isChecked(): boolean {
    return this.toggleState;
  }

  public setEnabled(flag: boolean): void {
    this.enabled = flag;
    this.control.isEnabled = flag;
    this.control.alpha = flag ? 1 : 0.5;
  }

  public setCenterPosition(x: number, y: number): void {
    this.control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.control.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.control.left = `${x - this.buttonWidth / 2}px`;
    this.control.top = `${y - this.buttonHeight / 2}px`;
  }

  public getWidth(): number {
    return this.buttonWidth;
  }

  public getHeight(): number {
    return this.buttonHeight;
  }

  public dispose(): void {
    this.control.dispose();
  }

  private refreshBackground(): void {
    if (this.useToggle && this.toggleState) {
      this.control.background = this.activeColor;
    } else {
      this.control.background = this.baseColor;
    }
  }
}
