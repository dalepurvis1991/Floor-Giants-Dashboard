
export function isSample(sku: string = '', productName: string = ''): boolean {
    const skuLower = sku.toLowerCase();
    const nameLower = productName.toLowerCase();
    return skuLower.startsWith('[sample') || nameLower.startsWith('[sample');
}

const CATEGORY_MAP: Record<string, string> = {
    spc: 'SPC',
    lvt: 'LVT / LVC',
    lvc: 'LVT / LVC',
    laminate: 'Laminate',
    carpet: 'Carpet',
    engineered: 'Engineered Wood',
    solid: 'Solid Wood',
    accessories: 'Accessories',
};

const SKU_PREFIX_MAP: Record<string, string> = {
    'EW': 'Engineered Wood',
    'LAM': 'Laminate',
    'SV': 'Sheet Vinyl',
    'UL': 'Underlay',
    'FGFS': 'Fitting',
    'EM': 'Entrance Matting',
    'RSSV': 'Roll Stock Vinyl',
    'AWP': 'Acoustic Wall Panel'
};

export function mapToCategory(categoryName: string, sku: string = '', productName: string = ''): string {
    const skuUpper = sku.toUpperCase();
    const nameLower = productName.toLowerCase();
    const catLower = categoryName.toLowerCase();

    // 0. Check for Samples
    if (isSample(sku, productName)) {
        return 'Samples';
    }

    // 1. Check for Discontinued
    if (skuUpper.includes('DISCONTINUED') ||
        nameLower.includes('discontinued') ||
        catLower.includes('discontinued')) {
        return 'Discontinued';
    }

    // 2. Check SKU Prefix matches
    for (const [prefix, category] of Object.entries(SKU_PREFIX_MAP)) {
        if (skuUpper.startsWith(prefix)) {
            return category;
        }
    }

    // 3. Fallback to existing logic on Odoo Category Name
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (catLower.includes(key)) return value;
    }

    return 'Other';
}
