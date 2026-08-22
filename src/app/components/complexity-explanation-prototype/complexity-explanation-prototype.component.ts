import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, inject, isDevMode } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

type VariantKey = 'A' | 'B' | 'C';
type ComplexityBand = 'Low' | 'Moderate' | 'High' | 'Very high' | 'Unknown';

interface PrototypeVariant {
  key: VariantKey;
  name: string;
}

interface DimensionExample {
  name: string;
  band: Exclude<ComplexityBand, 'Unknown'>;
  evidence: string;
  detail: string;
}

interface OperationExample {
  method: string;
  path: string;
  band: ComplexityBand;
  rawBand: Exclude<ComplexityBand, 'Unknown'> | 'Unknown';
  confidence: 'Complete' | 'Qualified' | 'Incomplete';
  hotspot: string;
  dimensions: Array<Exclude<ComplexityBand, 'Unknown'>>;
}

/*
 * PROTOTYPE — throw away after the presentation decision is captured.
 * Three variants of operation complexity explanations, switchable via ?variant=,
 * mounted on the existing application route.
 */
@Component({
  selector: 'app-complexity-explanation-prototype',
  templateUrl: './complexity-explanation-prototype.component.html',
  styleUrl: './complexity-explanation-prototype.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ComplexityExplanationPrototypeComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private querySubscription?: Subscription;

  readonly variants: PrototypeVariant[] = [
    {key: 'A', name: 'Band first'},
    {key: 'B', name: 'Comparison matrix'},
    {key: 'C', name: 'Explain the burden'}
  ];

  readonly dimensions: DimensionExample[] = [
    {
      name: 'Interaction surface',
      band: 'High',
      evidence: '12 contract cases',
      detail: 'Three parameters, two request representations, three response cases and four response representations.'
    },
    {
      name: 'Data shape',
      band: 'Very high',
      evidence: '44 structural units',
      detail: 'Deeply nested request and response models include arrays, maps and 31 consumer-visible fields.'
    },
    {
      name: 'Conditionality',
      band: 'High',
      evidence: '11 rule units',
      detail: 'Two alternative payload branches and interacting requiredness rules must be understood together.'
    },
    {
      name: 'Indirection',
      band: 'Moderate',
      evidence: '5 navigation units',
      detail: 'The contract crosses four reusable schema targets through a three-hop reference chain.'
    },
    {
      name: 'Protocol obligations',
      band: 'Moderate',
      evidence: '4 protocol units',
      detail: 'OAuth scopes, an alternative server and a response link add coordination work.'
    }
  ];

  readonly operations: OperationExample[] = [
    {method: 'PUT', path: '/pet', band: 'High', rawBand: 'Very high', confidence: 'Complete', hotspot: 'Top 10%', dimensions: ['High', 'Very high', 'High', 'Moderate', 'Moderate']},
    {method: 'POST', path: '/pet/{petId}/uploadImage', band: 'High', rawBand: 'High', confidence: 'Qualified', hotspot: 'Top 10%', dimensions: ['High', 'Moderate', 'High', 'Low', 'Moderate']},
    {method: 'GET', path: '/pet/findByStatus', band: 'Moderate', rawBand: 'Moderate', confidence: 'Complete', hotspot: 'Upper half', dimensions: ['Moderate', 'Moderate', 'Low', 'Moderate', 'Low']},
    {method: 'GET', path: '/store/inventory', band: 'Low', rawBand: 'Low', confidence: 'Complete', hotspot: 'Lower half', dimensions: ['Low', 'Low', 'Low', 'Low', 'Low']},
    {method: 'POST', path: '/user/createWithList', band: 'Unknown', rawBand: 'Unknown', confidence: 'Incomplete', hotspot: 'Needs assessment', dimensions: ['Moderate', 'High', 'Low', 'Moderate', 'Low']}
  ];

  readonly distribution = [
    {band: 'Low' as const, count: 5, percent: 26},
    {band: 'Moderate' as const, count: 7, percent: 37},
    {band: 'High' as const, count: 5, percent: 26},
    {band: 'Very high' as const, count: 1, percent: 5},
    {band: 'Unknown' as const, count: 1, percent: 6}
  ];

  variant: VariantKey = 'A';
  visible = false;

  ngOnInit(): void {
    this.querySubscription = this.route.queryParamMap.subscribe(params => {
      const requestedVariant = params.get('variant')?.toUpperCase();
      this.visible = isDevMode() && this.isVariantKey(requestedVariant);
      if (this.visible) {
        this.variant = requestedVariant as VariantKey;
      }
    });
  }

  ngOnDestroy(): void {
    this.querySubscription?.unsubscribe();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.visible || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, [contenteditable="true"]')) {
      return;
    }

    event.preventDefault();
    this.cycle(event.key === 'ArrowRight' ? 1 : -1);
  }

  selectVariant(variant: VariantKey): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {variant},
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  cycle(direction: 1 | -1): void {
    const currentIndex = this.variants.findIndex(candidate => candidate.key === this.variant);
    const nextIndex = (currentIndex + direction + this.variants.length) % this.variants.length;
    this.selectVariant(this.variants[nextIndex].key);
  }

  bandClass(band: ComplexityBand): string {
    return `band--${band.toLowerCase().replace(' ', '-')}`;
  }

  currentVariantName(): string {
    return this.variants.find(candidate => candidate.key === this.variant)?.name ?? '';
  }

  private isVariantKey(value: string | undefined): value is VariantKey {
    return value === 'A' || value === 'B' || value === 'C';
  }
}
