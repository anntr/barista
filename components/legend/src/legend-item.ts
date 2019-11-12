import { FocusMonitor } from '@angular/cdk/a11y';
import { Platform } from '@angular/cdk/platform';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';

import {
  DtOverlay,
  DtOverlayTrigger,
} from '@dynatrace/angular-components/overlay';

/** Symbol (e.g. some kind of icon) that should be placed before the text of a legend item. */
@Directive({
  selector: 'dt-legend-symbol, [dtLegendSymbol]',
  exportAs: 'dtLegendSymbol',
  host: {
    class: 'dt-legend-symbol',
  },
})
export class DtLegendSymbol {}

/** Template that should be rendered in an overlay on the legend item when hovered. */
@Directive({
  selector: 'ng-template[dtLegendOverlay]',
  exportAs: 'dtLegendOverlay',
})
export class DtLegendOverlay {}

/** One item of a legend. Contains a symbol, a text and optional an overlay.  */
@Component({
  selector: 'dt-legend-item',
  templateUrl: 'legend-item.html',
  styleUrls: ['legend-item.scss'],
  host: {
    class: 'dt-legend-item',
    '(mouseenter)': 'hasOverlay && _handleMouseEnter($event)',
    '(mouseleave)': 'hasOverlay && _handleMouseLeave($event)',
  },
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
})
export class DtLegendItem extends DtOverlayTrigger<{}>
  implements AfterContentInit, OnDestroy {
  /** @internal The template ref that will be rendered as an overlay. */
  @Input()
  @ContentChild(DtLegendOverlay, { read: TemplateRef, static: true })
  _overlayTemplateRef?: TemplateRef<{}>;

  /** Whether the item has an overlay to show when hovering. */
  get hasOverlay(): boolean {
    return !!this._overlayTemplateRef;
  }

  constructor(
    overlay: DtOverlay,
    elementRef: ElementRef,
    zone: NgZone,
    focusMonitor: FocusMonitor,
    platform: Platform,
  ) {
    super(elementRef, overlay, zone, focusMonitor, '0', platform);
  }

  ngAfterContentInit(): void {
    if (this._overlayTemplateRef) {
      this.overlay = this._overlayTemplateRef;
    }
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }
}