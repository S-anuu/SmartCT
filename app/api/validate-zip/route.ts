// app/api/validate-zip/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Use dynamic import to avoid module resolution issues
    const JSZip = (await import('jszip')).default;
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No valid file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const zipData = await zip.loadAsync(arrayBuffer);
    
    const contents: string[] = [];
    zipData.forEach((relativePath, file) => {
      if (!file.dir) contents.push(relativePath);
    });

    return NextResponse.json({ contents });
  } catch (error) {
    console.error('Zip processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process zip file" },
      { status: 500 }
    );
  }
}