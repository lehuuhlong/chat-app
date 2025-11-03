import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/services/gridfs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const fileData = await downloadFile(id);

    if (!fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { stream, filename, contentType } = fileData;

    // Convert stream to buffer for Next.js response
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return file with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    console.error('File download error:', error);

    if (error.message === 'Invalid file id') {
      return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Error downloading file' }, { status: 500 });
  }
}
