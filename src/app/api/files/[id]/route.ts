import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getFile } from '@/lib/services/gridfs';

// Types that are safe to render inline. Anything else (HTML, SVG, ...) is forced to download,
// otherwise an uploaded file opened in a new tab could run scripts on our origin.
const INLINE_SAFE = /^(image\/(png|jpe?g|gif|webp|bmp|avif)|audio\/.+|video\/.+)$/i;

function contentDisposition(type: 'inline' | 'attachment', filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null | 'invalid' {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return 'invalid';
  let start: number;
  let end: number;
  if (match[1] === '') {
    // suffix range: last N bytes
    const suffix = parseInt(match[2], 10);
    if (!suffix) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = parseInt(match[1], 10);
    end = match[2] === '' ? size - 1 : Math.min(parseInt(match[2], 10), size - 1);
  }
  if (start > end || start >= size) return 'invalid';
  return { start, end };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await getFile(id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const forceDownload = request.nextUrl.searchParams.has('download');
    const disposition = !forceDownload && INLINE_SAFE.test(file.contentType) ? 'inline' : 'attachment';

    const headers: Record<string, string> = {
      'Content-Type': file.contentType,
      'Content-Disposition': contentDisposition(disposition, file.originalname),
      'Accept-Ranges': 'bytes',
      // File ids are never reused, so the content is immutable.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'; media-src 'self'",
    };

    // Range support is required for seeking in <video>/<audio> (Safari won't even play without it).
    const range = parseRange(request.headers.get('range'), file.length);
    if (range === 'invalid') {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${file.length}` } });
    }

    if (range) {
      const stream = file.openStream(range);
      return new NextResponse(Readable.toWeb(stream as Readable) as ReadableStream, {
        status: 206,
        headers: {
          ...headers,
          'Content-Range': `bytes ${range.start}-${range.end}/${file.length}`,
          'Content-Length': String(range.end - range.start + 1),
        },
      });
    }

    // Stream instead of buffering the whole file in memory.
    const stream = file.openStream();
    return new NextResponse(Readable.toWeb(stream as Readable) as ReadableStream, {
      headers: { ...headers, 'Content-Length': String(file.length) },
    });
  } catch (error: any) {
    if (error?.message === 'Invalid file id') {
      return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
    }
    console.error('File download error:', error);
    return NextResponse.json({ error: 'Error downloading file' }, { status: 500 });
  }
}
