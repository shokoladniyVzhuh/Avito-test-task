const ADS_LIST_LOCATION_STORAGE_KEY = 'ads-list-location';
const defaultAdsListLocation = '/ads';

function isValidAdsListLocation(value: string) {
  return value === defaultAdsListLocation || value.startsWith(`${defaultAdsListLocation}?`);
}

export function saveAdsListLocation(pathname: string, search: string) {
  if (typeof window === 'undefined' || pathname !== defaultAdsListLocation) {
    return;
  }

  const nextLocation = search ? `${pathname}${search}` : pathname;
  window.localStorage.setItem(ADS_LIST_LOCATION_STORAGE_KEY, nextLocation);
}

export function getSavedAdsListLocation() {
  if (typeof window === 'undefined') {
    return defaultAdsListLocation;
  }

  const savedLocation = window.localStorage.getItem(ADS_LIST_LOCATION_STORAGE_KEY);

  if (!savedLocation || !isValidAdsListLocation(savedLocation)) {
    return defaultAdsListLocation;
  }

  return savedLocation;
}
