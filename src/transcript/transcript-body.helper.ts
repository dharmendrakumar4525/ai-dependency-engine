/**
 * Extract transcript from request: file upload (multipart), raw body, or JSON.
 * File upload is the most reliable for long text (no escaping, no size/control-char issues).
 */
const MAX_TRANSCRIPT_LENGTH = 10_000_000;

export function getTranscriptFromRequest(req: {
  body?: unknown;
  file?: Express.Multer.File;
}): string | null {
  if (req.file?.buffer) {
    const text = req.file.buffer.toString('utf8').trim();
    return text.length > 0 ? text : null;
  }
  return getTranscriptFromBody(req.body);
}

export function getTranscriptFromBody(body: unknown): string | null {
  if (typeof body === 'string') {
    return body.trim().length > 0 ? body : null;
  }
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const o = body as Record<string, unknown>;
    if (typeof o.transcript === 'string' && o.transcript.trim().length > 0) {
      return o.transcript;
    }
    if (typeof o.transcriptBase64 === 'string') {
      try {
        const decoded = Buffer.from(o.transcriptBase64, 'base64').toString(
          'utf8',
        );
        return decoded.trim().length > 0 ? decoded : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function validateTranscriptLength(transcript: string): void {
  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    throw new Error(
      `Transcript exceeds max length (${MAX_TRANSCRIPT_LENGTH} characters).`,
    );
  }
}
