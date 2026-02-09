#!/usr/bin/env deno run --allow-net --allow-read --allow-env

/**
 * Test script for scan-paint-label Edge Function
 * Usage: deno run --allow-all test_scanner.ts <image_path>
 */

async function testScanFunction(imagePath: string) {
  try {
    // Read image and convert to base64
    const imageBytes = await Deno.readFile(imagePath);
    const base64Image = btoa(String.fromCharCode(...imageBytes));

    console.log(`📸 Testing with image: ${imagePath}`);
    console.log(`📦 Image size: ${(imageBytes.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing environment variables:');
      console.error('   Set SUPABASE_URL and SUPABASE_ANON_KEY');
      console.error('');
      console.error('   export SUPABASE_URL=https://your-project.supabase.co');
      console.error('   export SUPABASE_ANON_KEY=your-anon-key');
      Deno.exit(1);
    }

    // Call Edge Function
    console.log('🔄 Calling Edge Function...');
    const startTime = Date.now();

    const response = await fetch(
      `${supabaseUrl}/functions/v1/scan-paint-label`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ image_base64: base64Image }),
      }
    );

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log('');

    const data = await response.json();

    if (data.success) {
      console.log('✅ SUCCESS!');
      console.log('');
      console.log('📋 Extracted Data:');
      console.log('   Manufacturer:', data.manufacturer || '(not found)');
      console.log('   Product Code:', data.product_code || '(not found)');
      console.log('   RAL Code:', data.ral_code || '(not found)');
      console.log('   Weight:', data.weight_kg ? `${data.weight_kg} kg` : '(not found)');
      console.log('   Surface:', data.surface || '(not found)');
      console.log('   Gloss:', data.gloss || '(not found)');
      console.log('   Paint Type:', data.paint_type || '(not found)');
      console.log('');
      console.log('📝 Full OCR Text:');
      console.log('---');
      console.log(data.full_text);
      console.log('---');
    } else {
      console.log('❌ ERROR!');
      console.log('   Message:', data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}

// Main
if (Deno.args.length === 0) {
  console.log('Usage: deno run --allow-all test_scanner.ts <image_path>');
  console.log('');
  console.log('Example:');
  console.log('  deno run --allow-all test_scanner.ts test_images/paint_label.jpg');
  console.log('');
  console.log('Environment variables required:');
  console.log('  SUPABASE_URL - Your Supabase project URL');
  console.log('  SUPABASE_ANON_KEY - Your Supabase anon key');
  Deno.exit(1);
}

const imagePath = Deno.args[0];

try {
  await Deno.stat(imagePath);
} catch {
  console.error(`❌ Image file not found: ${imagePath}`);
  Deno.exit(1);
}

await testScanFunction(imagePath);
