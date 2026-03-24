// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { getSavedAdsListLocation, saveAdsListLocation } from './adsListLocation.ts';

describe('ads list location helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves list location with query string', () => {
    saveAdsListLocation('/ads', '?page=2&view=list');

    expect(getSavedAdsListLocation()).toBe('/ads?page=2&view=list');
  });

  it('falls back to default location for invalid saved value', () => {
    window.localStorage.setItem('ads-list-location', '/ads/123');

    expect(getSavedAdsListLocation()).toBe('/ads');
  });
});
