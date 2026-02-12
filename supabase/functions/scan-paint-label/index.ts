// Edge Function: scan-paint-label
// Scans paint label using Google Cloud Vision OCR and extracts paint data
// Used by both Flutter app and web page

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  image_base64: string; // Base64 encoded image
}

interface ScanResponse {
  success: boolean;
  manufacturer?: string;
  product_code?: string;
  ral_code?: string;
  color_name?: string;
  weight_kg?: number;
  production_date?: string;
  paint_type?: string;
  surface?: string;
  gloss?: string;
  full_text?: string;
  error?: string;
}

// Helper function to create JWT for service account authentication
async function createServiceAccountJWT(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://vision.googleapis.com/',
    iat: now,
    exp: now + 3600, // 1 hour
  };

  // Import private key
  const privateKey = credentials.private_key;
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Create JWT
  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    payload,
    cryptoKey
  );

  return jwt;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_base64 }: ScanRequest = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'image_base64 required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Google Cloud Vision API
    const credentials = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
    if (!credentials) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
    }

    const credentialsJson = JSON.parse(credentials);
    const projectId = credentialsJson.project_id;

    // Create JWT for service account authentication
    const jwt = await createServiceAccountJWT(credentialsJson);

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          requests: [{
            image: { content: image_base64 },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      throw new Error(`Vision API error: ${errorText}`);
    }

    const visionData = await visionResponse.json();
    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';

    console.log('📝 OCR Text:', fullText);

    // Extract paint data from OCR text
    const extractedData = extractPaintData(fullText);

    return new Response(
      JSON.stringify({
        success: true,
        ...extractedData,
        full_text: fullText,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Scan error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ============================================================================
// EXTRACTION LOGIC (ported from Flutter app)
// ============================================================================

function extractPaintData(fullText: string): Partial<ScanResponse> {
  const manufacturer = extractManufacturer(fullText);
  const productCode = extractProductCode(fullText);
  const weight = extractWeight(fullText);
  const surface = extractSurface(fullText);
  const gloss = extractGloss(fullText);
  const paintType = extractPaintType(fullText);
  
  // BULLCREM labels have "GLOSS" as section header without actual value - ignore it
  const shouldIgnoreGloss = manufacturer?.toUpperCase() === 'BULLCREM' && 
                            gloss && 
                            !/\d/.test(gloss); // Ignore if no number in gloss
  let finalGloss = shouldIgnoreGloss ? undefined : gloss;
  
  // EkoColor: If gloss is "Matt 20-30", simplify to just "Matt"
  if (manufacturer === 'EkoColor' && finalGloss) {
    const mattMatch = finalGloss.match(/Matt?\s+(\d+)/i);
    if (mattMatch) {
      const value = parseInt(mattMatch[1]);
      if (value >= 20 && value <= 30) {
        finalGloss = 'Matt';
      }
    }
  }
  
  // Tiger: Extract from "Gloss Range 3 - 18" format
  if (manufacturer === 'Tiger') {
    const glossRangeMatch = fullText.match(/Gloss\s+Range\s+(\d+)\s*[-–]\s*(\d+)/i);
    if (glossRangeMatch) {
      const minValue = parseInt(glossRangeMatch[1]);
      const maxValue = parseInt(glossRangeMatch[2]);
      const avgValue = (minValue + maxValue) / 2;
      
      let glossType: string;
      if (avgValue <= 25) {
        glossType = 'Matt';
      } else if (avgValue <= 60) {
        glossType = 'Semi-Gloss';
      } else {
        glossType = 'Glossy';
      }
      
      finalGloss = `${glossType} ${minValue}-${maxValue}`;
    }
  }
  
  // Ripol: Don't extract gloss, surface, or paint_type - they can be determined from product code
  if (manufacturer === 'Ripol') {
    finalGloss = undefined;
  }
  const finalSurface = manufacturer === 'Ripol' ? undefined : surface;
  const finalPaintType = manufacturer === 'Ripol' ? undefined : paintType;
  
  // ST: Only extract manufacturer and product code, nothing else
  if (manufacturer === 'ST') {
    finalGloss = undefined;
    console.log('📦 Returning ST data:', { manufacturer, product_code: productCode });
    return {
      manufacturer,
      product_code: productCode,
      // Don't extract: ral_code, weight, surface, gloss, paint_type
    };
  }
  
  // BULLCREM: Only extract manufacturer and product code, nothing else
  if (manufacturer === 'BULLCREM') {
    return {
      manufacturer,
      product_code: productCode,
      // Don't extract: ral_code, weight, surface, gloss, paint_type
    };
  }
  
  // For Tiger, extract color name first (e.g., "Mica 3606"), then RAL as fallback
  let colorCode: string | undefined;
  if (manufacturer === 'Tiger') {
    colorCode = extractTigerColorName(fullText);
  }
  // Fallback to RAL code if no Tiger-specific color found
  colorCode = colorCode || extractRALCode(fullText);

  console.log('🔍 Extracted data:');
  console.log('   Manufacturer:', manufacturer);
  console.log('   Product Code:', productCode);
  console.log('   RAL Code:', colorCode);
  console.log('   Weight:', weight);
  console.log('   Surface:', surface);
  console.log('   Gloss:', finalGloss);
  console.log('   Paint Type:', paintType);

  return {
    manufacturer,
    product_code: productCode,
    ral_code: colorCode,
    weight_kg: weight,
    paint_type: finalPaintType,
    surface: finalSurface,
    gloss: finalGloss,
  };
}

function extractManufacturer(text: string): string | undefined {
  const manufacturers = [
    'EUROPOLVERI',
    'EuroPolveri',
    'Ripol',
    'Tiger',
    'EKO-COLOR',
    'EKO-CoLOR',
    'EKOCOLOR',
    'EkoColor',
    'Eko Color',
    'NEOKEM',
    'NeoKem',
    'NEOTEC',
    'NeoTec',
    'Axalta',
    'Jotun',
    'AkzoNobel',
    'PPG',
    'Sherwin-Williams',
    'Interpon',
    'Consus',
    'BULLCREM',
    'INVER',
    'HMG',
    'ST',
  ];

  const normalizedText = text.toUpperCase();

  for (const manufacturer of manufacturers) {
    if (normalizedText.includes(manufacturer.toUpperCase())) {
      // Return standardized name
      if (manufacturer.toUpperCase() === 'EUROPOLVERI') {
        return 'EuroPolveri';
      }
      // Normalize all EkoColor variants to "EkoColor"
      if (manufacturer.toUpperCase().includes('EKO') && manufacturer.toUpperCase().includes('COLOR')) {
        return 'EkoColor';
      }
      // Normalize all NEOKEM/NEOTEC variants to "NEOKEM"
      if (manufacturer.toUpperCase().includes('NEO')) {
        return 'NEOKEM';
      }
      return manufacturer;
    }
  }

  return undefined;
}

function extractProductCode(text: string): string | undefined {
  // Pre-normalize text: Fix common OCR errors before pattern matching
  let normalizedText = text;
  
  console.log('🔍 Searching for product code in text (first 200 chars):', text.substring(0, 200));
  
  // 1. Replace O after any digit: 114O -> 1140, 4O/ -> 40/
  normalizedText = normalizedText.replace(/(\d)O/g, '$10');
  
  // 2. Replace O between letter+digits and separator: PA114O/ -> PA1140/
  normalizedText = normalizedText.replace(/([A-Z]\d+)O([/\-])/g, '$10$2');
  
  // Pattern 0: Mixed alphanumeric codes (Sherwin-Williams)
  // Examples: NAS8E0021, NAS&EO021
  const pattern0 = /\b([A-Z]{3}[0-9A-Z&]{3,}[0-9]{3,})\b/;
  const match0 = normalizedText.match(pattern0);
  if (match0) {
    const code = match0[1];
    const letterCount = (code.match(/[A-Z]/g) || []).length;
    const digitCount = (code.match(/[0-9]/g) || []).length;
    if (letterCount >= 3 && digitCount >= 3) {
      let fixed = code.replace(/&/g, '8');
      fixed = fixed.replace(/([0-9])O|O([0-9])/g, (m, p1, p2) => p1 ? `${p1}0` : `0${p2}`);
      return fixed;
    }
  }
  
  // Pattern 0.5: EkoColor codes (PRIORITY - check before other patterns)
  // Prefixes: PA (Polyester), PF (Industrial PE), EE (Epoxy), EP (Hybrid PE)
  // Examples: PA114/0/0426/03C, PF114/0/3233/08, EE114/1/1234/01, EP114/2/5678/02FX
  const patternEkoColor = /\b((?:P[AF]|EE|EP)\d{2,3}\/\d\/\d{4}\/\d{2,3}[A-Z]*)\b/;
  const matchEkoColor = normalizedText.match(patternEkoColor);
  if (matchEkoColor) {
    return matchEkoColor[1];
  }

  // Pattern 1: Numbers + Letters + Numbers
  // Examples: 52LN1901120, 5L4660033T000, 1R3871163TO01
  const pattern1 = /\b([0-9]{1,2}[A-Z]{1,2}[0-9]{6,}[A-Z0-9]{0,4})\b/;
  const match1 = normalizedText.match(pattern1);
  if (match1) {
    return normalizeProductCode(match1[1]);
  }
  
  // Pattern 1.5: ST format only (P1-358-1234-001)
  // Must check AFTER pattern 1 but with specific validation
  // Format: [Letter][Digit/Letter]-[3-4 chars]-[4 chars]-[3 chars]
  // Note: All parts can contain letters for special paints, not just digits
  // Valid first letters: E,F,M,P,C,H,L,D,U,W,R,S
  // Valid second position: 0-9, E, P, Y, Z, O (OCR often mistakes 0 for O)
  console.log('🔍 Checking ST pattern...');
  const patternST = /\b([EFMPCHLDUWR][0-9EPYZO][-\s]?[A-Z0-9]{3,4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{3})\b/;
  const matchST = normalizedText.match(patternST);
  console.log('   ST pattern match:', matchST);
  if (matchST) {
    // Clean up spaces and normalize O to 0
    let cleaned = matchST[1].replace(/\s/g, '-').replace(/O/g, '0');
    console.log('   Cleaned ST code:', cleaned);
    // Validate that it's a real ST code, not a false positive
    const parts = cleaned.split('-');
    console.log('   ST parts:', parts);
    if (parts.length === 4 && 
        parts[0].length === 2 &&  // Position 1+2
        parts[1].length >= 3 && parts[1].length <= 4 &&  // Position 3-4 (alphanumeric)
        parts[2].length === 4 &&  // RAL code (4 chars, can be alphanumeric)
        parts[3].length === 3) {  // Series number (3 chars, can be alphanumeric)
      console.log('✅ ST code validated and found:', cleaned);
      return cleaned;
    } else {
      console.log('❌ ST code validation failed');
    }
  }
  
  // Pattern 1.6: BULLCREM format (QRG490050002)
  // Format: [Letter][2 Letters][Digit][4 digits][4 digits]
  // Position 1: Composition (Q,P,M,E,U,A)
  // Position 2-3: Surface (LI,PF,PZ,RG,B1-3,MZ,BZ,MI,BI,MM,BA,BB,BM)
  // Position 4: Gloss (1-5)
  // Position 5-8: RAL code
  // Position 9-12: Ignore
  const patternBullcrem = /\b([QPMEUA][A-Z]{2}[1-5]\d{8})\b/;
  const matchBullcrem = normalizedText.match(patternBullcrem);
  if (matchBullcrem) {
    return matchBullcrem[1];
  }

  // Pattern 2: Letters followed by many numbers
  // Examples: PLI7406370001, PD212438SMRT, PA11402292/08
  const pattern2 = /\b([A-Z]{2,}[0-9]{6,}[A-Z0-9]*(?:\/[0-9]{2})?)\b/;
  const match2 = normalizedText.match(pattern2);
  if (match2) {
    return normalizeProductCode(match2[1]);
  }

  // Pattern 3: Alphanumeric with dashes/slashes
  // Examples: PA114/0/1691/19, FP000018-PML, P2-159-7016-010, E20/7147/PR
  const pattern3 = /\b([A-Z]{1,}\s?[0-9]{1,}[/.\\-][A-Z0-9/.\-]{4,}[A-Z0-9])\b/;
  const match3 = normalizedText.match(pattern3);
  if (match3) {
    return normalizeProductCode(match3[1]);
  }
  
  // Pattern 3a: NEOKEM format with space: "NEOTEC PP 151/7016" or "PP 151/7016"
  const patternNeokem = /\b([A-Z]{2,}\s+[A-Z]{2}\s+\d+\/\d+)\b/;
  const matchNeokem = normalizedText.match(patternNeokem);
  if (matchNeokem) {
    const code = matchNeokem[1];
    const parts = code.split(' ');
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}${parts[parts.length - 1]}`.replace(/\s/g, '');
    }
  }
  
  // Pattern 3b: Numeric code with dashes: "21-151-7016"
  const patternNumericDash = /\b(\d{2}-\d{3}-\d{4})\b/;
  const matchNumericDash = normalizedText.match(patternNumericDash);
  if (matchNumericDash) {
    return matchNumericDash[1];
  }

  // Pattern 4: Code with dash/slash starting with letters
  // Example: 827-1S060C-4085 (only if has letters)
  const pattern4 = /\b([0-9]{2,4}-[0-9A-Z]+[A-Z]+[0-9A-Z-]+)\b/;
  const match4 = normalizedText.match(pattern4);
  if (match4) {
    const code = match4[1];
    // Must contain at least one letter to avoid phone numbers
    if (/[A-Z]/.test(code)) {
      return normalizeProductCode(code);
    }
  }

  // Pattern 5: Short codes with slash (only if has letters)
  // Example: 68/80348
  const pattern5 = /\b([0-9]{2}\/[0-9]{5,})\b/;
  const match5 = normalizedText.match(pattern5);
  if (match5) {
    return normalizeProductCode(match5[1]);
  }

  return undefined;
}

function normalizeProductCode(code: string): string {
  // Remove all spaces first (E 20/7147 -> E20/7147)
  let normalized = code.replace(/\s/g, '');
  
  // Replace O with 0 when between slashes or after slash
  normalized = normalized.replace(/\/O\/|\/O$/g, (m) => m.replace(/O/g, '0'));
  
  // Replace O with 0 when before separator (/ or -)
  normalized = normalized.replace(/(\d)O([/\-])/g, '$10$2');
  
  // Replace O with 0 when surrounded by digits
  normalized = normalized.replace(/(\d)O(\d)|(\d)O$|^O(\d)/g, (m) => m.replace(/O/g, '0'));
  
  // Special case: EkoColor PA codes like PA11402292/08 should be PA114/0/2292/08
  const paMatch = normalized.match(/^PA(\d{8,})(.*)/);
  if (paMatch) {
    const digits = paMatch[1];
    const suffix = paMatch[2] || '';
    if (digits.length >= 8) {
      const part1 = digits.substring(0, 3); // 114
      const part2 = digits.substring(3, 4); // 0
      const part3 = digits.substring(4, 8); // 2292
      const rest = digits.substring(8); // any extra digits
      normalized = `PA${part1}/${part2}/${part3}${rest}${suffix}`;
    }
  }
  
  // Similar pattern for PF codes: PF114/0/3233/08
  const pfMatch = normalized.match(/^PF(\d{8,})(.*)/);
  if (pfMatch) {
    const digits = pfMatch[1];
    const suffix = pfMatch[2] || '';
    if (digits.length >= 8) {
      const part1 = digits.substring(0, 3);
      const part2 = digits.substring(3, 4);
      const part3 = digits.substring(4, 8);
      const rest = digits.substring(8);
      normalized = `PF${part1}/${part2}/${part3}${rest}${suffix}`;
    }
  }
  
  return normalized;
}

function extractRALCode(text: string): string | undefined {
  // Pattern 1: RAL 9010 or RAL9010
  const ralMatch = text.match(/RAL\s*(\d{4})/i);
  if (ralMatch) {
    return `RAL${ralMatch[1]}`;
  }

  // Pattern 2: 4 digits BETWEEN separators (/-) - typical for product codes
  // Matches: E20/7147/PR, 21-114-7016, PP151/7016
  const codeWithSeparatorsMatch = text.match(/[-/](\d{4})[-/]/);
  if (codeWithSeparatorsMatch) {
    const code = codeWithSeparatorsMatch[1];
    // Common RAL codes start with 1-9, exclude years (20xx, 19xx) and batch numbers starting with 0
    if (code[0] !== '0' && !code.startsWith('19') && !code.startsWith('20')) {
      return `RAL${code}`;
    }
  }
  
  // Pattern 2b: 4 digits after separator and before letter
  // Matches: 21-151-7016/PR where /PR has letter after 7016
  const codeBeforeLetterMatches = text.matchAll(/[-/](\d{4})[a-zA-Z]/g);
  let lastValidCode: string | undefined;
  for (const match of codeBeforeLetterMatches) {
    const code = match[1];
    if (code[0] !== '0' && !code.startsWith('19') && !code.startsWith('20')) {
      lastValidCode = code;
    }
  }
  if (lastValidCode) {
    return `RAL${lastValidCode}`;
  }

  // Pattern 3: Just 4 digits with word boundaries
  const codeMatch = text.match(/\b(\d{4})\b/);
  if (codeMatch) {
    const code = codeMatch[1];
    // Common RAL codes start with 1-9
    if (code[0] !== '0' && !code.startsWith('19') && !code.startsWith('20')) {
      return `RAL${code}`;
    }
  }

  return undefined;
}

function extractTigerColorName(text: string): string | undefined {
  const tigerColorMatch = text.match(/(Mica|Copper|Bronze|Gold|Silver|Pearl|Metallic)\s+(\d{4})/i);
  if (tigerColorMatch) {
    const colorName = tigerColorMatch[1];
    const colorNumber = tigerColorMatch[2];
    const capitalizedName = colorName[0].toUpperCase() + colorName.substring(1).toLowerCase();
    return `${capitalizedName} ${colorNumber}`;
  }
  return undefined;
}

function extractWeight(text: string): number | undefined {
  // Pattern: number followed by kg (with optional space)
  const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (weightMatch) {
    return parseFloat(weightMatch[1].replace(',', '.'));
  }
  return undefined;
}

function extractSurface(text: string): string | undefined {
  // Check in priority order: fine before texture (to avoid matching "texture fine" as just "Textured")
  const surfaces = [
    { keywords: ['fine', 'sand', 'smėlis'], value: 'Smėlis' },
    { keywords: ['smooth', 'gladka', 'liso', 'lisse', 'liscio', 'glatt'], value: 'Smooth' },
    { keywords: ['texture', 'textured', 'strukturinis', 'shagreen', 'tribo', 'wrinkle', 'raukšlėtas', 'coarse', 'bugnato'], value: 'Apelsinas' },
    { keywords: ['metallic', 'metalik'], value: 'Metallic' },
  ];

  for (const surface of surfaces) {
    for (const keyword of surface.keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        return surface.value;
      }
    }
  }

  return undefined;
}

function extractGloss(text: string): string | undefined {
  // Pattern 1: Sherwin-Williams format: "Brilllance:80 -85" or "Brilliance: 80-85"
  const brillianceMatch = text.match(/brill[il]ance:?\s*(\d+)\s*[-]?\s*(\d+)?/i);
  if (brillianceMatch) {
    const value1Int = parseInt(brillianceMatch[1]);
    const value2 = brillianceMatch[2];
    
    // Determine gloss type based on numeric value
    let glossType: string;
    if (value1Int <= 25) {
      glossType = 'Matt';
    } else if (value1Int <= 60) {
      glossType = 'Semi-Gloss';
    } else {
      glossType = 'Glossy';
    }
    
    // If range given (80-85), include range; otherwise just value
    const glossValue = value2 ? `${brillianceMatch[1]}-${value2}` : brillianceMatch[1];
    return `${glossType} ${glossValue}`;
  }

  // Pattern 2: Standard format: "Glossy 85", "Matt 25", "Gloss 85 ± 10"
  // But NOT dates like "GLOSS\n28/11/2025" - must not have / or . after number
  const glossWithNumberMatch = text.match(/(glossy?|matt?|semi[- ]?gloss|satin)\s*[:\-]?\s*(\d{1,3})(?![/\.\d])/i);
  if (glossWithNumberMatch) {
    const type = glossWithNumberMatch[1];
    const value = glossWithNumberMatch[2];
    // Extra validation: gloss values should be 0-100 range, not dates
    const numValue = parseInt(value);
    if (numValue <= 100) {
      return `${capitalizeFirst(type)} ${value}`;
    }
  }

  // Fallback to just gloss type with clear context (e.g., "Appearance: Glossy Smooth")
  const glossWithContextMatch = text.match(/(appearance|finish|acabado|finitura|отделка)[:\s]*(glossy?|matt?|semi[- ]?gloss|satin)/i);
  if (glossWithContextMatch) {
    const glossType = glossWithContextMatch[2];
    return capitalizeFirst(glossType);
  }

  // Fallback to standalone gloss keywords (but will be filtered for specific manufacturers like BULLCREM)
  const glossTypes = [
    { keywords: ['matt', 'mat ', 'mat\n', 'matte\n', '\nmatte'], value: 'Matt' },
    { keywords: ['glossy', 'gloss', 'glanz', 'brillo', 'brillant', 'lucido'], value: 'Glossy' },
    { keywords: ['semi-gloss', 'satin'], value: 'Semi-Gloss' },
  ];

  for (const glossType of glossTypes) {
    for (const keyword of glossType.keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        return glossType.value;
      }
    }
  }

  return undefined;
}

// Helper to capitalize first letter
function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text[0].toUpperCase() + text.substring(1).toLowerCase();
}

function extractPaintType(text: string): string | undefined {
  const types = [
    { keywords: ['epoksi', 'epoxy', 'эпоксид'], value: 'Epoxy' },
    { keywords: ['poliester', 'polyester', 'полиэстер', 'poliest'], value: 'Polyester' },
    { keywords: ['poliuretan', 'polyurethane', 'полиуретан'], value: 'Polyurethane' },
    { keywords: ['hybrid', 'hibrid'], value: 'Hybrid' },
  ];

  for (const type of types) {
    for (const keyword of type.keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        return type.value;
      }
    }
  }

  return undefined;
}
